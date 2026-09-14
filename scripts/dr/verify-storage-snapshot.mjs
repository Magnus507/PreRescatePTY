import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'

const sourceUrl = process.env.DR_SOURCE_SUPABASE_URL
const sourceKey = process.env.DR_SOURCE_SUPABASE_SERVICE_ROLE_KEY
const storageRoot = process.argv[2]

if (!sourceUrl || !sourceKey) {
  throw new Error('Set DR_SOURCE_SUPABASE_URL and DR_SOURCE_SUPABASE_SERVICE_ROLE_KEY')
}
if (!storageRoot) {
  throw new Error('Usage: node scripts/dr/verify-storage-snapshot.mjs <dr-artifacts/BACKUP_ID/storage>')
}

const manifest = JSON.parse(
  await readFile(path.join(path.resolve(storageRoot), 'manifest.json'), 'utf8'),
)

const expected = new Map()
for (const bucket of manifest.buckets) {
  for (const object of bucket.objects) {
    expected.set(`${bucket.name}/${object.path}`, object.sha256)
  }
}

const supabase = createClient(sourceUrl, sourceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

async function listAllFiles(bucket, prefix = '') {
  const files = []
  let offset = 0

  while (true) {
    const { data, error } = await supabase.storage.from(bucket).list(prefix, {
      limit: 1000,
      offset,
      sortBy: { column: 'name', order: 'asc' },
    })
    if (error) throw new Error(`Unable to list ${bucket}/${prefix}: ${error.message}`)
    if (!data?.length) break

    for (const item of data) {
      const fullPath = prefix ? `${prefix}/${item.name}` : item.name
      if (item.metadata == null) {
        files.push(...await listAllFiles(bucket, fullPath))
      } else {
        files.push(fullPath)
      }
    }

    if (data.length < 1000) break
    offset += data.length
  }

  return files
}

const { data: buckets, error: bucketError } = await supabase.storage.listBuckets()
if (bucketError) throw new Error(`Unable to list Storage buckets: ${bucketError.message}`)

const actualKeys = []
for (const bucket of buckets) {
  const files = await listAllFiles(bucket.name)
  for (const objectPath of files) {
    const key = `${bucket.name}/${objectPath}`
    actualKeys.push(key)

    const expectedHash = expected.get(key)
    if (!expectedHash) {
      throw new Error(`Storage changed during backup: new object ${key}`)
    }

    const { data, error } = await supabase.storage.from(bucket.name).download(objectPath)
    if (error) throw new Error(`Unable to verify source object ${key}: ${error.message}`)
    const bytes = Buffer.from(await data.arrayBuffer())
    const currentHash = createHash('sha256').update(bytes).digest('hex')
    if (currentHash !== expectedHash) {
      throw new Error(`Storage changed during backup: content changed for ${key}`)
    }
  }
}

if (actualKeys.length !== expected.size) {
  const actual = new Set(actualKeys)
  const missing = [...expected.keys()].filter((key) => !actual.has(key))
  throw new Error(
    `Storage changed during backup: expected ${expected.size} objects, found ${actualKeys.length}. Missing: ${missing.slice(0, 5).join(', ')}`,
  )
}

console.log(JSON.stringify({
  backupId: manifest.backupId,
  result: 'PASS',
  objects: actualKeys.length,
  storageStableAcrossDatabaseSnapshot: true,
}))
