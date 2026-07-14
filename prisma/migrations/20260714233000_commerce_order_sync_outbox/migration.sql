-- Add source identity to operational commercial orders
ALTER TABLE "OperationCommercialOrder"
  ADD COLUMN IF NOT EXISTS "sourceType" TEXT,
  ADD COLUMN IF NOT EXISTS "sourceId" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "OperationCommercialOrder_sourceType_sourceId_key"
  ON "OperationCommercialOrder"("sourceType", "sourceId");

CREATE INDEX IF NOT EXISTS "OperationCommercialOrder_sourceType_sourceId_idx"
  ON "OperationCommercialOrder"("sourceType", "sourceId");

-- Durable outbox for Commerce -> Operations sync
CREATE TABLE IF NOT EXISTS "CommerceOrderSyncOutbox" (
  "id" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "sourceType" TEXT NOT NULL,
  "sourceId" TEXT NOT NULL,
  "deduplicationKey" TEXT NOT NULL,
  "payloadVersion" INTEGER NOT NULL DEFAULT 1,
  "payloadJson" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lockedAt" TIMESTAMP(3),
  "lockedBy" TEXT,
  "processedAt" TIMESTAMP(3),
  "lastErrorCode" TEXT,
  "lastErrorMessage" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "CommerceOrderSyncOutbox_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "CommerceOrderSyncOutbox_deduplicationKey_key"
  ON "CommerceOrderSyncOutbox"("deduplicationKey");

CREATE INDEX IF NOT EXISTS "CommerceOrderSyncOutbox_status_availableAt_idx"
  ON "CommerceOrderSyncOutbox"("status", "availableAt");

CREATE INDEX IF NOT EXISTS "CommerceOrderSyncOutbox_sourceType_sourceId_idx"
  ON "CommerceOrderSyncOutbox"("sourceType", "sourceId");

CREATE INDEX IF NOT EXISTS "CommerceOrderSyncOutbox_lockedAt_idx"
  ON "CommerceOrderSyncOutbox"("lockedAt");

CREATE INDEX IF NOT EXISTS "CommerceOrderSyncOutbox_createdAt_idx"
  ON "CommerceOrderSyncOutbox"("createdAt");
