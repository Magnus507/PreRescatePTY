-- Record the hardening migration in Prisma only after Supabase applied it and
-- every critical object is present. No application data or schema is changed.
DO $$
DECLARE
  expected_checksum constant text := '21edff7e1496196c767ba9675c54820110b68b4deb02260dc554e53a1f89f20e';
  migration constant text := '20260923042950_column_vertebral_hardening';
  existing_checksum text;
  critical_trigger_count integer;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM supabase_migrations.schema_migrations
    WHERE name = 'column_vertebral_hardening'
  ) THEN
    RAISE EXCEPTION 'Refusing Prisma ledger update; Supabase hardening migration is absent';
  END IF;

  SELECT count(*) INTO critical_trigger_count
  FROM pg_trigger
  WHERE NOT tgisinternal
    AND tgname IN (
      'Chip_identity_immutable',
      'Chip_tenant_coherence',
      'ChipClaimToken_identity_immutable',
      'OperationDigitalBatch_identity_immutable',
      'OperationDigitalBatchItem_identity_immutable',
      'OperationFinishedGoodUnit_identity_immutable',
      'OperationFinishedGoodUnit_identity_coherence'
    );

  IF critical_trigger_count <> 7
     OR NOT EXISTS (
       SELECT 1 FROM pg_constraint
       WHERE conname = 'Chip_activated_identity_check' AND convalidated
     )
     OR NOT EXISTS (
       SELECT 1 FROM pg_constraint
       WHERE conname = 'OperationFinishedGoodUnit_activation_check' AND convalidated
     ) THEN
    RAISE EXCEPTION 'Refusing Prisma ledger update; hardening objects are incomplete';
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
      'c5c3b2db-22cd-4cf4-b06c-927fe892b006',
      expected_checksum,
      clock_timestamp(),
      migration,
      'Verified Supabase migration and all critical hardening objects; DDL was not replayed.',
      NULL,
      clock_timestamp(),
      0
    );
  END IF;
END
$$;
