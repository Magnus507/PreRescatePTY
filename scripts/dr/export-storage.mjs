import { createHash } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'

const sourceUrl = process.env.DR_SOURCE_SUPABASE_URL
const sourceKey = process.env.DR_SOURCE_SUPABASE_SERVICE_ROLE_KEY
const root = process.argv[2] || 'dr-artifacts'
const backupId = process.env.DR_BACKUP_ID || new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')
const outDir = path.resolve(root, backupId, 'storage')
const objectsRoot = path.join(outDir, 'objects')

if (!sourceUrl || !sourceKey) {
  throw new Error('Set DR_SOURCE_SUPABASE_URL and DR_SOURCE_SUPABASE_SERVICE_ROLE_KEY')
}

const supabase = createClient(sourceUrl, sourceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

function safeObjectPath(bucket, objectName) {
  const candidate = path.resolve(objectsRoot, bucket, objectName)
  const bucketRoot = path.resolve(objectsRoot, bucket) + path.sep
  if (!candidate.startsWith(bucketRoot)) {
    throw new Error(`Unsafe Storage object path: ${bucket}/${objectName}`)
  }
  return candidate
}

async function listAllFiles(bucket, prefix = '') {
  const files = []
  let offset = 0

  while (true) {
    const { data, error } = await supabase.storage.from(bucket).list(prefix, {
      limit: 1000,
      offset,
      sortBy: { column: 'name', order: 'asc' },
    })

    if (error) {
      throw new Error(`Unable to list ${bucket}/${prefix}: ${error.message}`)
    }

    if (!data?.length) break

    for (const item of data) {
      const fullPath = prefix ? `${prefix}/${item.name}` : item.name
      if (item.metadata == null) {
        files.push(...await listAllFiles(bucket, fullPath))
      } else {
        files.push({ path: fullPath, metadata: item.metadata })
      }
    }

    if (data.length < 1000) break
    offset += data.length
  }

  return files
}

const startedAt = new Date()
await mkdir(objectsRoot, { recursive: true })

const { data: buckets, error: bucketError } = await supabase.storage.listBuckets()
if (bucketError) throw new Error(`Unable to list Storage buckets: ${bucketError.message}`)

const manifest = {
  backupId,
  startedAt: startedAt.toISOString(),
  finishedAt: null,
  sourceUrlHost: new URL(sourceUrl).host,
  buckets: [],
  totalObjects: 0,
  totalBytes: 0,
}

for (const bucket of buckets) {
  const bucketEntry = {
    id: bucket.id,
    name: bucket.name,
    public: Boolean(bucket.public),
    fileSizeLimit: bucket.file_size_limit ?? bucket.fileSizeLimit ?? null,
    allowedMimeTypes: bucket.allowed_mime_types ?? bucket.allowedMimeTypes ?? null,
    objects: [],
  }

  const files = await listAllFiles(bucket.name)

  for (const file of files) {
    const { data, error } = await supabase.storage.from(bucket.name).download(file.path)
    if (error) throw new Error(`Unable to download ${bucket.name}/${file.path}: ${error.message}`)

    const bytes = Buffer.from(await data.arrayBuffer())
    const outputPath = safeObjectPath(bucket.name, file.path)
    await mkdir(path.dirname(outputPath), { recursive: true })
    await writeFile(outputPath, bytes)

    const sha256 = createHash('sha256').update(bytes).digest('hex')
    bucketEntry.objects.push({
      path: file.path,
      size: bytes.length,
      sha256,
      contentType: file.metadata?.mimetype ?? file.metadata?.contentType ?? null,
      cacheControl: file.metadata?.cacheControl ?? null,
    })

    manifest.totalObjects += 1
    manifest.totalBytes += bytes.length
  }

  manifest.buckets.push(bucketEntry)
}

manifest.finishedAt = new Date().toISOString()
manifest.durationSeconds = Math.max(0, Math.round((new Date(manifest.finishedAt).getTime() - startedAt.getTime()) / 1000))

await mkdir(outDir, { recursive: true })
await writeFile(path.join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n')

console.log(JSON.stringify({
  backupId,
  buckets: manifest.buckets.length,
  objects: manifest.totalObjects,
  bytes: manifest.totalBytes,
  durationSeconds: manifest.durationSeconds,
}))
