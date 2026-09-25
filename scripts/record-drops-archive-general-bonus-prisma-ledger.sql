-- Record the archive/general Bonus Credit migration in Prisma only after
-- the additive Supabase migration has been applied and verified.
DO $$
DECLARE
  migration_checksum constant text := '1d1698693dc82db2841780e64daffa0568e94e881894ae92fe57a1c0e7c8d298';
  prisma_migration constant text := '20260925010000_drops_archive_general_bonus_codes';
  existing_checksum text;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM supabase_migrations.schema_migrations
    WHERE name = 'drops_archive_general_bonus_codes'
  ) THEN
    RAISE EXCEPTION 'Refusing Prisma ledger update; Supabase Drops archive/general Bonus Credit migration is absent';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'Drop'
      AND column_name = 'archivedAt'
      AND is_nullable = 'YES'
  ) OR NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'DropBonusCredit'
      AND column_name = 'creditAmount'
      AND is_nullable = 'NO'
  ) OR EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'DropBonusCredit'
      AND column_name = 'dropId'
      AND is_nullable = 'NO'
  ) OR NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'DropBonusCredit_creditAmount_check'
      AND convalidated
  ) OR NOT EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'Drop_archivedAt_displayOrder_createdAt_idx'
      AND c.relkind = 'i'
  ) THEN
    RAISE EXCEPTION 'Refusing Prisma ledger update; Drops archive/general Bonus Credit schema is incomplete';
  END IF;

  SELECT checksum INTO existing_checksum
  FROM public."_prisma_migrations"
  WHERE migration_name = prisma_migration;

  IF existing_checksum IS NOT NULL AND existing_checksum <> migration_checksum THEN
    RAISE EXCEPTION 'Checksum mismatch for %', prisma_migration;
  END IF;

  IF existing_checksum IS NULL THEN
    INSERT INTO public."_prisma_migrations" (
      id, checksum, finished_at, migration_name, logs,
      rolled_back_at, started_at, applied_steps_count
    ) VALUES (
      '9ee8a551-8718-49dd-9001-2a893339e67c',
      migration_checksum,
      clock_timestamp(),
      prisma_migration,
      'Verified Supabase Drops archive/general Bonus Credit schema before recording Prisma ledger; DDL was not replayed.',
      NULL,
      clock_timestamp(),
      0
    );
  END IF;
END
$$;
