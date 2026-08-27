-- A printed identity must resolve to exactly one Chip, and a finished unit must
-- retain that same identity throughout its lifecycle.
ALTER TABLE "OperationDigitalBatchItem"
ADD COLUMN "chipId" TEXT;

ALTER TABLE "OperationFinishedGoodUnit"
ADD COLUMN "chipId" TEXT;

-- Recover existing links conservatively. Public short codes are unique in both
-- tables, while the finished unit inherits the identity from its digital item.
UPDATE "OperationDigitalBatchItem" AS item
SET "chipId" = chip."id"
FROM "Chip" AS chip
WHERE item."chipId" IS NULL
  AND item."shortCode" IS NOT NULL
  AND chip."shortCode" = item."shortCode";

UPDATE "OperationFinishedGoodUnit" AS unit
SET "chipId" = item."chipId"
FROM "OperationDigitalBatchItem" AS item
WHERE unit."chipId" IS NULL
  AND unit."digitalBatchItemId" = item."id"
  AND item."chipId" IS NOT NULL;

CREATE UNIQUE INDEX "OperationDigitalBatchItem_chipId_key"
ON "OperationDigitalBatchItem"("chipId");

CREATE UNIQUE INDEX "OperationFinishedGoodUnit_chipId_key"
ON "OperationFinishedGoodUnit"("chipId");

ALTER TABLE "OperationDigitalBatchItem"
ADD CONSTRAINT "OperationDigitalBatchItem_chipId_fkey"
FOREIGN KEY ("chipId") REFERENCES "Chip"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "OperationFinishedGoodUnit"
ADD CONSTRAINT "OperationFinishedGoodUnit_chipId_fkey"
FOREIGN KEY ("chipId") REFERENCES "Chip"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
