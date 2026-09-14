#!/usr/bin/env bash
set -Eeuo pipefail

: "${DR_TARGET_DB_URL:?Set DR_TARGET_DB_URL}"
: "${DR_TARGET_PROJECT_REF:?Set DR_TARGET_PROJECT_REF to the dedicated restore-test project ref}"
: "${DR_CONFIRM_ISOLATED_TARGET:?Set DR_CONFIRM_ISOLATED_TARGET=YES}"

PRODUCTION_PROJECT_REF="${DR_PRODUCTION_PROJECT_REF:-fikidmfquaxhlayxctsa}"

if [ "$DR_CONFIRM_ISOLATED_TARGET" != "YES" ]; then
  echo "Refusing reset: DR_CONFIRM_ISOLATED_TARGET must equal YES." >&2
  exit 2
fi

if [[ "$DR_TARGET_DB_URL" != *"$DR_TARGET_PROJECT_REF"* ]]; then
  echo "Refusing reset: target DB URL does not match the dedicated restore-test project." >&2
  exit 2
fi

if [[ "$DR_TARGET_DB_URL" == *"$PRODUCTION_PROJECT_REF"* ]]; then
  echo "Refusing reset: target DB URL resolves to production." >&2
  exit 2
fi

psql "$DR_TARGET_DB_URL" --variable ON_ERROR_STOP=1 --single-transaction <<'SQL'
DO $$
DECLARE
  targets text;
BEGIN
  SELECT string_agg(format('%I.%I', table_schema, table_name), ', ' ORDER BY table_schema, table_name)
    INTO targets
    FROM information_schema.tables
   WHERE table_type = 'BASE TABLE'
     AND (
       (table_schema = 'public' AND table_name <> '_prisma_migrations')
       OR (table_schema = 'auth' AND table_name <> 'schema_migrations')
       OR (
         table_schema = 'storage'
         AND table_name NOT IN ('migrations', 'buckets_vectors', 'vector_indexes')
       )
     );

  IF targets IS NOT NULL THEN
    EXECUTE 'TRUNCATE TABLE ' || targets || ' CASCADE';
  END IF;
END
$$;
SQL

echo "Dedicated restore-test data reset complete."
