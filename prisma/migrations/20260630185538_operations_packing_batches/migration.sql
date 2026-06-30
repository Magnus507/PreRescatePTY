-- CreateTable
CREATE TABLE "OperationPackingBatch" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "productionOrderId" TEXT,
    "qcInspectionId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "packageType" TEXT NOT NULL DEFAULT 'standard',
    "plannedQuantity" INTEGER NOT NULL DEFAULT 0,
    "packedQuantity" INTEGER NOT NULL DEFAULT 0,
    "rejectedQuantity" INTEGER NOT NULL DEFAULT 0,
    "labelCode" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OperationPackingBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OperationPackingEvent" (
    "id" TEXT NOT NULL,
    "packingBatchId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "quantity" INTEGER,
    "reason" TEXT,
    "metadataJson" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OperationPackingEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OperationPackingBatch_code_key" ON "OperationPackingBatch"("code");

-- CreateIndex
CREATE INDEX "OperationPackingBatch_productionOrderId_idx" ON "OperationPackingBatch"("productionOrderId");

-- CreateIndex
CREATE INDEX "OperationPackingBatch_qcInspectionId_idx" ON "OperationPackingBatch"("qcInspectionId");

-- CreateIndex
CREATE INDEX "OperationPackingBatch_status_idx" ON "OperationPackingBatch"("status");

-- CreateIndex
CREATE INDEX "OperationPackingBatch_packageType_idx" ON "OperationPackingBatch"("packageType");

-- CreateIndex
CREATE INDEX "OperationPackingBatch_createdAt_idx" ON "OperationPackingBatch"("createdAt");

-- CreateIndex
CREATE INDEX "OperationPackingEvent_packingBatchId_idx" ON "OperationPackingEvent"("packingBatchId");

-- CreateIndex
CREATE INDEX "OperationPackingEvent_eventType_idx" ON "OperationPackingEvent"("eventType");

-- CreateIndex
CREATE INDEX "OperationPackingEvent_createdById_idx" ON "OperationPackingEvent"("createdById");

-- CreateIndex
CREATE INDEX "OperationPackingEvent_createdAt_idx" ON "OperationPackingEvent"("createdAt");

-- AddForeignKey
ALTER TABLE "OperationPackingBatch" ADD CONSTRAINT "OperationPackingBatch_productionOrderId_fkey" FOREIGN KEY ("productionOrderId") REFERENCES "OperationProductionOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperationPackingBatch" ADD CONSTRAINT "OperationPackingBatch_qcInspectionId_fkey" FOREIGN KEY ("qcInspectionId") REFERENCES "OperationQcInspection"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperationPackingEvent" ADD CONSTRAINT "OperationPackingEvent_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperationPackingEvent" ADD CONSTRAINT "OperationPackingEvent_packingBatchId_fkey" FOREIGN KEY ("packingBatchId") REFERENCES "OperationPackingBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
