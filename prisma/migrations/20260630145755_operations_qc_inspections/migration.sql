-- CreateTable
CREATE TABLE "OperationQcInspection" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "productionOrderId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "inspectionType" TEXT NOT NULL DEFAULT 'standard',
    "inspectedQuantity" INTEGER NOT NULL DEFAULT 0,
    "passedQuantity" INTEGER NOT NULL DEFAULT 0,
    "failedQuantity" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OperationQcInspection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OperationQcInspectionEvent" (
    "id" TEXT NOT NULL,
    "qcInspectionId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "quantity" INTEGER,
    "passedQuantity" INTEGER,
    "failedQuantity" INTEGER,
    "reason" TEXT,
    "metadataJson" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OperationQcInspectionEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OperationQcInspection_code_key" ON "OperationQcInspection"("code");

-- CreateIndex
CREATE INDEX "OperationQcInspection_productionOrderId_idx" ON "OperationQcInspection"("productionOrderId");

-- CreateIndex
CREATE INDEX "OperationQcInspection_status_idx" ON "OperationQcInspection"("status");

-- CreateIndex
CREATE INDEX "OperationQcInspection_inspectionType_idx" ON "OperationQcInspection"("inspectionType");

-- CreateIndex
CREATE INDEX "OperationQcInspection_createdAt_idx" ON "OperationQcInspection"("createdAt");

-- CreateIndex
CREATE INDEX "OperationQcInspectionEvent_qcInspectionId_idx" ON "OperationQcInspectionEvent"("qcInspectionId");

-- CreateIndex
CREATE INDEX "OperationQcInspectionEvent_eventType_idx" ON "OperationQcInspectionEvent"("eventType");

-- CreateIndex
CREATE INDEX "OperationQcInspectionEvent_createdById_idx" ON "OperationQcInspectionEvent"("createdById");

-- CreateIndex
CREATE INDEX "OperationQcInspectionEvent_createdAt_idx" ON "OperationQcInspectionEvent"("createdAt");

-- AddForeignKey
ALTER TABLE "OperationQcInspection" ADD CONSTRAINT "OperationQcInspection_productionOrderId_fkey" FOREIGN KEY ("productionOrderId") REFERENCES "OperationProductionOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperationQcInspectionEvent" ADD CONSTRAINT "OperationQcInspectionEvent_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperationQcInspectionEvent" ADD CONSTRAINT "OperationQcInspectionEvent_qcInspectionId_fkey" FOREIGN KEY ("qcInspectionId") REFERENCES "OperationQcInspection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
