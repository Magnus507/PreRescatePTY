ALTER TABLE "Drop"
  ADD COLUMN "displayOrder" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "DropPassGrantCode" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "campaign" TEXT NOT NULL,
  "createdByUserId" TEXT NOT NULL,
  "claimedByUserId" TEXT,
  "claimedAt" TIMESTAMP(3),
  "redeemedPassId" TEXT,
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DropPassGrantCode_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "DropPassGrantCode_claim_state_consistency" CHECK (
    (
      ("claimedAt" IS NULL AND "claimedByUserId" IS NULL AND "redeemedPassId" IS NULL)
      OR
      ("claimedAt" IS NOT NULL AND "claimedByUserId" IS NOT NULL AND "redeemedPassId" IS NOT NULL)
    )
    AND NOT ("claimedAt" IS NOT NULL AND "revokedAt" IS NOT NULL)
  )
);

CREATE UNIQUE INDEX "DropPassGrantCode_code_key"
  ON "DropPassGrantCode"("code");

CREATE UNIQUE INDEX "DropPassGrantCode_redeemedPassId_key"
  ON "DropPassGrantCode"("redeemedPassId");

CREATE INDEX "DropPassGrantCode_claimedAt_revokedAt_idx"
  ON "DropPassGrantCode"("claimedAt", "revokedAt");

CREATE INDEX "DropPassGrantCode_createdAt_idx"
  ON "DropPassGrantCode"("createdAt");

CREATE INDEX "Drop_displayOrder_createdAt_idx"
  ON "Drop"("displayOrder", "createdAt");

ALTER TABLE "DropPassGrantCode"
  ADD CONSTRAINT "DropPassGrantCode_redeemedPassId_fkey"
  FOREIGN KEY ("redeemedPassId") REFERENCES "DropPass"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

REVOKE ALL PRIVILEGES ON TABLE public."DropPassGrantCode" FROM anon, authenticated;
ALTER TABLE public."DropPassGrantCode" ENABLE ROW LEVEL SECURITY;
