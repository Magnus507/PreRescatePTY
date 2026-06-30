ALTER TABLE "Profile"
  ADD COLUMN IF NOT EXISTS "isInsured" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "insuranceProvider" TEXT,
  ADD COLUMN IF NOT EXISTS "insurancePolicyNumber" TEXT,
  ADD COLUMN IF NOT EXISTS "preferredHospital" TEXT,
  ADD COLUMN IF NOT EXISTS "insuranceEmergencyPhone" TEXT,
  ADD COLUMN IF NOT EXISTS "primaryDoctorName" TEXT,
  ADD COLUMN IF NOT EXISTS "primaryDoctorPhone" TEXT,
  ADD COLUMN IF NOT EXISTS "showInsuranceProviderPublic" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "showPreferredHospitalPublic" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "showPrimaryDoctorPublic" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "showPrimaryDoctorPhonePublic" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "showAdditionalNotesPublic" BOOLEAN NOT NULL DEFAULT false;
