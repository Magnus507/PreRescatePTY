-- Migration: add_company_code_and_corporate_fields
-- Purpose: Add companyCode to Organization and corporate fields to OrganizationMember for employee request workflow

ALTER TABLE "Organization"
  ADD COLUMN "companyCode" TEXT UNIQUE;

ALTER TABLE "OrganizationMember"
  ADD COLUMN "corporateStatus" TEXT NOT NULL DEFAULT 'pending_company_review',
  ADD COLUMN "employeeNationalId" TEXT,
  ADD COLUMN "employeeAge" INTEGER,
  ADD COLUMN "employeePhone" TEXT,
  ADD COLUMN "employeePosition" TEXT,
  ADD COLUMN "employeeDepartment" TEXT,
  ADD COLUMN "employeeInternalId" TEXT,
  ADD COLUMN "employeeNote" TEXT;