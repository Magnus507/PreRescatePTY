CREATE TYPE "DropStatus" AS ENUM ('draft', 'active', 'goal_reached', 'closed', 'drawn', 'finalized');
CREATE TYPE "DropPassStatus" AS ENUM ('available', 'assigned', 'revoked');

CREATE TABLE "Drop" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "prizeLabel" TEXT NOT NULL,
  "imageUrl" TEXT,
  "targetPasses" INTEGER NOT NULL,
  "status" "DropStatus" NOT NULL DEFAULT 'draft',
  "opensAt" TIMESTAMP(3),
  "goalReachedAt" TIMESTAMP(3),
  "closedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Drop_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Drop_targetPasses_positive" CHECK ("targetPasses" > 0)
);

CREATE TABLE "DropPass" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "sourceOrderId" TEXT NOT NULL,
  "sourceOrdinal" INTEGER NOT NULL,
  "status" "DropPassStatus" NOT NULL DEFAULT 'available',
  "dropId" TEXT,
  "earnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "assignedAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DropPass_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "DropPass_sourceOrdinal_positive" CHECK ("sourceOrdinal" > 0),
  CONSTRAINT "DropPass_state_consistency" CHECK (
    ("status" = 'available' AND "dropId" IS NULL AND "assignedAt" IS NULL AND "revokedAt" IS NULL)
    OR ("status" = 'assigned' AND "dropId" IS NOT NULL AND "assignedAt" IS NOT NULL AND "revokedAt" IS NULL)
    OR ("status" = 'revoked' AND "revokedAt" IS NOT NULL)
  )
);

CREATE TABLE "DropBonusEntry" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "dropId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "createdByUserId" TEXT NOT NULL,
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DropBonusEntry_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DropDraw" (
  "id" TEXT NOT NULL,
  "dropId" TEXT NOT NULL,
  "entryCount" INTEGER NOT NULL,
  "purchaseEntryCount" INTEGER NOT NULL,
  "bonusEntryCount" INTEGER NOT NULL,
  "manifestHash" TEXT NOT NULL,
  "randomHex" TEXT NOT NULL,
  "winnerIndex" INTEGER NOT NULL,
  "winnerEntryKind" TEXT NOT NULL,
  "winnerEntryId" TEXT NOT NULL,
  "winnerEntryCode" TEXT NOT NULL,
  "winnerUserId" TEXT NOT NULL,
  "drawnByUserId" TEXT NOT NULL,
  "drawnAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DropDraw_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "DropDraw_entryCount_positive" CHECK ("entryCount" > 0),
  CONSTRAINT "DropDraw_winnerIndex_valid" CHECK ("winnerIndex" >= 0 AND "winnerIndex" < "entryCount")
);

CREATE UNIQUE INDEX "Drop_slug_key" ON "Drop"("slug");
CREATE INDEX "Drop_status_createdAt_idx" ON "Drop"("status", "createdAt");

CREATE UNIQUE INDEX "DropPass_code_key" ON "DropPass"("code");
CREATE UNIQUE INDEX "DropPass_sourceOrderId_sourceOrdinal_key" ON "DropPass"("sourceOrderId", "sourceOrdinal");
CREATE INDEX "DropPass_userId_status_idx" ON "DropPass"("userId", "status");
CREATE INDEX "DropPass_dropId_status_idx" ON "DropPass"("dropId", "status");
CREATE INDEX "DropPass_sourceOrderId_idx" ON "DropPass"("sourceOrderId");

CREATE UNIQUE INDEX "DropBonusEntry_code_key" ON "DropBonusEntry"("code");
CREATE INDEX "DropBonusEntry_dropId_revokedAt_idx" ON "DropBonusEntry"("dropId", "revokedAt");
CREATE INDEX "DropBonusEntry_userId_revokedAt_idx" ON "DropBonusEntry"("userId", "revokedAt");

CREATE UNIQUE INDEX "DropDraw_dropId_key" ON "DropDraw"("dropId");
CREATE INDEX "DropDraw_winnerUserId_idx" ON "DropDraw"("winnerUserId");
CREATE INDEX "DropDraw_drawnAt_idx" ON "DropDraw"("drawnAt");

ALTER TABLE "DropPass"
  ADD CONSTRAINT "DropPass_dropId_fkey"
  FOREIGN KEY ("dropId") REFERENCES "Drop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "DropBonusEntry"
  ADD CONSTRAINT "DropBonusEntry_dropId_fkey"
  FOREIGN KEY ("dropId") REFERENCES "Drop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "DropDraw"
  ADD CONSTRAINT "DropDraw_dropId_fkey"
  FOREIGN KEY ("dropId") REFERENCES "Drop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

REVOKE ALL PRIVILEGES ON TABLE public."Drop" FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public."DropPass" FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public."DropBonusEntry" FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public."DropDraw" FROM anon, authenticated;

ALTER TABLE public."Drop" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."DropPass" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."DropBonusEntry" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."DropDraw" ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION private.prevent_drop_draw_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public, private
AS $$
BEGIN
  RAISE EXCEPTION 'DropDraw is immutable once created';
END;
$$;

REVOKE ALL ON FUNCTION private.prevent_drop_draw_mutation() FROM PUBLIC;

CREATE TRIGGER "DropDraw_immutable"
BEFORE UPDATE OR DELETE ON public."DropDraw"
FOR EACH ROW
EXECUTE FUNCTION private.prevent_drop_draw_mutation();
