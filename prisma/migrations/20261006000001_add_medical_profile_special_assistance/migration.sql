-- AlterTable: Add special assistance fields to Profile
ALTER TABLE "Profile" ADD COLUMN     "hasCognitiveImpairment" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "hasWanderingRisk" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isNonVerbal" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "communicationAssistance" TEXT,
ADD COLUMN     "safeReturnInstructions" TEXT,
ADD COLUMN     "showVulnerabilityStatusPublic" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "showCommunicationStatusPublic" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "showSafeReturnPublic" BOOLEAN NOT NULL DEFAULT false;