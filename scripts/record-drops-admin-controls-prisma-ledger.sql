-- Record Drops admin controls + Bonus Credits in Prisma only after
-- Supabase applied the DDL and the security contract is complete.
DO $$
DECLARE
  expected_checksum constant text := 'ec110f1b6eeff4ec5df4496a646f4f21f5480862dd5bd8aa4af54c7b11204a52';
  migration constant text := '20260924040000_drops_admin_controls_bonus_credits';
  existing_checksum text;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM supabase_migrations.schema_migrations
    WHERE name = 'drops_admin_controls_bonus_credits'
  ) THEN
    RAISE EXCEPTION 'Refusing Prisma ledger update; Supabase Bonus Credit migration is absent';
  END IF;

  IF NOT EXISTS (
       SELECT 1
       FROM pg_class c
       JOIN pg_namespace n ON n.oid = c.relnamespace
       WHERE n.nspname = 'public'
         AND c.relname = 'DropBonusCredit'
         AND c.relrowsecurity
     )
     OR EXISTS (
       SELECT 1
       FROM information_schema.role_table_grants
       WHERE table_schema = 'public'
         AND table_name = 'DropBonusCredit'
         AND grantee IN ('anon', 'authenticated')
     )
     OR NOT EXISTS (
       SELECT 1
       FROM pg_constraint
       WHERE conname = 'DropBonusCredit_claim_state_consistency'
         AND convalidated
     )
     OR NOT EXISTS (
       SELECT 1
       FROM pg_indexes
       WHERE schemaname = 'public'
         AND tablename = 'DropBonusEntry'
         AND indexname = 'DropBonusEntry_sourceBonusCreditId_key'
     ) THEN
    RAISE EXCEPTION 'Refusing Prisma ledger update; Bonus Credit security objects are incomplete';
  END IF;

  SELECT checksum INTO existing_checksum
  FROM public."_prisma_migrations"
  WHERE migration_name = migration;

  IF existing_checksum IS NOT NULL AND existing_checksum <> expected_checksum THEN
    RAISE EXCEPTION 'Checksum mismatch for %', migration;
  END IF;

  IF existing_checksum IS NULL THEN
    INSERT INTO public."_prisma_migrations" (
      id, checksum, finished_at, migration_name, logs,
      rolled_back_at, started_at, applied_steps_count
    ) VALUES (
      'd5b26476-fb83-44aa-b229-11b215c6ff4d',
      expected_checksum,
      clock_timestamp(),
      migration,
      'Verified Supabase Bonus Credit migration, RLS, revoked Data API grants, state constraint, and one-credit/one-entry uniqueness; DDL was not replayed.',
      NULL,
      clock_timestamp(),
      0
    );
  END IF;
END
$$;
