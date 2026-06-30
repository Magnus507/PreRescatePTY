-- CreateTable
CREATE TABLE "OperationFinishedGood" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "productType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "unit" TEXT NOT NULL DEFAULT 'unit',
    "packingBatchId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OperationFinishedGood_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OperationFinishedGoodEvent" (
    "id" TEXT NOT NULL,
    "finishedGoodId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "reason" TEXT,
    "referenceType" TEXT,
    "referenceId" TEXT,
    "metadataJson" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OperationFinishedGoodEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OperationFinishedGood_code_key" ON "OperationFinishedGood"("code");

-- CreateIndex
CREATE INDEX "OperationFinishedGood_packingBatchId_idx" ON "OperationFinishedGood"("packingBatchId");

-- CreateIndex
CREATE INDEX "OperationFinishedGood_status_idx" ON "OperationFinishedGood"("status");

-- CreateIndex
CREATE INDEX "OperationFinishedGood_productType_idx" ON "OperationFinishedGood"("productType");

-- CreateIndex
CREATE INDEX "OperationFinishedGood_createdAt_idx" ON "OperationFinishedGood"("createdAt");

-- CreateIndex
CREATE INDEX "OperationFinishedGoodEvent_finishedGoodId_idx" ON "OperationFinishedGoodEvent"("finishedGoodId");

-- CreateIndex
CREATE INDEX "OperationFinishedGoodEvent_eventType_idx" ON "OperationFinishedGoodEvent"("eventType");

-- CreateIndex
CREATE INDEX "OperationFinishedGoodEvent_createdById_idx" ON "OperationFinishedGoodEvent"("createdById");

-- CreateIndex
CREATE INDEX "OperationFinishedGoodEvent_createdAt_idx" ON "OperationFinishedGoodEvent"("createdAt");

-- AddForeignKey
ALTER TABLE "OperationFinishedGood" ADD CONSTRAINT "OperationFinishedGood_packingBatchId_fkey" FOREIGN KEY ("packingBatchId") REFERENCES "OperationPackingBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperationFinishedGoodEvent" ADD CONSTRAINT "OperationFinishedGoodEvent_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperationFinishedGoodEvent" ADD CONSTRAINT "OperationFinishedGoodEvent_finishedGoodId_fkey" FOREIGN KEY ("finishedGoodId") REFERENCES "OperationFinishedGood"("id") ON DELETE CASCADE ON UPDATE CASCADE;
