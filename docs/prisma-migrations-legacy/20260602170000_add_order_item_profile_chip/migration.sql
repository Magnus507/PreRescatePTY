-- Add profileId and chipId columns to OrderItem
ALTER TABLE "OrderItem"
ADD COLUMN "profileId" TEXT;

ALTER TABLE "OrderItem"
ADD COLUMN "chipId" TEXT;

-- Create indexes
CREATE INDEX "OrderItem_profileId_idx" ON "OrderItem"("profileId");
CREATE INDEX "OrderItem_chipId_idx" ON "OrderItem"("chipId");

-- Add foreign key constraints
ALTER TABLE "OrderItem"
ADD CONSTRAINT "OrderItem_profileId_fkey"
FOREIGN KEY ("profileId") REFERENCES "Profile"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "OrderItem"
ADD CONSTRAINT "OrderItem_chipId_fkey"
FOREIGN KEY ("chipId") REFERENCES "Chip"("id")
ON DELETE SET NULL ON UPDATE CASCADE;