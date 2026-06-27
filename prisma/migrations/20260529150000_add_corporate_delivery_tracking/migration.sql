-- Add internal delivery tracking fields to CorporateOrderEmployeeItem

ALTER TABLE "CorporateOrderEmployeeItem" ADD COLUMN IF NOT EXISTS "deliveryStatus" TEXT DEFAULT 'pending';
ALTER TABLE "CorporateOrderEmployeeItem" ADD COLUMN IF NOT EXISTS "deliveredAt" TIMESTAMP(3);
ALTER TABLE "CorporateOrderEmployeeItem" ADD COLUMN IF NOT EXISTS "deliveredByUserId" TEXT;
ALTER TABLE "CorporateOrderEmployeeItem" ADD COLUMN IF NOT EXISTS "receivedByUserId" TEXT;
ALTER TABLE "CorporateOrderEmployeeItem" ADD COLUMN IF NOT EXISTS "deliveryEvidenceUrl" TEXT;
ALTER TABLE "CorporateOrderEmployeeItem" ADD COLUMN IF NOT EXISTS "deliveryNote" TEXT;

-- Create index for delivery status queries
CREATE INDEX IF NOT EXISTS "CorporateOrderEmployeeItem_deliveryStatus_idx" ON "CorporateOrderEmployeeItem"("deliveryStatus");
