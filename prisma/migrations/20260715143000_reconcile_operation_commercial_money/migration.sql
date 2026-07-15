-- Reconcile commercial operation monetary columns with Prisma schema
ALTER TABLE "OperationCommercialOrderEvent"
  ALTER COLUMN "amount" TYPE DECIMAL(18, 2) USING ROUND("amount"::numeric, 2);

ALTER TABLE "OperationCommercialOrderItem"
  ALTER COLUMN "unitPrice" TYPE DECIMAL(18, 2) USING ROUND("unitPrice"::numeric, 2),
  ALTER COLUMN "totalPrice" TYPE DECIMAL(18, 2) USING ROUND("totalPrice"::numeric, 2);
