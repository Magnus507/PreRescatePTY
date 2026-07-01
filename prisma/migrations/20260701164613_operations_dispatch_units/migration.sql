-- DropForeignKey
ALTER TABLE "OperationDispatchItem" DROP CONSTRAINT "OperationDispatchItem_finishedGoodId_fkey";

-- AlterTable
ALTER TABLE "OperationDispatch" ADD COLUMN     "carrierName" TEXT,
ADD COLUMN     "sentAt" TIMESTAMP(3),
ADD COLUMN     "trackingReference" TEXT;

-- AlterTable
ALTER TABLE "OperationDispatchItem" ADD COLUMN     "deliveredAt" TIMESTAMP(3),
ADD COLUMN     "dispatchedAt" TIMESTAMP(3),
ADD COLUMN     "internalLabel" TEXT,
ADD COLUMN     "packedAt" TIMESTAMP(3),
ADD COLUMN     "pickedAt" TIMESTAMP(3),
ADD COLUMN     "productCode" TEXT,
ADD COLUMN     "productName" TEXT,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'pending_pick',
ADD COLUMN     "unitId" TEXT,
ALTER COLUMN "finishedGoodId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "OperationFinishedGoodUnit" ALTER COLUMN "status" SET DEFAULT 'qa_pending';

-- CreateIndex
CREATE INDEX "OperationDispatchItem_unitId_idx" ON "OperationDispatchItem"("unitId");

-- CreateIndex
CREATE INDEX "OperationDispatchItem_status_idx" ON "OperationDispatchItem"("status");

-- AddForeignKey
ALTER TABLE "OperationDispatchItem" ADD CONSTRAINT "OperationDispatchItem_finishedGoodId_fkey" FOREIGN KEY ("finishedGoodId") REFERENCES "OperationFinishedGood"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperationDispatchItem" ADD CONSTRAINT "OperationDispatchItem_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "OperationFinishedGoodUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
