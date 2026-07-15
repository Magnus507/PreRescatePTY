-- Convert critical monetary columns from DOUBLE PRECISION to DECIMAL(18,2)
ALTER TABLE "Product"
  ALTER COLUMN "price" TYPE DECIMAL(18, 2) USING ROUND("price"::numeric, 2);

ALTER TABLE "Package"
  ALTER COLUMN "price" TYPE DECIMAL(18, 2) USING ROUND("price"::numeric, 2);

ALTER TABLE "Order"
  ALTER COLUMN "amount" TYPE DECIMAL(18, 2) USING ROUND("amount"::numeric, 2);

ALTER TABLE "OrderItem"
  ALTER COLUMN "unitPrice" TYPE DECIMAL(18, 2) USING ROUND("unitPrice"::numeric, 2),
  ALTER COLUMN "totalPrice" TYPE DECIMAL(18, 2) USING ROUND("totalPrice"::numeric, 2);

ALTER TABLE "CorporateOrderEmployeeItem"
  ALTER COLUMN "unitPrice" TYPE DECIMAL(18, 2) USING ROUND("unitPrice"::numeric, 2),
  ALTER COLUMN "subtotal" TYPE DECIMAL(18, 2) USING ROUND("subtotal"::numeric, 2);

ALTER TABLE "CorporateProductRequestItem"
  ALTER COLUMN "unitPrice" TYPE DECIMAL(18, 2) USING ROUND("unitPrice"::numeric, 2),
  ALTER COLUMN "subtotal" TYPE DECIMAL(18, 2) USING ROUND("subtotal"::numeric, 2);

ALTER TABLE "OperationCommercialOrder"
  ALTER COLUMN "totalAmount" TYPE DECIMAL(18, 2) USING ROUND("totalAmount"::numeric, 2);
