ALTER TABLE "Drop"
  ADD COLUMN "archivedAt" TIMESTAMP(3),
  ADD COLUMN "archivedByUserId" TEXT;

CREATE INDEX "Drop_archivedAt_displayOrder_createdAt_idx"
  ON "Drop"("archivedAt", "displayOrder", "createdAt");

ALTER TABLE "DropBonusCredit"
  ALTER COLUMN "dropId" DROP NOT NULL,
  ADD COLUMN "creditAmount" INTEGER NOT NULL DEFAULT 1;

ALTER TABLE "DropBonusCredit"
  ADD CONSTRAINT "DropBonusCredit_creditAmount_check"
  CHECK ("creditAmount" BETWEEN 1 AND 100);
