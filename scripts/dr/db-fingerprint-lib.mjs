import pg from 'pg'

const { Client } = pg

const INCLUDED_SCHEMAS = ['public', 'auth', 'storage']
const EXCLUDED = new Set([
  'public._prisma_migrations',
  'auth.schema_migrations',
  'storage.migrations',
  'storage.buckets_vectors',
  'storage.vector_indexes',
])

function quoteIdent(value) {
  return '"' + String(value).replaceAll('"', '""') + '"'
}

export async function captureDbFingerprint(connectionString) {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  })
  await client.connect()

  try {
    const { rows: tableRows } = await client.query(
      `SELECT table_schema, table_name
         FROM information_schema.tables
        WHERE table_type = 'BASE TABLE'
          AND table_schema = ANY($1::text[])
        ORDER BY table_schema, table_name`,
      [INCLUDED_SCHEMAS],
    )

    const tables = []

    for (const row of tableRows) {
      const key = `${row.table_schema}.${row.table_name}`
      if (EXCLUDED.has(key)) continue

      const qualified = `${quoteIdent(row.table_schema)}.${quoteIdent(row.table_name)}`
      const { rows } = await client.query(
        `SELECT count(*)::text AS count,
                md5(COALESCE(string_agg(row_json, E'\\n' ORDER BY row_hash, row_json), '')) AS data_hash
           FROM (
             SELECT row_to_json(t)::text AS row_json,
                    md5(row_to_json(t)::text) AS row_hash
               FROM ${qualified} AS t
           ) AS fingerprint_rows`,
      )

      tables.push({
        schema: row.table_schema,
        table: row.table_name,
        count: rows[0].count,
        dataHash: rows[0].data_hash,
      })
    }

    const { rows: columnRows } = await client.query(
      `SELECT table_schema, table_name, column_name, ordinal_position,
              data_type, is_nullable
         FROM information_schema.columns
        WHERE table_schema = ANY($1::text[])
        ORDER BY table_schema, table_name, ordinal_position`,
      [INCLUDED_SCHEMAS],
    )

    const schemaRows = columnRows
      .filter((row) => !EXCLUDED.has(`${row.table_schema}.${row.table_name}`))
      .map((row) => [
        row.table_schema,
        row.table_name,
        row.column_name,
        String(row.ordinal_position),
        row.data_type,
        row.is_nullable,
      ].join(':'))

    return {
      version: 1,
      includedSchemas: INCLUDED_SCHEMAS,
      excludedTables: [...EXCLUDED].sort(),
      schemaHash: createStableHash(schemaRows),
      tables,
    }
  } finally {
    await client.end()
  }
}

function createStableHash(lines) {
  // PostgreSQL MD5 is used for row fingerprints; use Node crypto only for the
  // schema list so the output remains deterministic without exposing schema data.
  const payload = lines.join('\n')
  let hash = 0x811c9dc5
  for (let i = 0; i < payload.length; i += 1) {
    hash ^= payload.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193) >>> 0
  }
  return hash.toString(16).padStart(8, '0')
}
