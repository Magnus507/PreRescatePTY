ALTER TABLE "CorporateOrderEmployeeItem"
ADD COLUMN IF NOT EXISTS "chipId" TEXT;

ALTER TABLE "CorporateOrderEmployeeItem"
ADD COLUMN IF NOT EXISTS "fulfillmentStatus" TEXT NOT NULL DEFAULT 'pending_assignment';

ALTER TABLE "CorporateOrderEmployeeItem"
ADD COLUMN IF NOT EXISTS "activatedAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "CorporateOrderEmployeeItem_chipId_idx"
ON "CorporateOrderEmployeeItem"("chipId");

CREATE INDEX IF NOT EXISTS "CorporateOrderEmployeeItem_fulfillmentStatus_idx"
ON "CorporateOrderEmployeeItem"("fulfillmentStatus");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'CorporateOrderEmployeeItem_chipId_fkey'
  ) THEN
    ALTER TABLE "CorporateOrderEmployeeItem"
    ADD CONSTRAINT "CorporateOrderEmployeeItem_chipId_fkey"
    FOREIGN KEY ("chipId") REFERENCES "Chip"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;