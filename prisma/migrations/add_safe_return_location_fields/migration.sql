-- Migration: add_safe_return_location_fields
-- Adds columns for Safe Return real feature to Profile table

ALTER TABLE "Profile"
  ADD COLUMN IF NOT EXISTS "safeReturnLocationName" TEXT,
  ADD COLUMN IF NOT EXISTS "safeReturnAddress" TEXT,
  ADD COLUMN IF NOT EXISTS "safeReturnLat" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "safeReturnLng" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "safeReturnContactName" TEXT,
  ADD COLUMN IF NOT EXISTS "safeReturnContactPhone" TEXT,
  ADD COLUMN IF NOT EXISTS "showSafeReturnLocationPublic" BOOLEAN NOT NULL DEFAULT false;
