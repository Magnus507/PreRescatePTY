-- CreateTable
CREATE TABLE "OperationFinishedGoodUnit" (
    "id" TEXT NOT NULL,
    "internalLabel" TEXT NOT NULL,
    "productCode" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "productType" TEXT NOT NULL,
    "digitalBatchId" TEXT,
    "digitalBatchItemId" TEXT,
    "printOrderId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'assembled',
    "qaStatus" TEXT,
    "activationStatus" TEXT NOT NULL DEFAULT 'not_activated',
    "activationReferenceType" TEXT,
    "activationReferenceId" TEXT,
    "reservedOrderId" TEXT,
    "reservedAt" TIMESTAMP(3),
    "dispatchedAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "activatedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OperationFinishedGoodUnit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OperationFinishedGoodUnitEvent" (
    "id" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "reason" TEXT,
    "referenceType" TEXT,
    "referenceId" TEXT,
    "metadataJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OperationFinishedGoodUnitEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OperationFinishedGoodUnit_internalLabel_key" ON "OperationFinishedGoodUnit"("internalLabel");

-- CreateIndex
CREATE UNIQUE INDEX "OperationFinishedGoodUnit_digitalBatchItemId_key" ON "OperationFinishedGoodUnit"("digitalBatchItemId");

-- CreateIndex
CREATE INDEX "OperationFinishedGoodUnit_productCode_idx" ON "OperationFinishedGoodUnit"("productCode");

-- CreateIndex
CREATE INDEX "OperationFinishedGoodUnit_productType_idx" ON "OperationFinishedGoodUnit"("productType");

-- CreateIndex
CREATE INDEX "OperationFinishedGoodUnit_status_idx" ON "OperationFinishedGoodUnit"("status");

-- CreateIndex
CREATE INDEX "OperationFinishedGoodUnit_activationStatus_idx" ON "OperationFinishedGoodUnit"("activationStatus");

-- CreateIndex
CREATE INDEX "OperationFinishedGoodUnit_reservedOrderId_idx" ON "OperationFinishedGoodUnit"("reservedOrderId");

-- CreateIndex
CREATE INDEX "OperationFinishedGoodUnit_createdAt_idx" ON "OperationFinishedGoodUnit"("createdAt");

-- CreateIndex
CREATE INDEX "OperationFinishedGoodUnitEvent_unitId_idx" ON "OperationFinishedGoodUnitEvent"("unitId");

-- CreateIndex
CREATE INDEX "OperationFinishedGoodUnitEvent_eventType_idx" ON "OperationFinishedGoodUnitEvent"("eventType");

-- CreateIndex
CREATE INDEX "OperationFinishedGoodUnitEvent_createdAt_idx" ON "OperationFinishedGoodUnitEvent"("createdAt");

-- AddForeignKey
ALTER TABLE "OperationFinishedGoodUnit" ADD CONSTRAINT "OperationFinishedGoodUnit_digitalBatchId_fkey" FOREIGN KEY ("digitalBatchId") REFERENCES "OperationDigitalBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperationFinishedGoodUnit" ADD CONSTRAINT "OperationFinishedGoodUnit_digitalBatchItemId_fkey" FOREIGN KEY ("digitalBatchItemId") REFERENCES "OperationDigitalBatchItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperationFinishedGoodUnit" ADD CONSTRAINT "OperationFinishedGoodUnit_printOrderId_fkey" FOREIGN KEY ("printOrderId") REFERENCES "OperationPrintOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperationFinishedGoodUnitEvent" ADD CONSTRAINT "OperationFinishedGoodUnitEvent_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "OperationFinishedGoodUnit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
