-- Add durable delivery, lease, idempotency and dead-letter metadata.
ALTER TABLE "Notification"
  ADD COLUMN "idempotencyKey" TEXT,
  ADD COLUMN "attempts" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "lockedAt" TIMESTAMP(3),
  ADD COLUMN "lockedBy" TEXT,
  ADD COLUMN "lastErrorCode" TEXT,
  ADD COLUMN "lastErrorMessage" TEXT,
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Existing notifications predate provider idempotency. Their row id is stable
-- and safe to use as a legacy key during migration.
UPDATE "Notification"
SET "idempotencyKey" = 'legacy:' || "id"
WHERE "idempotencyKey" IS NULL;

ALTER TABLE "Notification"
  ALTER COLUMN "idempotencyKey" SET NOT NULL;

-- Prisma's @updatedAt is maintained by the client and has no database default.
ALTER TABLE "Notification"
  ALTER COLUMN "updatedAt" DROP DEFAULT;

CREATE UNIQUE INDEX "Notification_idempotencyKey_key"
  ON "Notification"("idempotencyKey");
CREATE INDEX "Notification_status_availableAt_idx"
  ON "Notification"("status", "availableAt");
CREATE INDEX "Notification_lockedAt_idx"
  ON "Notification"("lockedAt");
CREATE INDEX "Notification_chipId_channel_recipient_createdAt_idx"
  ON "Notification"("chipId", "channel", "recipient", "createdAt");

DROP INDEX IF EXISTS "Notification_status_idx";
