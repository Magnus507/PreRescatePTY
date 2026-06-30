-- CreateTable
CREATE TABLE "OperationWarranty" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "warrantyType" TEXT NOT NULL DEFAULT 'standard',
    "coverageStatus" TEXT NOT NULL DEFAULT 'valid',
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "customerName" TEXT,
    "customerEmail" TEXT,
    "customerPhone" TEXT,
    "serialReference" TEXT,
    "commercialOrderId" TEXT,
    "commercialOrderItemId" TEXT,
    "finishedGoodId" TEXT,
    "dispatchId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OperationWarranty_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OperationWarrantyEvent" (
    "id" TEXT NOT NULL,
    "warrantyId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "reason" TEXT,
    "referenceType" TEXT,
    "referenceId" TEXT,
    "metadataJson" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OperationWarrantyEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OperationWarranty_code_key" ON "OperationWarranty"("code");

-- CreateIndex
CREATE INDEX "OperationWarranty_status_idx" ON "OperationWarranty"("status");

-- CreateIndex
CREATE INDEX "OperationWarranty_warrantyType_idx" ON "OperationWarranty"("warrantyType");

-- CreateIndex
CREATE INDEX "OperationWarranty_coverageStatus_idx" ON "OperationWarranty"("coverageStatus");

-- CreateIndex
CREATE INDEX "OperationWarranty_commercialOrderId_idx" ON "OperationWarranty"("commercialOrderId");

-- CreateIndex
CREATE INDEX "OperationWarranty_commercialOrderItemId_idx" ON "OperationWarranty"("commercialOrderItemId");

-- CreateIndex
CREATE INDEX "OperationWarranty_finishedGoodId_idx" ON "OperationWarranty"("finishedGoodId");

-- CreateIndex
CREATE INDEX "OperationWarranty_dispatchId_idx" ON "OperationWarranty"("dispatchId");

-- CreateIndex
CREATE INDEX "OperationWarranty_serialReference_idx" ON "OperationWarranty"("serialReference");

-- CreateIndex
CREATE INDEX "OperationWarranty_createdAt_idx" ON "OperationWarranty"("createdAt");

-- CreateIndex
CREATE INDEX "OperationWarrantyEvent_warrantyId_idx" ON "OperationWarrantyEvent"("warrantyId");

-- CreateIndex
CREATE INDEX "OperationWarrantyEvent_eventType_idx" ON "OperationWarrantyEvent"("eventType");

-- CreateIndex
CREATE INDEX "OperationWarrantyEvent_createdById_idx" ON "OperationWarrantyEvent"("createdById");

-- CreateIndex
CREATE INDEX "OperationWarrantyEvent_createdAt_idx" ON "OperationWarrantyEvent"("createdAt");

-- AddForeignKey
ALTER TABLE "OperationWarranty" ADD CONSTRAINT "OperationWarranty_commercialOrderId_fkey" FOREIGN KEY ("commercialOrderId") REFERENCES "OperationCommercialOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperationWarranty" ADD CONSTRAINT "OperationWarranty_commercialOrderItemId_fkey" FOREIGN KEY ("commercialOrderItemId") REFERENCES "OperationCommercialOrderItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperationWarranty" ADD CONSTRAINT "OperationWarranty_finishedGoodId_fkey" FOREIGN KEY ("finishedGoodId") REFERENCES "OperationFinishedGood"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperationWarranty" ADD CONSTRAINT "OperationWarranty_dispatchId_fkey" FOREIGN KEY ("dispatchId") REFERENCES "OperationDispatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperationWarrantyEvent" ADD CONSTRAINT "OperationWarrantyEvent_warrantyId_fkey" FOREIGN KEY ("warrantyId") REFERENCES "OperationWarranty"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperationWarrantyEvent" ADD CONSTRAINT "OperationWarrantyEvent_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
