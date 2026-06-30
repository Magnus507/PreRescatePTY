-- CreateTable
CREATE TABLE "OperationProductionOrder" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "plannedQuantity" DOUBLE PRECISION NOT NULL,
    "producedQuantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "outputType" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OperationProductionOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OperationProductionOrderItem" (
    "id" TEXT NOT NULL,
    "productionOrderId" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "plannedQuantity" DOUBLE PRECISION NOT NULL,
    "consumedQuantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "unit" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OperationProductionOrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OperationProductionEvent" (
    "id" TEXT NOT NULL,
    "productionOrderId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION,
    "reason" TEXT,
    "metadataJson" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OperationProductionEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OperationProductionOrder_code_key" ON "OperationProductionOrder"("code");

-- CreateIndex
CREATE INDEX "OperationProductionOrder_status_idx" ON "OperationProductionOrder"("status");

-- CreateIndex
CREATE INDEX "OperationProductionOrder_outputType_idx" ON "OperationProductionOrder"("outputType");

-- CreateIndex
CREATE INDEX "OperationProductionOrder_createdAt_idx" ON "OperationProductionOrder"("createdAt");

-- CreateIndex
CREATE INDEX "OperationProductionOrderItem_productionOrderId_idx" ON "OperationProductionOrderItem"("productionOrderId");

-- CreateIndex
CREATE INDEX "OperationProductionOrderItem_materialId_idx" ON "OperationProductionOrderItem"("materialId");

-- CreateIndex
CREATE INDEX "OperationProductionEvent_productionOrderId_idx" ON "OperationProductionEvent"("productionOrderId");

-- CreateIndex
CREATE INDEX "OperationProductionEvent_eventType_idx" ON "OperationProductionEvent"("eventType");

-- CreateIndex
CREATE INDEX "OperationProductionEvent_createdById_idx" ON "OperationProductionEvent"("createdById");

-- CreateIndex
CREATE INDEX "OperationProductionEvent_createdAt_idx" ON "OperationProductionEvent"("createdAt");

-- AddForeignKey
ALTER TABLE "OperationProductionOrderItem" ADD CONSTRAINT "OperationProductionOrderItem_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "OperationMaterial"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperationProductionOrderItem" ADD CONSTRAINT "OperationProductionOrderItem_productionOrderId_fkey" FOREIGN KEY ("productionOrderId") REFERENCES "OperationProductionOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperationProductionEvent" ADD CONSTRAINT "OperationProductionEvent_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperationProductionEvent" ADD CONSTRAINT "OperationProductionEvent_productionOrderId_fkey" FOREIGN KEY ("productionOrderId") REFERENCES "OperationProductionOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

