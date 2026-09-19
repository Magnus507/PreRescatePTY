#!/usr/bin/env bash
set -Eeuo pipefail

: "${DR_SOURCE_DB_URL:?Set DR_SOURCE_DB_URL to the Supabase Session Pooler/direct connection string}"

ROOT_DIR="${1:-dr-artifacts}"
STAMP="${DR_BACKUP_ID:-$(date -u +%Y%m%dT%H%M%SZ)}"
OUT_DIR="${ROOT_DIR%/}/${STAMP}/database"
mkdir -p "$OUT_DIR"

started_epoch="$(date +%s)"
started_at="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

echo "Creating Supabase logical backup in $OUT_DIR"
echo "Secrets are never printed. The output contains sensitive data and must be encrypted/restricted."

npx --yes supabase@2.117.0 db dump --db-url "$DR_SOURCE_DB_URL" -f "$OUT_DIR/roles.sql" --role-only
npx --yes supabase@2.117.0 db dump --db-url "$DR_SOURCE_DB_URL" -f "$OUT_DIR/schema.sql"
npx --yes supabase@2.117.0 db dump --db-url "$DR_SOURCE_DB_URL" -f "$OUT_DIR/data.sql" --use-copy --data-only \
  -x "public._prisma_migrations" \
  -x "storage.buckets_vectors" \
  -x "storage.vector_indexes"

node scripts/dr/summarize-data-dump.mjs "$OUT_DIR/data.sql" "$OUT_DIR/dump-summary.json"

(
  cd "$OUT_DIR"
  sha256sum roles.sql schema.sql data.sql dump-summary.json > SHA256SUMS
)

finished_epoch="$(date +%s)"
finished_at="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
duration_seconds="$((finished_epoch - started_epoch))"

cat > "$OUT_DIR/manifest.json" <<JSON
{
  "backupId": "$STAMP",
  "startedAt": "$started_at",
  "finishedAt": "$finished_at",
  "durationSeconds": $duration_seconds,
  "gitSha": "${GITHUB_SHA:-unknown}",
  "format": "supabase-cli-logical-sql",
  "files": ["roles.sql", "schema.sql", "data.sql", "dump-summary.json", "SHA256SUMS"],
  "excludedDataTables": ["public._prisma_migrations", "storage.buckets_vectors", "storage.vector_indexes"],
  "storageObjectsIncluded": false
}
JSON

echo "Database backup complete: $STAMP (${duration_seconds}s)"
