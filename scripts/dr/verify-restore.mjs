import pg from 'pg'

const { Client } = pg

const sourceUrl = process.env.DR_SOURCE_DB_URL
const targetUrl = process.env.DR_TARGET_DB_URL

if (!sourceUrl || !targetUrl) {
  throw new Error('Set DR_SOURCE_DB_URL and DR_TARGET_DB_URL')
}

const ssl = { rejectUnauthorized: false }

async function connect(connectionString) {
  const client = new Client({ connectionString, ssl })
  await client.connect()
  return client
}

async function snapshot(client) {
  const countsQuery = `
    SELECT
      (SELECT count(*)::bigint FROM public."User") AS users,
      (SELECT count(*)::bigint FROM public."Profile") AS profiles,
      (SELECT count(*)::bigint FROM public."Order") AS orders,
      (SELECT count(*)::bigint FROM public."OrderItem") AS order_items,
      (SELECT count(*)::bigint FROM public."Chip") AS chips,
      (SELECT count(*)::bigint FROM public."OperationCommercialOrder") AS commercial_orders,
      (SELECT count(*)::bigint FROM public."OperationDispatch") AS dispatches,
      (SELECT count(*)::bigint FROM public."SystemConfig") AS system_config,
      (SELECT count(*)::bigint FROM auth.users) AS auth_users
  `

  const schemaQuery = `
    WITH t AS (
      SELECT table_name,
             md5(string_agg(column_name || ':' || data_type || ':' || is_nullable, ',' ORDER BY ordinal_position)) AS sig
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name <> '_prisma_migrations'
      GROUP BY table_name
    )
    SELECT count(*)::bigint AS tables,
           md5(string_agg(table_name || ':' || sig, ',' ORDER BY table_name)) AS schema_sig
    FROM t
  `

  const relationQuery = `
    SELECT
      (SELECT count(*)::bigint
       FROM public."Profile" p
       LEFT JOIN public."User" u ON u.id = p."userId"
       WHERE p."userId" IS NOT NULL AND u.id IS NULL) AS orphan_profile_user,
      (SELECT count(*)::bigint
       FROM public."Order" o
       LEFT JOIN public."User" u ON u.id = o."userId"
       WHERE o."userId" IS NOT NULL AND u.id IS NULL) AS orphan_order_user,
      (SELECT count(*)::bigint
       FROM public."OrderItem" oi
       LEFT JOIN public."Order" o ON o.id = oi."orderId"
       WHERE o.id IS NULL) AS orphan_order_item,
      (SELECT count(*)::bigint
       FROM public."Chip" c
       LEFT JOIN public."User" u ON u.id = c."ownerUserId"
       WHERE c."ownerUserId" IS NOT NULL AND u.id IS NULL) AS orphan_chip_owner,
      (SELECT count(*)::bigint
       FROM public."Chip" c
       LEFT JOIN public."Profile" p ON p.id = c."assignedProfileId"
       WHERE c."assignedProfileId" IS NOT NULL AND p.id IS NULL) AS orphan_chip_profile,
      (SELECT count(*)::bigint
       FROM public."OperationCommercialOrder" co
       LEFT JOIN public."OperationDispatch" d ON d.id = co."dispatchId"
       WHERE co."dispatchId" IS NOT NULL AND d.id IS NULL) AS orphan_commercial_dispatch
  `

  const [{ rows: countRows }, { rows: schemaRows }, { rows: relationRows }] = await Promise.all([
    client.query(countsQuery),
    client.query(schemaQuery),
    client.query(relationQuery),
  ])

  return {
    counts: countRows[0],
    schema: schemaRows[0],
    relations: relationRows[0],
  }
}

async function verifySentinels(source, target) {
  const checks = []

  const cases = [
    {
      env: 'DR_SENTINEL_ORDER_NUMBER',
      sql: 'SELECT count(*)::int AS count FROM public."Order" WHERE "orderNumber" = $1',
    },
    {
      env: 'DR_SENTINEL_CHIP_SERIAL',
      sql: 'SELECT count(*)::int AS count FROM public."Chip" WHERE "serialPublic" = $1',
    },
    {
      env: 'DR_SENTINEL_USER_EMAIL',
      sql: 'SELECT count(*)::int AS count FROM public."User" WHERE email = $1',
    },
  ]

  for (const check of cases) {
    const value = process.env[check.env]
    if (!value) continue

    const [{ rows: sourceRows }, { rows: targetRows }] = await Promise.all([
      source.query(check.sql, [value]),
      target.query(check.sql, [value]),
    ])

    const sourceCount = sourceRows[0].count
    const targetCount = targetRows[0].count
    if (sourceCount < 1 || targetCount !== sourceCount) {
      throw new Error(`Sentinel verification failed for ${check.env}`)
    }
    checks.push({ sentinel: check.env, count: targetCount, result: 'PASS' })
  }

  return checks
}

const source = await connect(sourceUrl)
const target = await connect(targetUrl)

try {
  const [sourceState, targetState] = await Promise.all([snapshot(source), snapshot(target)])

  if (JSON.stringify(sourceState.counts) !== JSON.stringify(targetState.counts)) {
    throw new Error('Critical table counts differ between source and restore target')
  }

  if (
    sourceState.schema.tables !== targetState.schema.tables
    || sourceState.schema.schema_sig !== targetState.schema.schema_sig
  ) {
    throw new Error('Application schema fingerprint differs between source and restore target')
  }

  for (const [name, count] of Object.entries(targetState.relations)) {
    if (Number(count) !== 0) {
      throw new Error(`Critical relationship check failed: ${name}=${count}`)
    }
  }

  const sentinels = await verifySentinels(source, target)

  console.log(JSON.stringify({
    result: 'PASS',
    counts: targetState.counts,
    schema: targetState.schema,
    relations: targetState.relations,
    sentinels,
  }))
} finally {
  await Promise.allSettled([source.end(), target.end()])
}
