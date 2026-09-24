CREATE TABLE "RewardMission" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "imageUrl" TEXT,
  "kind" TEXT NOT NULL,
  "rewardCredits" INTEGER NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "startsAt" TIMESTAMP(3),
  "endsAt" TIMESTAMP(3),
  "createdByUserId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RewardMission_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "RewardMission_kind_check" CHECK ("kind" IN ('profile_complete', 'first_device_activated', 'first_paid_order')),
  CONSTRAINT "RewardMission_status_check" CHECK ("status" IN ('draft', 'active', 'paused', 'archived')),
  CONSTRAINT "RewardMission_rewardCredits_check" CHECK ("rewardCredits" BETWEEN 1 AND 50),
  CONSTRAINT "RewardMission_dates_check" CHECK ("endsAt" IS NULL OR "startsAt" IS NULL OR "endsAt" > "startsAt")
);

CREATE TABLE "RewardMissionCompletion" (
  "id" TEXT NOT NULL,
  "missionId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RewardMissionCompletion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RewardCreditLedger" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "amount" INTEGER NOT NULL,
  "sourceKey" TEXT NOT NULL,
  "sourceType" TEXT NOT NULL,
  "sourceId" TEXT,
  "description" TEXT NOT NULL,
  "createdByUserId" TEXT,
  "dropBonusEntryId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RewardCreditLedger_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "RewardCreditLedger_amount_nonzero" CHECK ("amount" <> 0),
  CONSTRAINT "RewardCreditLedger_sourceType_check" CHECK ("sourceType" IN ('mission', 'admin', 'spend'))
);

CREATE TABLE "FoundingMember" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "founderNumber" SERIAL NOT NULL,
  "visible" BOOLEAN NOT NULL DEFAULT true,
  "note" TEXT,
  "grantedByUserId" TEXT NOT NULL,
  "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FoundingMember_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "FoundingMember_founderNumber_positive" CHECK ("founderNumber" > 0)
);

CREATE TABLE "CommunityUnlock" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "metricType" TEXT NOT NULL,
  "target" INTEGER NOT NULL,
  "unlockType" TEXT NOT NULL,
  "rewardTitle" TEXT NOT NULL,
  "rewardDescription" TEXT,
  "linkedDropId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "startsAt" TIMESTAMP(3),
  "endsAt" TIMESTAMP(3),
  "unlockedAt" TIMESTAMP(3),
  "createdByUserId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CommunityUnlock_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CommunityUnlock_metricType_check" CHECK ("metricType" IN ('activated_units', 'activated_members')),
  CONSTRAINT "CommunityUnlock_target_positive" CHECK ("target" > 0),
  CONSTRAINT "CommunityUnlock_unlockType_check" CHECK ("unlockType" IN ('community_drop', 'limited_product', 'special_mission', 'event', 'platform_benefit')),
  CONSTRAINT "CommunityUnlock_status_check" CHECK ("status" IN ('draft', 'active', 'unlocked', 'archived')),
  CONSTRAINT "CommunityUnlock_dates_check" CHECK ("endsAt" IS NULL OR "startsAt" IS NULL OR "endsAt" > "startsAt"),
  CONSTRAINT "CommunityUnlock_drop_link_check" CHECK ("unlockType" <> 'community_drop' OR "linkedDropId" IS NOT NULL)
);

CREATE UNIQUE INDEX "RewardMission_slug_key" ON "RewardMission"("slug");
CREATE INDEX "RewardMission_status_createdAt_idx" ON "RewardMission"("status", "createdAt");
CREATE INDEX "RewardMission_kind_status_idx" ON "RewardMission"("kind", "status");

CREATE UNIQUE INDEX "RewardMissionCompletion_missionId_userId_key"
  ON "RewardMissionCompletion"("missionId", "userId");
CREATE INDEX "RewardMissionCompletion_userId_completedAt_idx"
  ON "RewardMissionCompletion"("userId", "completedAt");

CREATE UNIQUE INDEX "RewardCreditLedger_sourceKey_key" ON "RewardCreditLedger"("sourceKey");
CREATE UNIQUE INDEX "RewardCreditLedger_dropBonusEntryId_key" ON "RewardCreditLedger"("dropBonusEntryId");
CREATE INDEX "RewardCreditLedger_userId_createdAt_idx" ON "RewardCreditLedger"("userId", "createdAt");
CREATE INDEX "RewardCreditLedger_sourceType_sourceId_idx" ON "RewardCreditLedger"("sourceType", "sourceId");

CREATE UNIQUE INDEX "FoundingMember_userId_key" ON "FoundingMember"("userId");
CREATE UNIQUE INDEX "FoundingMember_founderNumber_key" ON "FoundingMember"("founderNumber");
CREATE INDEX "FoundingMember_founderNumber_idx" ON "FoundingMember"("founderNumber");
CREATE INDEX "FoundingMember_visible_grantedAt_idx" ON "FoundingMember"("visible", "grantedAt");

CREATE UNIQUE INDEX "CommunityUnlock_slug_key" ON "CommunityUnlock"("slug");
CREATE INDEX "CommunityUnlock_status_createdAt_idx" ON "CommunityUnlock"("status", "createdAt");
CREATE INDEX "CommunityUnlock_metricType_status_idx" ON "CommunityUnlock"("metricType", "status");
CREATE INDEX "CommunityUnlock_linkedDropId_idx" ON "CommunityUnlock"("linkedDropId");

ALTER TABLE "RewardMissionCompletion"
  ADD CONSTRAINT "RewardMissionCompletion_missionId_fkey"
  FOREIGN KEY ("missionId") REFERENCES "RewardMission"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "RewardCreditLedger"
  ADD CONSTRAINT "RewardCreditLedger_dropBonusEntryId_fkey"
  FOREIGN KEY ("dropBonusEntryId") REFERENCES "DropBonusEntry"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "CommunityUnlock"
  ADD CONSTRAINT "CommunityUnlock_linkedDropId_fkey"
  FOREIGN KEY ("linkedDropId") REFERENCES "Drop"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

REVOKE ALL PRIVILEGES ON TABLE public."RewardMission" FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public."RewardMissionCompletion" FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public."RewardCreditLedger" FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public."FoundingMember" FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public."CommunityUnlock" FROM anon, authenticated;

ALTER TABLE public."RewardMission" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."RewardMissionCompletion" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."RewardCreditLedger" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."FoundingMember" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."CommunityUnlock" ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION private.prevent_founding_member_identity_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public, private
AS $$
BEGIN
  IF NEW."userId" IS DISTINCT FROM OLD."userId"
     OR NEW."founderNumber" IS DISTINCT FROM OLD."founderNumber"
     OR NEW."grantedAt" IS DISTINCT FROM OLD."grantedAt" THEN
    RAISE EXCEPTION 'Founding Member identity is immutable once assigned';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.prevent_founding_member_identity_mutation() FROM PUBLIC;

CREATE TRIGGER "FoundingMember_identity_immutable"
BEFORE UPDATE ON public."FoundingMember"
FOR EACH ROW
EXECUTE FUNCTION private.prevent_founding_member_identity_mutation();
