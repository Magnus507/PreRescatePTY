-- Annual account entitlement + authenticated support chat.
-- Existing accounts with an activated/suspended physical identifier are grandfathered.

ALTER TABLE "ProductOperationalMapping"
  ADD COLUMN "grantsAnnualAccess" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "requiresPaidOrderForAnnualAccess" BOOLEAN NOT NULL DEFAULT true;
-- Dormant accounts remain pending until an eligible physical activation or renewal payment.

CREATE TABLE "RenewalPayment" (
  "id" TEXT PRIMARY KEY,
  "accountId" TEXT NOT NULL,
  "provider" TEXT NOT NULL DEFAULT 'yappy',
  "amount" DECIMAL(18,2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "status" TEXT NOT NULL DEFAULT 'created',
  "requestId" TEXT,
  "idempotencyKey" TEXT NOT NULL,
  "providerTransactionId" TEXT,
  "checkoutSessionJson" TEXT,
  "failureCode" TEXT,
  "confirmedAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RenewalPayment_accountId_fkey"
    FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "RenewalPayment_requestId_key" ON "RenewalPayment"("requestId");
CREATE UNIQUE INDEX "RenewalPayment_idempotencyKey_key" ON "RenewalPayment"("idempotencyKey");
CREATE UNIQUE INDEX "RenewalPayment_providerTransactionId_key" ON "RenewalPayment"("providerTransactionId");
CREATE INDEX "RenewalPayment_accountId_status_idx" ON "RenewalPayment"("accountId","status");
CREATE INDEX "RenewalPayment_provider_status_idx" ON "RenewalPayment"("provider","status");
CREATE INDEX "RenewalPayment_createdAt_idx" ON "RenewalPayment"("createdAt");

CREATE TABLE "ServiceEntitlement" (
  "id" TEXT PRIMARY KEY,
  "accountId" TEXT NOT NULL,
  "planCode" TEXT NOT NULL DEFAULT 'annual_device_access_v1',
  "status" TEXT NOT NULL DEFAULT 'pending',
  "startsAt" TIMESTAMP(3),
  "endsAt" TIMESTAMP(3),
  "graceEndsAt" TIMESTAMP(3),
  "source" TEXT NOT NULL DEFAULT 'registration',
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ServiceEntitlement_accountId_fkey"
    FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "ServiceEntitlement_accountId_key" ON "ServiceEntitlement"("accountId");
CREATE INDEX "ServiceEntitlement_status_idx" ON "ServiceEntitlement"("status");
CREATE INDEX "ServiceEntitlement_endsAt_idx" ON "ServiceEntitlement"("endsAt");

CREATE TABLE "EntitlementEvent" (
  "id" TEXT PRIMARY KEY,
  "entitlementId" TEXT NOT NULL,
  "accountId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "effectiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deltaMonths" INTEGER NOT NULL DEFAULT 0,
  "previousEnd" TIMESTAMP(3),
  "newEnd" TIMESTAMP(3),
  "paymentId" TEXT,
  "unitId" TEXT,
  "chipId" TEXT,
  "idempotencyKey" TEXT NOT NULL,
  "actorUserId" TEXT,
  "reason" TEXT,
  "correlationId" TEXT,
  "metadataJson" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EntitlementEvent_entitlementId_fkey"
    FOREIGN KEY ("entitlementId") REFERENCES "ServiceEntitlement"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "EntitlementEvent_accountId_fkey"
    FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "EntitlementEvent_paymentId_fkey"
    FOREIGN KEY ("paymentId") REFERENCES "RenewalPayment"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "EntitlementEvent_unitId_fkey"
    FOREIGN KEY ("unitId") REFERENCES "OperationFinishedGoodUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "EntitlementEvent_chipId_fkey"
    FOREIGN KEY ("chipId") REFERENCES "Chip"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "EntitlementEvent_actorUserId_fkey"
    FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "EntitlementEvent_idempotencyKey_key" ON "EntitlementEvent"("idempotencyKey");
CREATE INDEX "EntitlementEvent_entitlementId_effectiveAt_idx" ON "EntitlementEvent"("entitlementId","effectiveAt");
CREATE INDEX "EntitlementEvent_accountId_effectiveAt_idx" ON "EntitlementEvent"("accountId","effectiveAt");
CREATE INDEX "EntitlementEvent_unitId_idx" ON "EntitlementEvent"("unitId");
CREATE INDEX "EntitlementEvent_paymentId_idx" ON "EntitlementEvent"("paymentId");
CREATE INDEX "EntitlementEvent_type_idx" ON "EntitlementEvent"("type");

CREATE TABLE "RenewalPaymentEvent" (
  "id" TEXT PRIMARY KEY,
  "paymentId" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "payloadHash" TEXT,
  "normalizedPayloadJson" JSONB,
  "signatureVerified" BOOLEAN NOT NULL DEFAULT false,
  "idempotencyKey" TEXT NOT NULL,
  "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RenewalPaymentEvent_paymentId_fkey"
    FOREIGN KEY ("paymentId") REFERENCES "RenewalPayment"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "RenewalPaymentEvent_idempotencyKey_key" ON "RenewalPaymentEvent"("idempotencyKey");
CREATE INDEX "RenewalPaymentEvent_paymentId_receivedAt_idx" ON "RenewalPaymentEvent"("paymentId","receivedAt");
CREATE INDEX "RenewalPaymentEvent_eventType_idx" ON "RenewalPaymentEvent"("eventType");

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
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
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

-- Preserve the promise made to already-active accounts. Accounts that only
-- registered but never activated a physical identifier do not receive lifetime
-- administration rights.
INSERT INTO "ServiceEntitlement" (
  "id","accountId","planCode","status","source","version","createdAt","updatedAt"
)
SELECT
  'se_' || md5(a."id" || ':' || clock_timestamp()::text || random()::text),
  a."id",
  'annual_device_access_v1',
  CASE
    WHEN EXISTS (
      SELECT 1 FROM "Chip" c
      WHERE c."accountId" = a."id"
        AND c."status" IN ('activated','suspended')
    ) THEN 'exempt'
    ELSE 'pending'
  END,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM "Chip" c
      WHERE c."accountId" = a."id"
        AND c."status" IN ('activated','suspended')
    ) THEN 'grandfather'
    ELSE 'registration'
  END,
  1,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "Account" a
ON CONFLICT ("accountId") DO NOTHING;

INSERT INTO "EntitlementEvent" (
  "id","entitlementId","accountId","type","effectiveAt","deltaMonths",
  "idempotencyKey","reason","metadataJson","createdAt"
)
SELECT
  'ee_' || md5(se."id" || ':grandfather'),
  se."id",
  se."accountId",
  'grandfather',
  CURRENT_TIMESTAMP,
  0,
  'grandfather:' || se."accountId",
  'Existing account with an activated or suspended physical identifier before annual entitlement rollout.',
  jsonb_build_object('accessMode','FULL','unlimited',true),
  CURRENT_TIMESTAMP
FROM "ServiceEntitlement" se
WHERE se."status" = 'exempt'
ON CONFLICT ("idempotencyKey") DO NOTHING;

-- These tables are backend-only. No browser/client policy is created.
ALTER TABLE "RenewalPayment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ServiceEntitlement" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EntitlementEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RenewalPaymentEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SupportConversation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SupportConversationMessage" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SupportEvent" ENABLE ROW LEVEL SECURITY;
