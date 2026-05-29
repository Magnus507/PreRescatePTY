CREATE TABLE IF NOT EXISTS "CorporatePublicProfile" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "shortCode" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'draft',

  "logoUrl" TEXT,
  "displayName" TEXT,
  "legalName" TEXT,
  "ruc" TEXT,
  "foundedYear" INTEGER,
  "industry" TEXT,
  "description" TEXT,
  "slogan" TEXT,

  "phone" TEXT,
  "whatsapp" TEXT,
  "email" TEXT,
  "website" TEXT,
  "address" TEXT,
  "mapUrl" TEXT,
  "businessHours" TEXT,

  "instagram" TEXT,
  "facebook" TEXT,
  "linkedin" TEXT,
  "tiktok" TEXT,
  "xTwitter" TEXT,
  "youtube" TEXT,

  "mainServices" TEXT,
  "mainProducts" TEXT,
  "branches" TEXT,
  "contactPerson" TEXT,
  "contactDepartment" TEXT,
  "certifications" TEXT,
  "licenses" TEXT,
  "operationNotice" TEXT,

  "securityContactName" TEXT,
  "securityPhone" TEXT,
  "emergencyProcedure" TEXT,
  "meetingPoint" TEXT,
  "receptionPhone" TEXT,
  "corporateWhatsapp" TEXT,

  "customEmployeeMessage" TEXT,
  "showCompanyCode" BOOLEAN NOT NULL DEFAULT false,

  "showLogo" BOOLEAN NOT NULL DEFAULT true,
  "showDisplayName" BOOLEAN NOT NULL DEFAULT true,
  "showLegalName" BOOLEAN NOT NULL DEFAULT false,
  "showRuc" BOOLEAN NOT NULL DEFAULT false,
  "showFoundedYear" BOOLEAN NOT NULL DEFAULT false,
  "showIndustry" BOOLEAN NOT NULL DEFAULT true,
  "showDescription" BOOLEAN NOT NULL DEFAULT true,
  "showSlogan" BOOLEAN NOT NULL DEFAULT true,
  "showPhone" BOOLEAN NOT NULL DEFAULT false,
  "showWhatsapp" BOOLEAN NOT NULL DEFAULT false,
  "showEmail" BOOLEAN NOT NULL DEFAULT false,
  "showWebsite" BOOLEAN NOT NULL DEFAULT false,
  "showAddress" BOOLEAN NOT NULL DEFAULT false,
  "showMapUrl" BOOLEAN NOT NULL DEFAULT false,
  "showBusinessHours" BOOLEAN NOT NULL DEFAULT false,
  "showInstagram" BOOLEAN NOT NULL DEFAULT false,
  "showFacebook" BOOLEAN NOT NULL DEFAULT false,
  "showLinkedin" BOOLEAN NOT NULL DEFAULT false,
  "showTiktok" BOOLEAN NOT NULL DEFAULT false,
  "showXTwitter" BOOLEAN NOT NULL DEFAULT false,
  "showYoutube" BOOLEAN NOT NULL DEFAULT false,
  "showMainServices" BOOLEAN NOT NULL DEFAULT false,
  "showMainProducts" BOOLEAN NOT NULL DEFAULT false,
  "showBranches" BOOLEAN NOT NULL DEFAULT false,
  "showContactPerson" BOOLEAN NOT NULL DEFAULT false,
  "showContactDepartment" BOOLEAN NOT NULL DEFAULT false,
  "showCertifications" BOOLEAN NOT NULL DEFAULT false,
  "showLicenses" BOOLEAN NOT NULL DEFAULT false,
  "showOperationNotice" BOOLEAN NOT NULL DEFAULT false,
  "showSecurityContactName" BOOLEAN NOT NULL DEFAULT false,
  "showSecurityPhone" BOOLEAN NOT NULL DEFAULT false,
  "showEmergencyProcedure" BOOLEAN NOT NULL DEFAULT false,
  "showMeetingPoint" BOOLEAN NOT NULL DEFAULT false,
  "showReceptionPhone" BOOLEAN NOT NULL DEFAULT false,
  "showCorporateWhatsapp" BOOLEAN NOT NULL DEFAULT false,
  "showCustomEmployeeMessage" BOOLEAN NOT NULL DEFAULT true,

  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "CorporatePublicProfile_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "CorporatePublicProfile_organizationId_key"
ON "CorporatePublicProfile"("organizationId");

CREATE UNIQUE INDEX IF NOT EXISTS "CorporatePublicProfile_shortCode_key"
ON "CorporatePublicProfile"("shortCode");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'CorporatePublicProfile_organizationId_fkey'
  ) THEN
    ALTER TABLE "CorporatePublicProfile"
    ADD CONSTRAINT "CorporatePublicProfile_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;