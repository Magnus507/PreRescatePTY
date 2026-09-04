CREATE TABLE "StorageCleanupOutbox" (
  "id" TEXT NOT NULL,
  "objectKey" TEXT NOT NULL,
  "bucket" TEXT NOT NULL,
  "path" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lockedAt" TIMESTAMP(3),
  "lockedBy" TEXT,
  "lastErrorMessage" TEXT,
  "actorUserId" TEXT,
  "accountId" TEXT,
  "cleanedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "StorageCleanupOutbox_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StorageCleanupOutbox_objectKey_key"
  ON "StorageCleanupOutbox"("objectKey");
CREATE INDEX "StorageCleanupOutbox_status_availableAt_idx"
  ON "StorageCleanupOutbox"("status", "availableAt");
CREATE INDEX "StorageCleanupOutbox_lockedAt_idx"
  ON "StorageCleanupOutbox"("lockedAt");
