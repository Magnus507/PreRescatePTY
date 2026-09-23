-- Column vertebral hardening: immutable identities, tenant coherence and atomic uniqueness.
-- Safe to run repeatedly through the migration ledger; objects are named explicitly.

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public."ChipClaimToken"
    WHERE "activationCodeHash" IS NULL OR "activationCodeLast4" IS NULL
  ) THEN
    RAISE EXCEPTION 'ChipClaimToken protection backfill must complete before hardening';
  END IF;
END
$$;

ALTER TABLE public."ChipClaimToken"
  ALTER COLUMN "activationCodeHash" SET NOT NULL,
  ALTER COLUMN "activationCodeLast4" SET NOT NULL;

CREATE INDEX IF NOT EXISTS "Chip_assignedProfileId_idx"
  ON public."Chip" ("assignedProfileId");
CREATE INDEX IF NOT EXISTS "ChipClaimToken_chipId_idx"
  ON public."ChipClaimToken" ("chipId");
CREATE INDEX IF NOT EXISTS "ChipClaimToken_orderId_idx"
  ON public."ChipClaimToken" ("orderId");

CREATE UNIQUE INDEX IF NOT EXISTS "ChipClaimToken_one_open_active_per_chip"
  ON public."ChipClaimToken" ("chipId")
  WHERE "usedAt" IS NULL AND status = 'active';

CREATE OR REPLACE FUNCTION private.enforce_critical_identity_immutability()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF TG_TABLE_NAME = 'Chip' THEN
    IF OLD.id IS DISTINCT FROM NEW.id
       OR OLD."shortCode" IS DISTINCT FROM NEW."shortCode"
       OR OLD."chipUidInternal" IS DISTINCT FROM NEW."chipUidInternal"
       OR OLD."serialPublic" IS DISTINCT FROM NEW."serialPublic"
       OR (OLD."internalLabel" IS NOT NULL AND OLD."internalLabel" IS DISTINCT FROM NEW."internalLabel") THEN
      RAISE EXCEPTION 'immutable Chip identity cannot be changed' USING ERRCODE = '23514';
    END IF;
  ELSIF TG_TABLE_NAME = 'ChipClaimToken' THEN
    IF OLD.id IS DISTINCT FROM NEW.id
       OR OLD."chipId" IS DISTINCT FROM NEW."chipId"
       OR OLD."activationCode" IS DISTINCT FROM NEW."activationCode"
       OR OLD."activationCodeHash" IS DISTINCT FROM NEW."activationCodeHash"
       OR OLD."activationCodeLast4" IS DISTINCT FROM NEW."activationCodeLast4"
       OR (OLD."usedAt" IS NOT NULL AND OLD."usedAt" IS DISTINCT FROM NEW."usedAt") THEN
      RAISE EXCEPTION 'immutable activation identity cannot be changed' USING ERRCODE = '23514';
    END IF;
  ELSIF TG_TABLE_NAME = 'OperationDigitalBatch' THEN
    IF OLD.id IS DISTINCT FROM NEW.id OR OLD.code IS DISTINCT FROM NEW.code THEN
      RAISE EXCEPTION 'immutable digital batch identity cannot be changed' USING ERRCODE = '23514';
    END IF;
  ELSIF TG_TABLE_NAME = 'OperationDigitalBatchItem' THEN
    IF OLD.id IS DISTINCT FROM NEW.id
       OR OLD."batchId" IS DISTINCT FROM NEW."batchId"
       OR OLD."sequenceNumber" IS DISTINCT FROM NEW."sequenceNumber"
       OR OLD."internalLabel" IS DISTINCT FROM NEW."internalLabel"
       OR (OLD."shortCode" IS NOT NULL AND OLD."shortCode" IS DISTINCT FROM NEW."shortCode")
       OR (OLD."chipId" IS NOT NULL AND OLD."chipId" IS DISTINCT FROM NEW."chipId") THEN
      RAISE EXCEPTION 'immutable digital item identity cannot be changed' USING ERRCODE = '23514';
    END IF;
  ELSIF TG_TABLE_NAME = 'OperationFinishedGoodUnit' THEN
    IF OLD.id IS DISTINCT FROM NEW.id
       OR OLD."internalLabel" IS DISTINCT FROM NEW."internalLabel"
       OR (OLD."digitalBatchItemId" IS NOT NULL AND OLD."digitalBatchItemId" IS DISTINCT FROM NEW."digitalBatchItemId")
       OR (OLD."chipId" IS NOT NULL AND OLD."chipId" IS DISTINCT FROM NEW."chipId") THEN
      RAISE EXCEPTION 'immutable finished-unit identity cannot be changed' USING ERRCODE = '23514';
    END IF;
  END IF;

  RETURN NEW;
END
$$;

CREATE OR REPLACE FUNCTION private.enforce_chip_tenant_coherence()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF NEW."accountId" IS NOT NULL AND NEW."ownerUserId" IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM public."User" u
       WHERE u.id = NEW."ownerUserId" AND u."accountId" = NEW."accountId"
     ) THEN
    RAISE EXCEPTION 'chip owner must belong to chip account' USING ERRCODE = '23514';
  END IF;

  IF NEW."accountId" IS NOT NULL AND NEW."assignedProfileId" IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM public."Profile" p
       WHERE p.id = NEW."assignedProfileId" AND p."accountId" = NEW."accountId"
     ) THEN
    RAISE EXCEPTION 'chip profile must belong to chip account' USING ERRCODE = '23514';
  END IF;

  IF NEW.status = 'activated'
     AND (NEW."accountId" IS NULL OR NEW."assignedProfileId" IS NULL OR NEW."activatedAt" IS NULL) THEN
    RAISE EXCEPTION 'activated chip requires account, profile and activation timestamp' USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END
