-- Migration: add_manual_payment_fields
-- Purpose: Add manual payment fields to Order table for Yappy/bank transfer workflow
-- Scope: ONLY Order table - no other tables affected

-- Add manualPaymentReference column (for Yappy/transfer reference number)
-- Using TEXT NULL to be safe with existing data
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'Order' AND column_name = 'manualPaymentReference'
  ) THEN
    ALTER TABLE "Order" ADD COLUMN "manualPaymentReference" TEXT NULL;
  END IF;
END $$;

-- Add packageId column (FK to Package for package activation)
-- Using TEXT NULL to be safe with existing data
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'Order' AND column_name = 'packageId'
  ) THEN
    ALTER TABLE "Order" ADD COLUMN "packageId" TEXT NULL;
  END IF;
END $$;

-- Create index on packageId for performance
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'Order' AND indexname = 'Order_packageId_idx'
  ) THEN
    CREATE INDEX "Order_packageId_idx" ON "Order"("packageId");
  END IF;
END $$;

-- Add foreign key constraint from packageId to Package(id)
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'Order_packageId_fkey'
  ) THEN
    ALTER TABLE "Order" ADD CONSTRAINT "Order_packageId_fkey" 
    FOREIGN KEY ("packageId") REFERENCES "Package"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;