ALTER TABLE "OrderItem"
  ADD COLUMN IF NOT EXISTS "productId" TEXT,
  ADD COLUMN IF NOT EXISTS "productName" TEXT,
  ADD COLUMN IF NOT EXISTS "productCode" TEXT,
  ADD COLUMN IF NOT EXISTS "operationalMappingId" TEXT,
  ADD COLUMN IF NOT EXISTS "operationalMappingStatus" TEXT,
  ADD COLUMN IF NOT EXISTS "operationalFinishedGoodId" TEXT,
  ADD COLUMN IF NOT EXISTS "operationalProductCode" TEXT,
  ADD COLUMN IF NOT EXISTS "operationalProductName" TEXT;

CREATE INDEX IF NOT EXISTS "OrderItem_productId_idx"
  ON "OrderItem"("productId");

CREATE INDEX IF NOT EXISTS "OrderItem_operationalMappingId_idx"
  ON "OrderItem"("operationalMappingId");

CREATE INDEX IF NOT EXISTS "OrderItem_operationalFinishedGoodId_idx"
  ON "OrderItem"("operationalFinishedGoodId");

ALTER TABLE "OrderItem"
  ADD CONSTRAINT "OrderItem_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
