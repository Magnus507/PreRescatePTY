-- Migration: add_product_fields
-- Purpose: Add productType, estimatedProductionTime, requiresPersonalization to Product table
-- Scope: ONLY Product table - no other tables affected

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'Product' AND column_name = 'productType'
  ) THEN
    ALTER TABLE "Product" ADD COLUMN "productType" TEXT NOT NULL DEFAULT 'otro';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'Product' AND column_name = 'estimatedProductionTime'
  ) THEN
    ALTER TABLE "Product" ADD COLUMN "estimatedProductionTime" TEXT;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'Product' AND column_name = 'requiresPersonalization'
  ) THEN
    ALTER TABLE "Product" ADD COLUMN "requiresPersonalization" BOOLEAN NOT NULL DEFAULT false;
  END IF;
END $$;