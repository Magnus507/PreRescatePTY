import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import pg from 'pg'

const { Client } = pg

const targetUrl = process.env.DR_TARGET_DB_URL
const summaryPath = process.argv[2]

if (!targetUrl) {
  throw new Error('Set DR_TARGET_DB_URL')
}
if (!summaryPath) {
  throw new Error('Usage: node scripts/dr/verify-restore.mjs <database/dump-summary.json>')
}

function quoteIdent(value) {
  return '"' + String(value).replaceAll('"', '""') + '"'
}

const expected = JSON.parse(await readFile(summaryPath, 'utf8'))
if (expected.version !== 1 || !Array.isArray(expected.tables)) {
  throw new Error('Unsupported or invalid dump summary')
}

const target = new Client({
  connectionString: targetUrl,
  ssl: { rejectUnauthorized: false },
})
await target.connect()

try {
  const { rows: schemaRows } = await target.query(`
    SELECT table_schema, table_name, column_name, ordinal_position,
           data_type, udt_name, is_nullable
      FROM information_schema.columns
     WHERE table_schema IN ('public', 'auth', 'storage')
       AND NOT (table_schema = 'public' AND table_name = '_prisma_migrations')
       AND NOT (table_schema = 'auth' AND table_name = 'schema_migrations')
       AND NOT (table_schema = 'storage' AND table_name IN ('migrations', 'buckets_vectors', 'vector_indexes'))
     ORDER BY table_schema, table_name, ordinal_position
  `)

  const canonicalSchema = schemaRows.map((row) => [
    row.table_schema,
    row.table_name,
    row.column_name,
    row.ordinal_position,
    row.data_type,
    row.udt_name,
    row.is_nullable,
  ].join(':')).join('\n')

  const actualSchemaHash = createHash('sha256').update(canonicalSchema).digest('hex')
  if (actualSchemaHash !== expected.schemaHash) {
    throw new Error('Restored schema fingerprint differs from the backup source schema')
  }

  const countMismatches = []
  for (const table of expected.tables) {
    const qualified = `${quoteIdent(table.schema)}.${quoteIdent(table.table)}`
    const { rows } = await target.query(`SELECT count(*)::int AS count FROM ${qualified}`)
    const actualCount = rows[0].count
    if (actualCount !== table.rows) {
      countMismatches.push({
        table: `${table.schema}.${table.table}`,
        expected: table.rows,
        actual: actualCount,
      })
    }
  }

  if (countMismatches.length > 0) {
    throw new Error(
      `Restored row counts differ from the exact SQL dump: ${JSON.stringify(countMismatches.slice(0, 12))}`,
    )
  }

  const criticalTables = [
    'public.User',
    'public.Profile',
    'public.Order',
    'public.OrderItem',
    'public.Chip',
    'public.OperationCommercialOrder',
    'public.OperationDispatch',
    'public.SystemConfig',
    'auth.users',
    'storage.buckets',
    'storage.objects',
  ]
  const summarized = new Set(expected.tables.map((table) => `${table.schema}.${table.table}`))
  const missingCritical = criticalTables.filter((table) => !summarized.has(table))
  if (missingCritical.length > 0) {
    throw new Error(`Critical tables are missing from data.sql summary: ${missingCritical.join(', ')}`)
  }

  const { rows: relationRows } = await target.query(`
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
  `)

  const relations = relationRows[0]
  for (const [name, count] of Object.entries(relations)) {
    if (Number(count) !== 0) {
      throw new Error(`Critical relationship check failed: ${name}=${count}`)
    }
  }

  const sentinels = []
  const orderNumber = process.env.DR_SENTINEL_ORDER_NUMBER
  if (orderNumber) {
    const { rows } = await target.query(
      'SELECT count(*)::int AS count FROM public."Order" WHERE "orderNumber" = $1',
      [orderNumber],
    )
    if (rows[0].count < 1) {
      throw new Error('Restore sentinel order is missing from the recovered database')
    }
    sentinels.push({
      sentinel: 'DR_SENTINEL_ORDER_NUMBER',
      count: rows[0].count,
      result: 'PASS',
    })
  }

  console.log(JSON.stringify({
    result: 'PASS',
    schemaHash: actualSchemaHash,
    summarizedTables: expected.tables.length,
    totalCopiedRows: expected.totalCopiedRows,
    rowCountVerification: 'PASS',
    relations,
    sentinels,
  }))
} finally {
  await target.end()
}
