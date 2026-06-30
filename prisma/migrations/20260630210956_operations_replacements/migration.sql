-- CreateTable
CREATE TABLE "OperationReplacement" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "replacementType" TEXT NOT NULL DEFAULT 'warranty',
    "reason" TEXT,
    "customerName" TEXT,
    "customerEmail" TEXT,
    "customerPhone" TEXT,
    "warrantyId" TEXT,
    "commercialOrderId" TEXT,
    "originalFinishedGoodId" TEXT,
    "replacementFinishedGoodId" TEXT,
    "originalDispatchId" TEXT,
    "replacementDispatchId" TEXT,
    "approvedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OperationReplacement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OperationReplacementEvent" (
    "id" TEXT NOT NULL,
    "replacementId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "reason" TEXT,
    "referenceType" TEXT,
    "referenceId" TEXT,
    "metadataJson" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OperationReplacementEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OperationReplacement_code_key" ON "OperationReplacement"("code");

-- CreateIndex
CREATE INDEX "OperationReplacement_status_idx" ON "OperationReplacement"("status");

-- CreateIndex
CREATE INDEX "OperationReplacement_replacementType_idx" ON "OperationReplacement"("replacementType");

-- CreateIndex
CREATE INDEX "OperationReplacement_warrantyId_idx" ON "OperationReplacement"("warrantyId");

-- CreateIndex
CREATE INDEX "OperationReplacement_commercialOrderId_idx" ON "OperationReplacement"("commercialOrderId");

-- CreateIndex
CREATE INDEX "OperationReplacement_originalFinishedGoodId_idx" ON "OperationReplacement"("originalFinishedGoodId");

-- CreateIndex
CREATE INDEX "OperationReplacement_replacementFinishedGoodId_idx" ON "OperationReplacement"("replacementFinishedGoodId");

-- CreateIndex
CREATE INDEX "OperationReplacement_originalDispatchId_idx" ON "OperationReplacement"("originalDispatchId");

-- CreateIndex
CREATE INDEX "OperationReplacement_replacementDispatchId_idx" ON "OperationReplacement"("replacementDispatchId");

-- CreateIndex
CREATE INDEX "OperationReplacement_createdAt_idx" ON "OperationReplacement"("createdAt");

-- CreateIndex
CREATE INDEX "OperationReplacementEvent_replacementId_idx" ON "OperationReplacementEvent"("replacementId");

-- CreateIndex
CREATE INDEX "OperationReplacementEvent_eventType_idx" ON "OperationReplacementEvent"("eventType");

-- CreateIndex
CREATE INDEX "OperationReplacementEvent_createdById_idx" ON "OperationReplacementEvent"("createdById");

-- CreateIndex
CREATE INDEX "OperationReplacementEvent_createdAt_idx" ON "OperationReplacementEvent"("createdAt");

-- AddForeignKey
ALTER TABLE "OperationReplacement" ADD CONSTRAINT "OperationReplacement_warrantyId_fkey" FOREIGN KEY ("warrantyId") REFERENCES "OperationWarranty"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperationReplacement" ADD CONSTRAINT "OperationReplacement_commercialOrderId_fkey" FOREIGN KEY ("commercialOrderId") REFERENCES "OperationCommercialOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperationReplacement" ADD CONSTRAINT "OperationReplacement_originalFinishedGoodId_fkey" FOREIGN KEY ("originalFinishedGoodId") REFERENCES "OperationFinishedGood"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperationReplacement" ADD CONSTRAINT "OperationReplacement_replacementFinishedGoodId_fkey" FOREIGN KEY ("replacementFinishedGoodId") REFERENCES "OperationFinishedGood"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperationReplacement" ADD CONSTRAINT "OperationReplacement_originalDispatchId_fkey" FOREIGN KEY ("originalDispatchId") REFERENCES "OperationDispatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperationReplacement" ADD CONSTRAINT "OperationReplacement_replacementDispatchId_fkey" FOREIGN KEY ("replacementDispatchId") REFERENCES "OperationDispatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperationReplacementEvent" ADD CONSTRAINT "OperationReplacementEvent_replacementId_fkey" FOREIGN KEY ("replacementId") REFERENCES "OperationReplacement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperationReplacementEvent" ADD CONSTRAINT "OperationReplacementEvent_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
