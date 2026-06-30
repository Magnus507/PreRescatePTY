ALTER TABLE "Order"
ADD COLUMN IF NOT EXISTS "organizationId" TEXT;

ALTER TABLE "Order"
ADD COLUMN IF NOT EXISTS "orderType" TEXT NOT NULL DEFAULT 'manual';

CREATE TABLE IF NOT EXISTS "CorporateOrderEmployeeItem" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "organizationMemberId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "unitPrice" DOUBLE PRECISION NOT NULL,
  "subtotal" DOUBLE PRECISION NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "CorporateOrderEmployeeItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "CorporateOrderEmployeeItem_orderId_idx"
ON "CorporateOrderEmployeeItem"("orderId");

CREATE INDEX IF NOT EXISTS "CorporateOrderEmployeeItem_organizationMemberId_idx"
ON "CorporateOrderEmployeeItem"("organizationMemberId");

CREATE INDEX IF NOT EXISTS "CorporateOrderEmployeeItem_productId_idx"
ON "CorporateOrderEmployeeItem"("productId");

CREATE INDEX IF NOT EXISTS "Order_organizationId_idx"
ON "Order"("organizationId");

CREATE INDEX IF NOT EXISTS "Order_orderType_idx"
ON "Order"("orderType");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'Order_organizationId_fkey'
  ) THEN
    ALTER TABLE "Order"
    ADD CONSTRAINT "Order_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'CorporateOrderEmployeeItem_orderId_fkey'
  ) THEN
    ALTER TABLE "CorporateOrderEmployeeItem"
    ADD CONSTRAINT "CorporateOrderEmployeeItem_orderId_fkey"
    FOREIGN KEY ("orderId") REFERENCES "Order"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'CorporateOrderEmployeeItem_organizationMemberId_fkey'
  ) THEN
    ALTER TABLE "CorporateOrderEmployeeItem"
    ADD CONSTRAINT "CorporateOrderEmployeeItem_organizationMemberId_fkey"
    FOREIGN KEY ("organizationMemberId") REFERENCES "OrganizationMember"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'CorporateOrderEmployeeItem_productId_fkey'
  ) THEN
    ALTER TABLE "CorporateOrderEmployeeItem"
    ADD CONSTRAINT "CorporateOrderEmployeeItem_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "Product"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;