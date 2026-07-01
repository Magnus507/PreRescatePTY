-- CreateTable
CREATE TABLE "OperationDigitalBatch" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT,
    "productType" TEXT NOT NULL,
    "finishedGoodCode" TEXT,
    "prefix" TEXT NOT NULL,
    "startNumber" INTEGER NOT NULL,
    "endNumber" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OperationDigitalBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OperationDigitalBatchItem" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "internalLabel" TEXT NOT NULL,
    "sequenceNumber" INTEGER NOT NULL,
    "qrUrl" TEXT NOT NULL,
    "nfcUrl" TEXT,
    "activationUrl" TEXT,
    "shortCode" TEXT,
    "status" TEXT NOT NULL DEFAULT 'available',
    "consumedAt" TIMESTAMP(3),
    "consumedReferenceType" TEXT,
    "consumedReferenceId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OperationDigitalBatchItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OperationDigitalBatch_code_key" ON "OperationDigitalBatch"("code");

-- CreateIndex
CREATE INDEX "OperationDigitalBatch_productType_idx" ON "OperationDigitalBatch"("productType");

-- CreateIndex
CREATE INDEX "OperationDigitalBatch_finishedGoodCode_idx" ON "OperationDigitalBatch"("finishedGoodCode");

-- CreateIndex
CREATE INDEX "OperationDigitalBatch_status_idx" ON "OperationDigitalBatch"("status");

-- CreateIndex
CREATE INDEX "OperationDigitalBatch_createdAt_idx" ON "OperationDigitalBatch"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "OperationDigitalBatchItem_internalLabel_key" ON "OperationDigitalBatchItem"("internalLabel");

-- CreateIndex
CREATE INDEX "OperationDigitalBatchItem_batchId_idx" ON "OperationDigitalBatchItem"("batchId");

-- CreateIndex
CREATE INDEX "OperationDigitalBatchItem_status_idx" ON "OperationDigitalBatchItem"("status");

-- CreateIndex
CREATE INDEX "OperationDigitalBatchItem_createdAt_idx" ON "OperationDigitalBatchItem"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "OperationDigitalBatchItem_batchId_sequenceNumber_key" ON "OperationDigitalBatchItem"("batchId", "sequenceNumber");

-- AddForeignKey
ALTER TABLE "OperationDigitalBatchItem" ADD CONSTRAINT "OperationDigitalBatchItem_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "OperationDigitalBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
