-- Read-only release gate for the physical/digital identity column.
-- Any exception is a NO-GO and fails CI/deployment verification.
DO $$
DECLARE
  failures text[] := ARRAY[]::text[];
  critical_trigger_count integer;
BEGIN
  IF EXISTS (
    SELECT 1 FROM public."Chip" GROUP BY "shortCode" HAVING count(*) > 1
  ) THEN failures := array_append(failures, 'duplicate Chip.shortCode'); END IF;
  IF EXISTS (
    SELECT 1 FROM public."Chip" GROUP BY "chipUidInternal" HAVING count(*) > 1
  ) THEN failures := array_append(failures, 'duplicate Chip.chipUidInternal'); END IF;
  IF EXISTS (
    SELECT 1 FROM public."Chip" GROUP BY "serialPublic" HAVING count(*) > 1
  ) THEN failures := array_append(failures, 'duplicate Chip.serialPublic'); END IF;
  IF EXISTS (
    SELECT 1 FROM public."ChipClaimToken" GROUP BY "activationCodeHash" HAVING count(*) > 1
  ) THEN failures := array_append(failures, 'duplicate activationCodeHash'); END IF;
  IF EXISTS (
    SELECT 1 FROM public."OperationDigitalBatchItem" WHERE "shortCode" IS NOT NULL
    GROUP BY "shortCode" HAVING count(*) > 1
  ) THEN failures := array_append(failures, 'duplicate digital item shortCode'); END IF;

  IF EXISTS (
    SELECT 1 FROM public."ChipClaimToken" t
    LEFT JOIN public."Chip" c ON c.id = t."chipId"
    WHERE c.id IS NULL
  ) THEN failures := array_append(failures, 'orphan ChipClaimToken'); END IF;
  IF EXISTS (
    SELECT 1 FROM public."OperationDigitalBatchItem" i
    LEFT JOIN public."OperationDigitalBatch" b ON b.id = i."batchId"
    WHERE b.id IS NULL
  ) THEN failures := array_append(failures, 'orphan digital item'); END IF;
  IF EXISTS (
    SELECT 1 FROM public."OperationFinishedGoodUnit" u
    LEFT JOIN public."OperationDigitalBatchItem" i ON i.id = u."digitalBatchItemId"
    WHERE u."digitalBatchItemId" IS NOT NULL AND i.id IS NULL
  ) THEN failures := array_append(failures, 'orphan finished unit digital identity'); END IF;

  IF EXISTS (
    SELECT 1
    FROM public."Chip" c
    JOIN public."User" u ON u.id = c."ownerUserId"
    WHERE c."accountId" IS NOT NULL AND u."accountId" IS DISTINCT FROM c."accountId"
  ) THEN failures := array_append(failures, 'cross-account chip owner'); END IF;
  IF EXISTS (
    SELECT 1
    FROM public."Chip" c
    JOIN public."Profile" p ON p.id = c."assignedProfileId"
    WHERE c."accountId" IS NOT NULL AND p."accountId" IS DISTINCT FROM c."accountId"
  ) THEN failures := array_append(failures, 'cross-account chip profile'); END IF;
  IF EXISTS (
    SELECT 1 FROM public."Chip"
    WHERE status = 'activated'
      AND ("accountId" IS NULL OR "assignedProfileId" IS NULL OR "activatedAt" IS NULL)
  ) THEN failures := array_append(failures, 'incoherent activated chip'); END IF;
  IF EXISTS (
    SELECT 1 FROM public."OperationFinishedGoodUnit"
    WHERE ("activationStatus" = 'activated' AND "activatedAt" IS NULL)
       OR (status = 'activated' AND ("activationStatus" <> 'activated' OR "activatedAt" IS NULL))
  ) THEN failures := array_append(failures, 'incoherent activated finished unit'); END IF;
  IF EXISTS (
    SELECT 1
    FROM public."OperationFinishedGoodUnit" u
    JOIN public."OperationDigitalBatchItem" i ON i.id = u."digitalBatchItemId"
    WHERE u."chipId" IS NOT NULL AND i."chipId" IS DISTINCT FROM u."chipId"
  ) THEN failures := array_append(failures, 'finished unit/digital item chip mismatch'); END IF;
  IF EXISTS (
    SELECT 1 FROM public."ChipClaimToken"
    WHERE "activationCodeHash" IS NULL OR "activationCodeLast4" IS NULL
  ) THEN failures := array_append(failures, 'unprotected activation code'); END IF;
  IF EXISTS (
    SELECT 1 FROM public."ChipClaimToken"
    WHERE "usedAt" IS NULL AND status = 'active'
    GROUP BY "chipId" HAVING count(*) > 1
  ) THEN failures := array_append(failures, 'multiple open activation codes'); END IF;

  IF EXISTS (
    SELECT 1 FROM public."Chip"
    WHERE "nfcUrl" <> 'https://www.prerescatepty.com/e/' || "shortCode"
       OR position("shortCode" in "qrUrl") = 0
  ) THEN failures := array_append(failures, 'unstable public QR/NFC identity'); END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind IN ('r', 'p')
      AND c.relname <> '_prisma_migrations'
      AND NOT c.relrowsecurity
  ) THEN failures := array_append(failures, 'public table without RLS'); END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    CROSS JOIN (VALUES ('anon'), ('authenticated')) AS roles(role_name)
    WHERE n.nspname = 'public'
      AND c.relkind IN ('r', 'p')
      AND c.relname <> '_prisma_migrations'
      AND has_table_privilege(roles.role_name, format('%I.%I', n.nspname, c.relname),
        'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
  ) THEN failures := array_append(failures, 'direct Data API table privilege'); END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE p.prosecdef
      AND n.nspname IN ('public', 'private')
      AND (
        has_function_privilege('anon', p.oid, 'EXECUTE')
        OR has_function_privilege('authenticated', p.oid, 'EXECUTE')
      )
  ) THEN failures := array_append(failures, 'exposed security-definer function'); END IF;

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
  IF critical_trigger_count <> 7 THEN
    failures := array_append(failures, 'missing critical identity trigger');
  END IF;

  IF cardinality(failures) > 0 THEN
    RAISE EXCEPTION 'COLUMN_VERTEBRAL_NO_GO: %', array_to_string(failures, '; ');
  END IF;

  RAISE NOTICE 'COLUMN_VERTEBRAL_GO: identity, tenancy, RLS, URLs and activation invariants passed';
END
$$;
