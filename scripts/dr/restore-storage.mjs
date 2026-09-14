import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'

const targetUrl = process.env.DR_TARGET_SUPABASE_URL
const targetKey = process.env.DR_TARGET_SUPABASE_SERVICE_ROLE_KEY
const backupRoot = process.argv[2]

if (!targetUrl || !targetKey) {
  throw new Error('Set DR_TARGET_SUPABASE_URL and DR_TARGET_SUPABASE_SERVICE_ROLE_KEY')
}
if (!backupRoot) {
  throw new Error('Usage: node scripts/dr/restore-storage.mjs <dr-artifacts/BACKUP_ID/storage>')
}

const storageDir = path.resolve(backupRoot)
const objectsRoot = path.join(storageDir, 'objects')
const manifest = JSON.parse(await readFile(path.join(storageDir, 'manifest.json'), 'utf8'))

const supabase = createClient(targetUrl, targetKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const { data: currentBuckets, error: currentBucketError } = await supabase.storage.listBuckets()
if (currentBucketError) throw new Error(`Unable to list target buckets: ${currentBucketError.message}`)

const currentByName = new Map((currentBuckets || []).map((bucket) => [bucket.name, bucket]))

for (const bucket of manifest.buckets) {
  const existing = currentByName.get(bucket.name)
  if (!existing) {
    const { error } = await supabase.storage.createBucket(bucket.name, {
      public: bucket.public,
      fileSizeLimit: bucket.fileSizeLimit,
      allowedMimeTypes: bucket.allowedMimeTypes,
    })
    if (error) throw new Error(`Unable to create target bucket ${bucket.name}: ${error.message}`)
  } else {
    const { data: existingFiles, error } = await supabase.storage.from(bucket.name).list('', { limit: 1 })
    if (error) throw new Error(`Unable to inspect target bucket ${bucket.name}: ${error.message}`)
    if (existingFiles?.length && process.env.DR_ALLOW_TARGET_OBJECTS !== '1') {
      throw new Error(
        `Target bucket ${bucket.name} is not empty. Use an isolated empty target or set DR_ALLOW_TARGET_OBJECTS=1 explicitly.`,
      )
    }
  }

  for (const object of bucket.objects) {
    const inputPath = path.resolve(objectsRoot, bucket.name, object.path)
    const bucketRoot = path.resolve(objectsRoot, bucket.name) + path.sep
    if (!inputPath.startsWith(bucketRoot)) {
      throw new Error(`Unsafe object path in manifest: ${bucket.name}/${object.path}`)
    }

    const bytes = await readFile(inputPath)
    const sourceHash = createHash('sha256').update(bytes).digest('hex')
    if (sourceHash !== object.sha256) {
      throw new Error(`Backup checksum mismatch before upload: ${bucket.name}/${object.path}`)
    }

    const { error: uploadError } = await supabase.storage.from(bucket.name).upload(object.path, bytes, {
      upsert: true,
      contentType: object.contentType || undefined,
      cacheControl: object.cacheControl || undefined,
    })
    if (uploadError) {
      throw new Error(`Unable to restore ${bucket.name}/${object.path}: ${uploadError.message}`)
    }

    const { data: restored, error: downloadError } = await supabase.storage.from(bucket.name).download(object.path)
    if (downloadError) {
      throw new Error(`Unable to verify ${bucket.name}/${object.path}: ${downloadError.message}`)
    }

    const restoredBytes = Buffer.from(await restored.arrayBuffer())
    const restoredHash = createHash('sha256').update(restoredBytes).digest('hex')
    if (restoredHash !== object.sha256) {
      throw new Error(`Restored checksum mismatch: ${bucket.name}/${object.path}`)
    }
  }
}

console.log(JSON.stringify({
  backupId: manifest.backupId,
  restoredBuckets: manifest.buckets.length,
  restoredObjects: manifest.totalObjects,
  restoredBytes: manifest.totalBytes,
  checksumVerification: 'PASS',
}))
