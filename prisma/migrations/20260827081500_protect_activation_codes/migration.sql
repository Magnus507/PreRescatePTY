ALTER TABLE "ChipClaimToken"
  ADD COLUMN "activationCodeHash" TEXT,
  ADD COLUMN "activationCodeLast4" TEXT;

CREATE UNIQUE INDEX "ChipClaimToken_activationCodeHash_key"
  ON "ChipClaimToken"("activationCodeHash");

CREATE INDEX "ChipClaimToken_activationCodeLast4_idx"
  ON "ChipClaimToken"("activationCodeLast4");