$$;

CREATE OR REPLACE FUNCTION private.enforce_finished_unit_identity_coherence()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF NEW."digitalBatchItemId" IS NOT NULL AND NEW."chipId" IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM public."OperationDigitalBatchItem" i
       WHERE i.id = NEW."digitalBatchItemId" AND i."chipId" = NEW."chipId"
     ) THEN
    RAISE EXCEPTION 'finished unit must preserve the digital item chip identity' USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END
$$;

REVOKE ALL ON FUNCTION private.enforce_critical_identity_immutability() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.enforce_chip_tenant_coherence() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.enforce_finished_unit_identity_coherence() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS "Chip_identity_immutable" ON public."Chip";
CREATE TRIGGER "Chip_identity_immutable"
BEFORE UPDATE ON public."Chip"
FOR EACH ROW EXECUTE FUNCTION private.enforce_critical_identity_immutability();

DROP TRIGGER IF EXISTS "Chip_tenant_coherence" ON public."Chip";
CREATE TRIGGER "Chip_tenant_coherence"
BEFORE INSERT OR UPDATE OF "accountId", "ownerUserId", "assignedProfileId", status, "activatedAt"
ON public."Chip"
FOR EACH ROW EXECUTE FUNCTION private.enforce_chip_tenant_coherence();

DROP TRIGGER IF EXISTS "ChipClaimToken_identity_immutable" ON public."ChipClaimToken";
CREATE TRIGGER "ChipClaimToken_identity_immutable"
BEFORE UPDATE ON public."ChipClaimToken"
FOR EACH ROW EXECUTE FUNCTION private.enforce_critical_identity_immutability();

DROP TRIGGER IF EXISTS "OperationDigitalBatch_identity_immutable" ON public."OperationDigitalBatch";
CREATE TRIGGER "OperationDigitalBatch_identity_immutable"
BEFORE UPDATE ON public."OperationDigitalBatch"
FOR EACH ROW EXECUTE FUNCTION private.enforce_critical_identity_immutability();

DROP TRIGGER IF EXISTS "OperationDigitalBatchItem_identity_immutable" ON public."OperationDigitalBatchItem";
CREATE TRIGGER "OperationDigitalBatchItem_identity_immutable"
BEFORE UPDATE ON public."OperationDigitalBatchItem"
FOR EACH ROW EXECUTE FUNCTION private.enforce_critical_identity_immutability();

DROP TRIGGER IF EXISTS "OperationFinishedGoodUnit_identity_immutable" ON public."OperationFinishedGoodUnit";
CREATE TRIGGER "OperationFinishedGoodUnit_identity_immutable"
BEFORE UPDATE ON public."OperationFinishedGoodUnit"
FOR EACH ROW EXECUTE FUNCTION private.enforce_critical_identity_immutability();

DROP TRIGGER IF EXISTS "OperationFinishedGoodUnit_identity_coherence" ON public."OperationFinishedGoodUnit";
CREATE TRIGGER "OperationFinishedGoodUnit_identity_coherence"
BEFORE INSERT OR UPDATE OF "digitalBatchItemId", "chipId"
ON public."OperationFinishedGoodUnit"
FOR EACH ROW EXECUTE FUNCTION private.enforce_finished_unit_identity_coherence();

-- Historical activated rows predate activatedAt. Preserve their identity and
-- derive the missing timestamp from the row's own audit timestamps.
UPDATE public."Chip"
SET "activatedAt" = COALESCE("updatedAt", "createdAt")
WHERE status = 'activated'
  AND "accountId" IS NOT NULL
  AND "assignedProfileId" IS NOT NULL
  AND "activatedAt" IS NULL;

ALTER TABLE public."Chip"
  DROP CONSTRAINT IF EXISTS "Chip_activated_identity_check",
  ADD CONSTRAINT "Chip_activated_identity_check"
  CHECK (
    status <> 'activated'
    OR ("accountId" IS NOT NULL AND "assignedProfileId" IS NOT NULL AND "activatedAt" IS NOT NULL)
  ) NOT VALID;
ALTER TABLE public."Chip" VALIDATE CONSTRAINT "Chip_activated_identity_check";

ALTER TABLE public."OperationFinishedGoodUnit"
  DROP CONSTRAINT IF EXISTS "OperationFinishedGoodUnit_activation_check",
  ADD CONSTRAINT "OperationFinishedGoodUnit_activation_check"
  CHECK (
    ("activationStatus" <> 'activated' OR "activatedAt" IS NOT NULL)
    AND (status <> 'activated' OR ("activationStatus" = 'activated' AND "activatedAt" IS NOT NULL))
  ) NOT VALID;
ALTER TABLE public."OperationFinishedGoodUnit"
  VALIDATE CONSTRAINT "OperationFinishedGoodUnit_activation_check";

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  REVOKE ALL ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon, authenticated;
