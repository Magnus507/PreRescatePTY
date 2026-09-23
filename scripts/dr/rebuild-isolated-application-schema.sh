#!/usr/bin/env bash
set -Eeuo pipefail

: "${DR_TARGET_DB_URL:?Set DR_TARGET_DB_URL}"
: "${DR_TARGET_PROJECT_REF:?Set DR_TARGET_PROJECT_REF to the dedicated restore-test project ref}"
: "${DR_CONFIRM_ISOLATED_TARGET:?Set DR_CONFIRM_ISOLATED_TARGET=YES}"

PRODUCTION_PROJECT_REF="${DR_PRODUCTION_PROJECT_REF:-fikidmfquaxhlayxctsa}"

if [ "$DR_CONFIRM_ISOLATED_TARGET" != "YES" ]; then
  echo "Refusing schema rebuild: DR_CONFIRM_ISOLATED_TARGET must equal YES." >&2
  exit 2
fi

if [[ "$DR_TARGET_DB_URL" != *"$DR_TARGET_PROJECT_REF"* ]]; then
  echo "Refusing schema rebuild: target DB URL does not match the dedicated restore-test project." >&2
  exit 2
fi

if [[ "$DR_TARGET_DB_URL" == *"$PRODUCTION_PROJECT_REF"* ]]; then
  echo "Refusing schema rebuild: target DB URL resolves to production." >&2
  exit 2
fi

psql "$DR_TARGET_DB_URL" --variable ON_ERROR_STOP=1 --single-transaction <<'SQL'
DROP SCHEMA IF EXISTS private CASCADE;
DROP SCHEMA IF EXISTS public CASCADE;

CREATE SCHEMA public AUTHORIZATION pg_database_owner;
COMMENT ON SCHEMA public IS 'standard public schema';

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON SCHEMA public TO postgres, service_role;
SQL

echo "Dedicated restore-test application schemas rebuilt."
