-- CreateTable
CREATE TABLE "OperationReturn" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "returnType" TEXT NOT NULL DEFAULT 'customer_return',
    "reason" TEXT,
    "resolution" TEXT,
    "customerName" TEXT,
    "customerEmail" TEXT,
    "customerPhone" TEXT,
    "warrantyId" TEXT,
    "replacementId" TEXT,
    "commercialOrderId" TEXT,
    "finishedGoodId" TEXT,
    "originalDispatchId" TEXT,
    "receivedQuantity" INTEGER NOT NULL DEFAULT 0,
    "acceptedQuantity" INTEGER NOT NULL DEFAULT 0,
    "rejectedQuantity" INTEGER NOT NULL DEFAULT 0,
    "receivedAt" TIMESTAMP(3),
    "inspectedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OperationReturn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OperationReturnEvent" (
    "id" TEXT NOT NULL,
    "returnId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "quantity" INTEGER,
    "reason" TEXT,
    "referenceType" TEXT,
    "referenceId" TEXT,
    "metadataJson" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OperationReturnEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OperationReturn_code_key" ON "OperationReturn"("code");

-- CreateIndex
CREATE INDEX "OperationReturn_status_idx" ON "OperationReturn"("status");

-- CreateIndex
CREATE INDEX "OperationReturn_returnType_idx" ON "OperationReturn"("returnType");

-- CreateIndex
CREATE INDEX "OperationReturn_warrantyId_idx" ON "OperationReturn"("warrantyId");

-- CreateIndex
CREATE INDEX "OperationReturn_replacementId_idx" ON "OperationReturn"("replacementId");

-- CreateIndex
CREATE INDEX "OperationReturn_commercialOrderId_idx" ON "OperationReturn"("commercialOrderId");

-- CreateIndex
CREATE INDEX "OperationReturn_finishedGoodId_idx" ON "OperationReturn"("finishedGoodId");

-- CreateIndex
CREATE INDEX "OperationReturn_originalDispatchId_idx" ON "OperationReturn"("originalDispatchId");

-- CreateIndex
CREATE INDEX "OperationReturn_createdAt_idx" ON "OperationReturn"("createdAt");

-- CreateIndex
CREATE INDEX "OperationReturnEvent_returnId_idx" ON "OperationReturnEvent"("returnId");

-- CreateIndex
CREATE INDEX "OperationReturnEvent_eventType_idx" ON "OperationReturnEvent"("eventType");

-- CreateIndex
CREATE INDEX "OperationReturnEvent_createdById_idx" ON "OperationReturnEvent"("createdById");

-- CreateIndex
CREATE INDEX "OperationReturnEvent_createdAt_idx" ON "OperationReturnEvent"("createdAt");

-- AddForeignKey
ALTER TABLE "OperationReturn" ADD CONSTRAINT "OperationReturn_warrantyId_fkey" FOREIGN KEY ("warrantyId") REFERENCES "OperationWarranty"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperationReturn" ADD CONSTRAINT "OperationReturn_replacementId_fkey" FOREIGN KEY ("replacementId") REFERENCES "OperationReplacement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperationReturn" ADD CONSTRAINT "OperationReturn_commercialOrderId_fkey" FOREIGN KEY ("commercialOrderId") REFERENCES "OperationCommercialOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperationReturn" ADD CONSTRAINT "OperationReturn_finishedGoodId_fkey" FOREIGN KEY ("finishedGoodId") REFERENCES "OperationFinishedGood"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperationReturn" ADD CONSTRAINT "OperationReturn_originalDispatchId_fkey" FOREIGN KEY ("originalDispatchId") REFERENCES "OperationDispatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperationReturnEvent" ADD CONSTRAINT "OperationReturnEvent_returnId_fkey" FOREIGN KEY ("returnId") REFERENCES "OperationReturn"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperationReturnEvent" ADD CONSTRAINT "OperationReturnEvent_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
