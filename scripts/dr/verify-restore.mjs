import { readFile } from 'node:fs/promises'
import pg from 'pg'
import { captureDbFingerprint } from './db-fingerprint-lib.mjs'

const { Client } = pg

const targetUrl = process.env.DR_TARGET_DB_URL
const expectedPath = process.argv[2]

if (!targetUrl) {
  throw new Error('Set DR_TARGET_DB_URL')
}
if (!expectedPath) {
  throw new Error('Usage: node scripts/dr/verify-restore.mjs <database/db-fingerprint.json>')
}

const expected = JSON.parse(await readFile(expectedPath, 'utf8'))
const actual = await captureDbFingerprint(targetUrl)

function indexTables(fingerprint) {
  return new Map(fingerprint.tables.map((entry) => [
    `${entry.schema}.${entry.table}`,
    entry,
  ]))
}

if (expected.version !== actual.version) {
  throw new Error(`Database fingerprint version mismatch: expected ${expected.version}, got ${actual.version}`)
}

if (expected.schemaHash !== actual.schemaHash) {
  throw new Error('Restored database schema fingerprint differs from the certified backup')
}

const expectedTables = indexTables(expected)
const actualTables = indexTables(actual)
const allKeys = [...new Set([...expectedTables.keys(), ...actualTables.keys()])].sort()
const mismatches = []

for (const key of allKeys) {
  const left = expectedTables.get(key)
  const right = actualTables.get(key)
  if (!left || !right || left.count !== right.count || left.dataHash !== right.dataHash) {
    mismatches.push({
      table: key,
      expectedCount: left?.count ?? null,
      actualCount: right?.count ?? null,
      hashMatch: Boolean(left && right && left.dataHash === right.dataHash),
    })
  }
}

if (mismatches.length > 0) {
  throw new Error(
    `Restored database data differs from backup fingerprint: ${JSON.stringify(mismatches.slice(0, 10))}`,
  )
}

const target = new Client({
  connectionString: targetUrl,
  ssl: { rejectUnauthorized: false },
})
await target.connect()

try {
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
    sentinels.push({ sentinel: 'DR_SENTINEL_ORDER_NUMBER', count: rows[0].count, result: 'PASS' })
  }

  console.log(JSON.stringify({
    result: 'PASS',
    matchedTables: allKeys.length,
    schemaHash: actual.schemaHash,
    relations,
    sentinels,
  }))
} finally {
  await target.end()
}
