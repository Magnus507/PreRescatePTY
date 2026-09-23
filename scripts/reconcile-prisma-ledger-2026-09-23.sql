-- One-time, evidence-backed reconciliation of Prisma's ledger with the same
-- migrations already applied through Supabase. This does not replay DDL or data
-- changes. It aborts unless all five Supabase records and their schema effects exist.

DO $$
DECLARE
  missing_supabase text[];
  bad_checksum text;
BEGIN
  SELECT array_agg(wanted.name ORDER BY wanted.name)
  INTO missing_supabase
  FROM (VALUES
    ('block3_privacy_legacy_redaction'),
    ('block3_retire_orphan_auth_trigger'),
    ('block7_support_inbox'),
    ('profile_context_modules'),
    ('safe_return_profile_module')
  ) wanted(name)
  WHERE NOT EXISTS (
    SELECT 1
    FROM supabase_migrations.schema_migrations s
    WHERE s.name = wanted.name
  );

  IF missing_supabase IS NOT NULL THEN
    RAISE EXCEPTION 'Refusing Prisma ledger reconciliation; missing Supabase history: %',
      array_to_string(missing_supabase, ', ');
  END IF;

  IF to_regclass('public."SupportMessage"') IS NULL
     OR EXISTS (
       SELECT 1 FROM pg_trigger
       WHERE tgrelid = to_regclass('auth.users')
         AND tgname = 'v2_on_auth_user_created'
         AND NOT tgisinternal
     )
     OR (
       SELECT count(*) FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'Profile'
         AND column_name IN (
           'minorModuleEnabled', 'minorModuleData',
           'elderModuleEnabled', 'elderModuleData',
           'specialNeedsModuleEnabled', 'specialNeedsModuleData',
           'petModuleEnabled', 'petModuleData',
           'workModuleEnabled', 'workModuleData',
           'safeReturnModuleEnabled', 'safeReturnModuleData'
         )
     ) <> 12 THEN
    RAISE EXCEPTION 'Refusing Prisma ledger reconciliation; verified schema effects are incomplete';
  END IF;

  CREATE TEMP TABLE expected_prisma_history (
    id text PRIMARY KEY,
    migration_name text UNIQUE NOT NULL,
    checksum text NOT NULL
  ) ON COMMIT DROP;

  INSERT INTO expected_prisma_history (id, migration_name, checksum) VALUES
    ('c87a45da-917c-4a47-9a0c-cdd93ce3b001', '20260910000500_block3_privacy_legacy_redaction', 'f2039ee3a3ed8d76d18c4408d8f52a7eedbd27a44470e2603ac68915e1bd2cdc'),
    ('760cf089-2a71-4bef-b3e4-f6880633b002', '20260910140000_block3_retire_orphan_auth_trigger', '15363ab6f249ed0aef5d73da53d8627450235e19eee4e9dba6d243d5e9e85c94'),
    ('b3785032-a278-43b1-92b7-4dc40133b003', '20260919213000_block7_support_inbox', '5a3cc5f91a98ff3c72a4e0ad6dadb02e53ee17dbbdb5e3e1e0f7e3cb5ddf9bb1'),
    ('aa56d0d0-feb4-4dd3-8c40-cfa366acb004', '20260921123000_profile_context_modules', '9663083090013a048889d65bb74b7d22e21fcd58218b09069c067452fbcadfb5'),
    ('f4f8740a-2450-44a7-aad2-636fb79bb005', '20260922003000_safe_return_profile_module', '8969e3a186392f355057df888c04d3400e3a7cc2fdad6360cbc48f6fe2fcf42c');

  SELECT e.migration_name INTO bad_checksum
  FROM expected_prisma_history e
  JOIN public."_prisma_migrations" p USING (migration_name)
  WHERE p.checksum <> e.checksum
  LIMIT 1;

  IF bad_checksum IS NOT NULL THEN
    RAISE EXCEPTION 'Refusing Prisma ledger reconciliation; checksum mismatch for %', bad_checksum;
  END IF;

  INSERT INTO public."_prisma_migrations" (
    id, checksum, finished_at, migration_name, logs,
    rolled_back_at, started_at, applied_steps_count
  )
  SELECT
    e.id,
    e.checksum,
    clock_timestamp(),
    e.migration_name,
    'Verified existing schema and Supabase migration history; DDL was not replayed.',
    NULL,
    clock_timestamp(),
    0
  FROM expected_prisma_history e
  WHERE NOT EXISTS (
    SELECT 1 FROM public."_prisma_migrations" p
    WHERE p.migration_name = e.migration_name
  );

  IF (
    SELECT count(*)
    FROM public."_prisma_migrations" p
    JOIN expected_prisma_history e USING (migration_name)
    WHERE p.checksum = e.checksum
      AND p.finished_at IS NOT NULL
      AND p.rolled_back_at IS NULL
  ) <> 5 THEN
    RAISE EXCEPTION 'Prisma ledger reconciliation did not produce five verified rows';
  END IF;
END
$$;
