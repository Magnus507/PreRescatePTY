-- Block 3 privacy remediation: remove historical PII copies while preserving
-- the minimum operational/audit facts required by the application.

-- Audit facts (actor/entity/action/result/timestamp) remain; historical before/
-- after snapshots are not required and previously contained identity/health PII.
UPDATE "AuditLog"
SET "oldValuesJson" = NULL,
    "newValuesJson" = NULL
WHERE "oldValuesJson" IS NOT NULL OR "newValuesJson" IS NOT NULL;

-- Consent evidence retains the consent fact/version, but raw network/device
-- fingerprints are not required for normal product operation.
UPDATE "Consent"
SET "ipAddress" = NULL,
    "userAgent" = NULL
WHERE "ipAddress" IS NOT NULL OR "userAgent" IS NOT NULL;

-- Historical dispatch/order events must not keep duplicated customer/shipping
-- snapshots. Structured event type/reference/quantity/timestamp remain intact.
UPDATE "OperationDispatchEvent"
SET "metadataJson" = NULL
WHERE "metadataJson" IS NOT NULL
  AND "metadataJson" ~* '"(customer(Name|Email|Phone)|shipping(Address|City|Notes)|destination(Name|Address|Reference)|buyer(Name|Email|Phone|Document|Address))"';

UPDATE "OperationCommercialOrderEvent"
SET "metadataJson" = NULL
WHERE "metadataJson" IS NOT NULL
  AND "metadataJson" ~* '"(customer(Name|Email|Phone)|shipping(Address|City|Notes)|destination(Name|Address|Reference)|buyer(Name|Email|Phone|Document|Address))"';

-- Legacy commerce sync rows carried full customer snapshots. Active/retryable
-- rows retain only the source pointer needed to reconstruct from Order; terminal
-- rows retain no source payload copy.
UPDATE "CommerceOrderSyncOutbox"
SET "payloadVersion" = 2,
    "payloadJson" = CASE
      WHEN "status" IN ('pending', 'retrying', 'processing')
        THEN json_build_object(
          'version', 2,
          'sourceType', "sourceType",
          'sourceId', "sourceId"
        )::text
      ELSE '{"version":2,"redacted":true}'
    END;

-- A completed Storage cleanup receipt must not itself retain a historical user
-- path or actor/account lineage. Row id/status/timestamps remain for operations.
UPDATE "StorageCleanupOutbox"
SET "objectKey" = 'erased:' || "id",
    "bucket" = 'erased',
    "path" = 'erased/' || "id",
    "actorUserId" = NULL,
    "accountId" = NULL,
    "lastErrorMessage" = NULL
WHERE "status" = 'cleaned';
