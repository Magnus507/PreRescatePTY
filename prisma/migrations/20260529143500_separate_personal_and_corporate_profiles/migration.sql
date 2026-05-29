-- P1: Separate personal and corporate medical profiles
-- Add profileType to Profile
-- Add corporateProfileId to OrganizationMember

-- Profile: add profile type
ALTER TABLE "Profile" ADD COLUMN IF NOT EXISTS "profileType" TEXT NOT NULL DEFAULT 'personal';

-- OrganizationMember: add corporateProfileId
ALTER TABLE "OrganizationMember" ADD COLUMN IF NOT EXISTS "corporateProfileId" TEXT;

-- Add unique constraint on corporateProfileId
CREATE UNIQUE INDEX IF NOT EXISTS "OrganizationMember_corporateProfileId_key" ON "OrganizationMember"("corporateProfileId");

-- Add FK constraint
ALTER TABLE "OrganizationMember" ADD CONSTRAINT "OrganizationMember_corporateProfileId_fkey" FOREIGN KEY ("corporateProfileId") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
