-- CreateTable
CREATE TABLE "OperationPrintOrder" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "supplierName" TEXT NOT NULL,
    "supplierReference" TEXT,
    "productType" TEXT NOT NULL,
    "finishedGoodCode" TEXT,
    "digitalBatchId" TEXT NOT NULL,
    "rangeStartLabel" TEXT NOT NULL,
    "rangeEndLabel" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "includesSticker" BOOLEAN NOT NULL DEFAULT true,
    "includesActivationCard" BOOLEAN NOT NULL DEFAULT false,
    "includesPresentation" BOOLEAN NOT NULL DEFAULT false,
    "includesPackaging" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "sentAt" TIMESTAMP(3),
    "receivedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OperationPrintOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OperationPrintOrderItem" (
    "id" TEXT NOT NULL,
    "printOrderId" TEXT NOT NULL,
    "digitalBatchItemId" TEXT NOT NULL,
    "internalLabel" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "sentAt" TIMESTAMP(3),
    "receivedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OperationPrintOrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OperationPrintOrder_code_key" ON "OperationPrintOrder"("code");

-- CreateIndex
CREATE INDEX "OperationPrintOrder_digitalBatchId_idx" ON "OperationPrintOrder"("digitalBatchId");

-- CreateIndex
CREATE INDEX "OperationPrintOrder_status_idx" ON "OperationPrintOrder"("status");

-- CreateIndex
CREATE INDEX "OperationPrintOrder_productType_idx" ON "OperationPrintOrder"("productType");

-- CreateIndex
CREATE INDEX "OperationPrintOrder_finishedGoodCode_idx" ON "OperationPrintOrder"("finishedGoodCode");

-- CreateIndex
CREATE INDEX "OperationPrintOrder_createdAt_idx" ON "OperationPrintOrder"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "OperationPrintOrderItem_digitalBatchItemId_key" ON "OperationPrintOrderItem"("digitalBatchItemId");

-- CreateIndex
CREATE INDEX "OperationPrintOrderItem_printOrderId_idx" ON "OperationPrintOrderItem"("printOrderId");

-- CreateIndex
CREATE INDEX "OperationPrintOrderItem_digitalBatchItemId_idx" ON "OperationPrintOrderItem"("digitalBatchItemId");

-- CreateIndex
CREATE INDEX "OperationPrintOrderItem_internalLabel_idx" ON "OperationPrintOrderItem"("internalLabel");

-- CreateIndex
CREATE INDEX "OperationPrintOrderItem_status_idx" ON "OperationPrintOrderItem"("status");

-- AddForeignKey
ALTER TABLE "OperationPrintOrder" ADD CONSTRAINT "OperationPrintOrder_digitalBatchId_fkey" FOREIGN KEY ("digitalBatchId") REFERENCES "OperationDigitalBatch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperationPrintOrderItem" ADD CONSTRAINT "OperationPrintOrderItem_printOrderId_fkey" FOREIGN KEY ("printOrderId") REFERENCES "OperationPrintOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperationPrintOrderItem" ADD CONSTRAINT "OperationPrintOrderItem_digitalBatchItemId_fkey" FOREIGN KEY ("digitalBatchItemId") REFERENCES "OperationDigitalBatchItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
