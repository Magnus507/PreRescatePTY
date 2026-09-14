import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { captureDbFingerprint } from './db-fingerprint-lib.mjs'

const output = process.argv[2]
const connectionString = process.env.DR_SOURCE_DB_URL

if (!connectionString) {
  throw new Error('Set DR_SOURCE_DB_URL')
}
if (!output) {
  throw new Error('Usage: node scripts/dr/capture-db-fingerprint.mjs <output.json>')
}

const fingerprint = await captureDbFingerprint(connectionString)
const resolved = path.resolve(output)
await mkdir(path.dirname(resolved), { recursive: true })
await writeFile(resolved, JSON.stringify(fingerprint, null, 2) + '\n')
console.log(JSON.stringify({
  result: 'PASS',
  tables: fingerprint.tables.length,
  schemaHash: fingerprint.schemaHash,
  output: path.basename(resolved),
}))
