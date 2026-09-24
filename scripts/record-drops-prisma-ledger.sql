-- Record Pre-Rescate Drops in Prisma only after Supabase applied the DDL
-- and the full Drops security contract is present. This script changes only
-- Prisma's migration ledger; it never replays application DDL or touches data.
DO $$
DECLARE
  expected_checksum constant text := '33e7ce7215ae664d74b88a9620c59491e79e4ee19169a45d9f9b830bace02685';
  migration constant text := '20260924020000_pre_rescate_drops';
  existing_checksum text;
  protected_table_count integer;
  drops_constraint_count integer;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM supabase_migrations.schema_migrations
    WHERE name = 'pre_rescate_drops'
  ) THEN
    RAISE EXCEPTION 'Refusing Prisma ledger update; Supabase Drops migration is absent';
  END IF;

  SELECT count(*) INTO protected_table_count
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relname IN ('Drop', 'DropPass', 'DropBonusEntry', 'DropDraw')
    AND c.relrowsecurity;

  SELECT count(*) INTO drops_constraint_count
  FROM pg_constraint
  WHERE conname IN (
    'Drop_targetPasses_positive',
    'DropPass_sourceOrdinal_positive',
    'DropPass_state_consistency',
    'DropDraw_entryCount_positive',
    'DropDraw_winnerIndex_valid'
  )
    AND convalidated;

  IF protected_table_count <> 4
     OR drops_constraint_count <> 5
     OR NOT EXISTS (
       SELECT 1
       FROM pg_trigger
       WHERE tgname = 'DropDraw_immutable'
         AND NOT tgisinternal
     )
     OR EXISTS (
       SELECT 1
       FROM information_schema.role_table_grants
       WHERE table_schema = 'public'
         AND table_name IN ('Drop', 'DropPass', 'DropBonusEntry', 'DropDraw')
         AND grantee IN ('anon', 'authenticated')
     ) THEN
    RAISE EXCEPTION 'Refusing Prisma ledger update; Drops security objects are incomplete';
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
      '0d7f41e2-4ec9-4a7e-b4a1-d8cfe41cd323',
      expected_checksum,
      clock_timestamp(),
      migration,
      'Verified Supabase Drops migration, RLS, revoked Data API grants, constraints, and immutable draw trigger; DDL was not replayed.',
      NULL,
      clock_timestamp(),
      0
    );
  END IF;
END
$$;
