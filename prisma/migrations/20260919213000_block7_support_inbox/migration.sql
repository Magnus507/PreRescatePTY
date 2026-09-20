CREATE TABLE "SupportMessage" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "whatsappPhone" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "readAt" TIMESTAMP(3),
  "readByUserId" TEXT,
  "resolvedAt" TIMESTAMP(3),
  "resolvedByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SupportMessage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SupportMessage_createdAt_idx" ON "SupportMessage"("createdAt");
CREATE INDEX "SupportMessage_readAt_idx" ON "SupportMessage"("readAt");
CREATE INDEX "SupportMessage_resolvedAt_idx" ON "SupportMessage"("resolvedAt");
CREATE INDEX "SupportMessage_whatsappPhone_idx" ON "SupportMessage"("whatsappPhone");

REVOKE ALL PRIVILEGES ON TABLE public."SupportMessage" FROM anon, authenticated;
ALTER TABLE public."SupportMessage" ENABLE ROW LEVEL SECURITY;
