-- AlterTable
ALTER TABLE "OperationReplacement" ADD COLUMN     "originalInternalLabel" TEXT,
ADD COLUMN     "originalUnitId" TEXT,
ADD COLUMN     "replacementInternalLabel" TEXT,
ADD COLUMN     "replacementUnitId" TEXT;

-- AlterTable
ALTER TABLE "OperationReturn" ADD COLUMN     "internalLabel" TEXT,
ADD COLUMN     "productCode" TEXT,
ADD COLUMN     "productName" TEXT,
ADD COLUMN     "unitId" TEXT;

-- AlterTable
ALTER TABLE "OperationWarranty" ADD COLUMN     "internalLabel" TEXT,
ADD COLUMN     "productCode" TEXT,
ADD COLUMN     "productName" TEXT,
ADD COLUMN     "unitId" TEXT;

-- CreateIndex
CREATE INDEX "OperationReplacement_originalUnitId_idx" ON "OperationReplacement"("originalUnitId");

-- CreateIndex
CREATE INDEX "OperationReplacement_replacementUnitId_idx" ON "OperationReplacement"("replacementUnitId");

-- CreateIndex
CREATE INDEX "OperationReturn_unitId_idx" ON "OperationReturn"("unitId");

-- CreateIndex
CREATE INDEX "OperationWarranty_unitId_idx" ON "OperationWarranty"("unitId");

-- AddForeignKey
ALTER TABLE "OperationWarranty" ADD CONSTRAINT "OperationWarranty_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "OperationFinishedGoodUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperationReplacement" ADD CONSTRAINT "OperationReplacement_originalUnitId_fkey" FOREIGN KEY ("originalUnitId") REFERENCES "OperationFinishedGoodUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperationReplacement" ADD CONSTRAINT "OperationReplacement_replacementUnitId_fkey" FOREIGN KEY ("replacementUnitId") REFERENCES "OperationFinishedGoodUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperationReturn" ADD CONSTRAINT "OperationReturn_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "OperationFinishedGoodUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
