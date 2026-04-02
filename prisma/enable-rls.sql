-- enable-rls.sql
-- Run this snippet in the Supabase SQL Editor to resolve the 15 "Row Level Security (RLS) is disabled" warnings in Security Advisor.
-- Prisma connects via the postgres role which bypasses RLS, so this doesn't break our backend interactions.

ALTER TABLE "Account" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Package" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Profile" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EmergencyContact" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Chip" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Organization" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "OrganizationMember" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ChipClaimToken" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ScanEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Consent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Notification" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Order" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AdminUser" ENABLE ROW LEVEL SECURITY;

-- Optional: Create a generic policy to allow read/write for Prisma if it wasn't using postgres role,
-- but since Prisma uses the postgres role, that's already covered by BYPASSRLS.
