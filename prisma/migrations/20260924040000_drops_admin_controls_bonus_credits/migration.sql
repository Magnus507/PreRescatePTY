CREATE TABLE "DropBonusCredit" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "dropId" TEXT NOT NULL,
  "campaign" TEXT NOT NULL,
  "createdByUserId" TEXT NOT NULL,
  "claimedByUserId" TEXT,
  "claimedAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DropBonusCredit_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "DropBonusCredit_claim_state_consistency" CHECK (
    (("claimedAt" IS NULL AND "claimedByUserId" IS NULL)
      OR ("claimedAt" IS NOT NULL AND "claimedByUserId" IS NOT NULL))
    AND NOT ("claimedAt" IS NOT NULL AND "revokedAt" IS NOT NULL)
  )
);

ALTER TABLE "DropBonusEntry"
  ADD COLUMN "sourceBonusCreditId" TEXT;

CREATE UNIQUE INDEX "DropBonusCredit_code_key"
  ON "DropBonusCredit"("code");
CREATE INDEX "DropBonusCredit_dropId_claimedAt_revokedAt_idx"
  ON "DropBonusCredit"("dropId", "claimedAt", "revokedAt");
CREATE INDEX "DropBonusCredit_createdAt_idx"
  ON "DropBonusCredit"("createdAt");

CREATE UNIQUE INDEX "DropBonusEntry_sourceBonusCreditId_key"
  ON "DropBonusEntry"("sourceBonusCreditId");

ALTER TABLE "DropBonusCredit"
  ADD CONSTRAINT "DropBonusCredit_dropId_fkey"
  FOREIGN KEY ("dropId") REFERENCES "Drop"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "DropBonusEntry"
  ADD CONSTRAINT "DropBonusEntry_sourceBonusCreditId_fkey"
  FOREIGN KEY ("sourceBonusCreditId") REFERENCES "DropBonusCredit"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

REVOKE ALL PRIVILEGES ON TABLE public."DropBonusCredit" FROM anon, authenticated;
ALTER TABLE public."DropBonusCredit" ENABLE ROW LEVEL SECURITY;
