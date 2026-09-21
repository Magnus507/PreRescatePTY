ALTER TABLE "Profile"
  ADD COLUMN "minorModuleEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "minorModuleData" TEXT,
  ADD COLUMN "elderModuleEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "elderModuleData" TEXT,
  ADD COLUMN "specialNeedsModuleEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "specialNeedsModuleData" TEXT,
  ADD COLUMN "petModuleEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "petModuleData" TEXT,
  ADD COLUMN "workModuleEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "workModuleData" TEXT;
