-- Add corporate delivery tracking fields to Order table
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "corporateDeliveryStatus" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "estimatedDeliveryDate" TIMESTAMP(3);
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "deliveryNote" TEXT;