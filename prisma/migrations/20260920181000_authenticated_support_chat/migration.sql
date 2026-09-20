-- Authenticated customer-to-support chat.
-- Backend-only tables: no direct browser/client policies are created.

CREATE TABLE "SupportConversation" (
  "id" TEXT PRIMARY KEY,
  "accountId" TEXT NOT NULL,
  "openedByUserId" TEXT NOT NULL,
  "category" TEXT NOT NULL DEFAULT 'general',
  "subject" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'open',
  "priority" TEXT,
  "assignedToUserId" TEXT,
  "orderId" TEXT,
  "chipId" TEXT,
  "profileId" TEXT,
  "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "clientLastReadAt" TIMESTAMP(3),
  "supportLastReadAt" TIMESTAMP(3),
  "resolvedAt" TIMESTAMP(3),
  "closedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SupportConversation_accountId_fkey"
    FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "SupportConversation_openedByUserId_fkey"
    FOREIGN KEY ("openedByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "SupportConversation_assignedToUserId_fkey"
    FOREIGN KEY ("assignedToUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "SupportConversation_orderId_fkey"
    FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "SupportConversation_chipId_fkey"
    FOREIGN KEY ("chipId") REFERENCES "Chip"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "SupportConversation_profileId_fkey"
    FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "SupportConversation_accountId_lastMessageAt_idx" ON "SupportConversation"("accountId","lastMessageAt");
CREATE INDEX "SupportConversation_status_lastMessageAt_idx" ON "SupportConversation"("status","lastMessageAt");
CREATE INDEX "SupportConversation_openedByUserId_idx" ON "SupportConversation"("openedByUserId");
CREATE INDEX "SupportConversation_assignedToUserId_idx" ON "SupportConversation"("assignedToUserId");

CREATE TABLE "SupportConversationMessage" (
  "id" TEXT PRIMARY KEY,
  "conversationId" TEXT NOT NULL,
  "senderType" TEXT NOT NULL,
  "senderUserId" TEXT,
  "body" TEXT NOT NULL,
  "isInternalNote" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "editedAt" TIMESTAMP(3),
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "SupportConversationMessage_conversationId_fkey"
    FOREIGN KEY ("conversationId") REFERENCES "SupportConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "SupportConversationMessage_senderUserId_fkey"
    FOREIGN KEY ("senderUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "SupportConversationMessage_conversationId_createdAt_idx" ON "SupportConversationMessage"("conversationId","createdAt");
CREATE INDEX "SupportConversationMessage_senderUserId_idx" ON "SupportConversationMessage"("senderUserId");

CREATE TABLE "SupportEvent" (
  "id" TEXT PRIMARY KEY,
  "conversationId" TEXT NOT NULL,
  "actorUserId" TEXT,
  "eventType" TEXT NOT NULL,
  "beforeJson" JSONB,
  "afterJson" JSONB,
  "reason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SupportEvent_conversationId_fkey"
    FOREIGN KEY ("conversationId") REFERENCES "SupportConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "SupportEvent_actorUserId_fkey"
    FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "SupportEvent_conversationId_createdAt_idx" ON "SupportEvent"("conversationId","createdAt");
CREATE INDEX "SupportEvent_eventType_idx" ON "SupportEvent"("eventType");

ALTER TABLE "SupportConversation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SupportConversationMessage" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SupportEvent" ENABLE ROW LEVEL SECURITY;
