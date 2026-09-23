import { createHash } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import pg from 'pg'

const { Client } = pg

const dataSqlPath = process.argv[2]
const outputPath = process.argv[3]
const sourceUrl = process.env.DR_SOURCE_DB_URL

if (!dataSqlPath || !outputPath) {
  throw new Error('Usage: node scripts/dr/summarize-data-dump.mjs <data.sql> <dump-summary.json>')
}
if (!sourceUrl) {
  throw new Error('Set DR_SOURCE_DB_URL')
}

function parseRelation(raw) {
  const match = raw.match(/^(?:"([^"]+)"|([A-Za-z_][A-Za-z0-9_$]*))\.(?:"([^"]+)"|([A-Za-z_][A-Za-z0-9_$]*))$/)
  if (!match) {
    throw new Error(`Unable to parse COPY relation: ${raw}`)
  }
  return {
    schema: match[1] || match[2],
    table: match[3] || match[4],
  }
}

const sql = await readFile(dataSqlPath, 'utf8')
const lines = sql.split(/\r?\n/)
const tables = []
let current = null

for (const line of lines) {
  if (!current) {
    const match = line.match(/^COPY\s+(.+?)\s+\((.*)\)\s+FROM stdin;$/)
    if (!match) continue
    const relation = parseRelation(match[1])
    current = { ...relation, rows: 0 }
    continue
  }

  if (line === '\\.') {
    tables.push(current)
    current = null
    continue
  }

  current.rows += 1
}

if (current) {
  throw new Error('Unterminated COPY section in data.sql')
}

tables.sort((a, b) => {
  const left = `${a.schema}.${a.table}`
  const right = `${b.schema}.${b.table}`
  return left.localeCompare(right)
})

const client = new Client({
  connectionString: sourceUrl,
  ssl: { rejectUnauthorized: false },
})
await client.connect()

let schemaHash
try {
  const { rows } = await client.query(`
    SELECT table_schema, table_name, column_name, ordinal_position,
           data_type, udt_name, is_nullable
      FROM information_schema.columns
     WHERE table_schema IN ('public', 'auth')
       AND NOT (table_schema = 'public' AND table_name = '_prisma_migrations')
       AND NOT (table_schema = 'auth' AND table_name = 'schema_migrations')
     ORDER BY table_schema, table_name, ordinal_position
  `)

  const canonical = rows.map((row) => [
    row.table_schema,
    row.table_name,
    row.column_name,
    row.ordinal_position,
    row.data_type,
    row.udt_name,
    row.is_nullable,
  ].join(':')).join('\n')

  schemaHash = createHash('sha256').update(canonical).digest('hex')
} finally {
  await client.end()
}

const summary = {
  version: 2,
  schemaScope: ['public', 'auth'],
  storageTransport: 'supabase-storage-api-with-sha256-manifest',
  schemaHash,
  dataSqlSha256: createHash('sha256').update(sql).digest('hex'),
  tables,
  totalCopiedRows: tables.reduce((sum, table) => sum + table.rows, 0),
}

await writeFile(outputPath, JSON.stringify(summary, null, 2) + '\n')

console.log(JSON.stringify({
  result: 'PASS',
  tables: summary.tables.length,
  totalCopiedRows: summary.totalCopiedRows,
  schemaHash: summary.schemaHash,
}))
