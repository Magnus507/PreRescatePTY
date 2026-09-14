#!/usr/bin/env bash
set -Eeuo pipefail

: "${DR_TARGET_DB_URL:?Set DR_TARGET_DB_URL to the isolated Supabase target connection string}"
: "${DR_CONFIRM_ISOLATED_TARGET:?Set DR_CONFIRM_ISOLATED_TARGET=YES only after verifying the target is not production}"

PRODUCTION_PROJECT_REF="${DR_PRODUCTION_PROJECT_REF:-fikidmfquaxhlayxctsa}"

if [[ "$DR_TARGET_DB_URL" == *"$PRODUCTION_PROJECT_REF"* ]]; then
  echo "Refusing restore: target URL resolves to the production Supabase project." >&2
  exit 2
fi

if [ "$DR_CONFIRM_ISOLATED_TARGET" != "YES" ]; then
  echo "Refusing restore: DR_CONFIRM_ISOLATED_TARGET must equal YES." >&2
  exit 2
fi

DB_DIR="${1:?Usage: scripts/dr/restore-database.sh <dr-artifacts/BACKUP_ID/database>}"
RESTORE_MODE="${DR_RESTORE_MODE:-full}"

for file in roles.sql schema.sql data.sql dump-summary.json SHA256SUMS; do
  if [ ! -f "$DB_DIR/$file" ]; then
    echo "Missing backup file: $DB_DIR/$file" >&2
    exit 2
  fi
done

(
  cd "$DB_DIR"
  sha256sum --check SHA256SUMS
)

started_epoch="$(date +%s)"
started_at="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

echo "Restoring logical backup into the explicitly confirmed isolated target."
echo "Restore mode: $RESTORE_MODE"
echo "No connection strings or secrets will be printed."

case "$RESTORE_MODE" in
  full)
    psql \
      --single-transaction \
      --variable ON_ERROR_STOP=1 \
      --file "$DB_DIR/roles.sql" \
      --file "$DB_DIR/schema.sql" \
      --command 'SET session_replication_role = replica' \
      --file "$DB_DIR/data.sql" \
      --dbname "$DR_TARGET_DB_URL"
    ;;
  data-only)
    psql \
      --single-transaction \
      --variable ON_ERROR_STOP=1 \
      --command 'SET session_replication_role = replica' \
      --file "$DB_DIR/data.sql" \
      --dbname "$DR_TARGET_DB_URL"
    ;;
  *)
    echo "Unsupported DR_RESTORE_MODE: $RESTORE_MODE (expected full or data-only)" >&2
    exit 2
    ;;
esac

finished_epoch="$(date +%s)"
finished_at="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
duration_seconds="$((finished_epoch - started_epoch))"

cat > "$DB_DIR/restore-result.json" <<JSON
{
  "startedAt": "$started_at",
  "finishedAt": "$finished_at",
  "durationSeconds": $duration_seconds,
  "restoreMode": "$RESTORE_MODE",
  "targetConfirmedIsolated": true,
  "result": "PASS"
}
JSON

echo "Database restore complete (${duration_seconds}s)."
