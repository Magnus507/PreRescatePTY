-- AlterTable
ALTER TABLE "OperationDigitalBatchItem" ADD COLUMN     "nfcProgrammed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "preparedAt" TIMESTAMP(3),
ADD COLUMN     "preparedBy" TEXT,
ADD COLUMN     "productionOrderId" TEXT,
ADD COLUMN     "qrPrepared" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "OperationDigitalBatchItem_productionOrderId_idx" ON "OperationDigitalBatchItem"("productionOrderId");

-- AddForeignKey
ALTER TABLE "OperationDigitalBatchItem" ADD CONSTRAINT "OperationDigitalBatchItem_productionOrderId_fkey" FOREIGN KEY ("productionOrderId") REFERENCES "OperationProductionOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
