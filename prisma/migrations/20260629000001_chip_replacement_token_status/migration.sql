-- Add status and expiresAt nullable to ChipClaimToken

ALTER TABLE "ChipClaimToken" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'active';
ALTER TABLE "ChipClaimToken" ALTER COLUMN "expiresAt" DROP NOT NULL;
