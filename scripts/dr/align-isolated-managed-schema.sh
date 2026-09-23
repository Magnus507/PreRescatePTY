#!/usr/bin/env bash
set -Eeuo pipefail

: "${DR_TARGET_DB_URL:?Set DR_TARGET_DB_URL}"
: "${DR_TARGET_PROJECT_REF:?Set DR_TARGET_PROJECT_REF to the dedicated restore-test project ref}"
: "${DR_CONFIRM_ISOLATED_TARGET:?Set DR_CONFIRM_ISOLATED_TARGET=YES}"

PRODUCTION_PROJECT_REF="${DR_PRODUCTION_PROJECT_REF:-fikidmfquaxhlayxctsa}"

if [ "$DR_CONFIRM_ISOLATED_TARGET" != "YES" ]; then
  echo "Refusing managed-schema alignment: DR_CONFIRM_ISOLATED_TARGET must equal YES." >&2
  exit 2
fi

if [[ "$DR_TARGET_DB_URL" != *"$DR_TARGET_PROJECT_REF"* ]]; then
  echo "Refusing managed-schema alignment: target DB URL does not match the dedicated restore-test project." >&2
  exit 2
fi

if [[ "$DR_TARGET_DB_URL" == *"$PRODUCTION_PROJECT_REF"* ]]; then
  echo "Refusing managed-schema alignment: target DB URL resolves to production." >&2
  exit 2
fi

# The source project currently has two nullable Storage columns that the
# restore-test project's managed schema has not received yet. Keeping this
# alignment explicit makes data-only COPY deterministic without replacing
# Supabase's own auth/storage migration ledgers.
psql "$DR_TARGET_DB_URL" --variable ON_ERROR_STOP=1 --single-transaction <<'SQL'
ALTER TABLE storage.buckets
  ADD COLUMN IF NOT EXISTS lifecycle_configuration jsonb,
  ADD COLUMN IF NOT EXISTS lifecycle_configuration_generation uuid;
SQL

echo "Dedicated restore-test managed schema aligned."
