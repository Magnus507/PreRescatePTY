-- Record Drops wallet/order migrations in Prisma only after Supabase applied
-- the additive schema and display-order backfill. This script does not replay DDL.
DO $$
DECLARE
  schema_checksum constant text := 'cc92252fd1bad36241caa923ad812110103d9c0c14466885ffed580992de85cb';
  data_checksum constant text := '32be1acfff04baa60723ea1ac2a5e28eec218e1b82146b457016c9c64a250094';
  schema_migration constant text := '20260924060000_drops_wallet_ordering';
  data_migration constant text := '20260924060100_drops_display_order_backfill';
  existing_checksum text;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM supabase_migrations.schema_migrations
    WHERE name = 'drops_wallet_ordering_schema'
  ) OR NOT EXISTS (
    SELECT 1 FROM supabase_migrations.schema_migrations
    WHERE name = 'drops_display_order_backfill'
  ) THEN
    RAISE EXCEPTION 'Refusing Prisma ledger update; Supabase Drops wallet migrations are absent';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'Drop'
      AND column_name = 'displayOrder'
      AND is_nullable = 'NO'
  ) OR NOT EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'DropPassGrantCode'
      AND c.relrowsecurity
  ) OR EXISTS (
    SELECT 1
    FROM information_schema.role_table_grants
    WHERE table_schema = 'public'
      AND table_name = 'DropPassGrantCode'
      AND grantee IN ('anon', 'authenticated')
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'DropPassGrantCode_claim_state_consistency'
      AND convalidated
  ) THEN
    RAISE EXCEPTION 'Refusing Prisma ledger update; Drops wallet security objects are incomplete';
  END IF;

  SELECT checksum INTO existing_checksum
  FROM public."_prisma_migrations"
  WHERE migration_name = schema_migration;

  IF existing_checksum IS NOT NULL AND existing_checksum <> schema_checksum THEN
    RAISE EXCEPTION 'Checksum mismatch for %', schema_migration;
  END IF;

  IF existing_checksum IS NULL THEN
    INSERT INTO public."_prisma_migrations" (
      id, checksum, finished_at, migration_name, logs,
      rolled_back_at, started_at, applied_steps_count
    ) VALUES (
      '4b4334bf-91c0-4dc6-9421-a529eac5fd58',
      schema_checksum,
      clock_timestamp(),
      schema_migration,
      'Verified Supabase Drops wallet/order schema, RLS and revoked Data API grants; DDL was not replayed.',
      NULL,
      clock_timestamp(),
      0
    );
  END IF;

  SELECT checksum INTO existing_checksum
  FROM public."_prisma_migrations"
  WHERE migration_name = data_migration;

  IF existing_checksum IS NOT NULL AND existing_checksum <> data_checksum THEN
    RAISE EXCEPTION 'Checksum mismatch for %', data_migration;
  END IF;

  IF existing_checksum IS NULL THEN
    INSERT INTO public."_prisma_migrations" (
      id, checksum, finished_at, migration_name, logs,
      rolled_back_at, started_at, applied_steps_count
    ) VALUES (
      '52e68440-7691-43a6-9eb3-5accb4238a0d',
      data_checksum,
      clock_timestamp(),
      data_migration,
      'Verified Supabase display-order backfill; data migration was not replayed.',
      NULL,
      clock_timestamp(),
      0
    );
  END IF;
END
$$;
