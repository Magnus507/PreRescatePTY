-- CreateTable
CREATE TABLE "OperationCommercialOrder" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "customerType" TEXT NOT NULL DEFAULT 'customer',
    "customerName" TEXT,
    "customerEmail" TEXT,
    "customerPhone" TEXT,
    "customerReference" TEXT,
    "salesChannel" TEXT NOT NULL DEFAULT 'admin',
    "paymentStatus" TEXT NOT NULL DEFAULT 'pending',
    "fulfillmentStatus" TEXT NOT NULL DEFAULT 'pending',
    "totalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "dispatchId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OperationCommercialOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OperationCommercialOrderItem" (
    "id" TEXT NOT NULL,
    "commercialOrderId" TEXT NOT NULL,
    "finishedGoodId" TEXT,
    "productCode" TEXT,
    "productName" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "totalPrice" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'unit',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OperationCommercialOrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OperationCommercialOrderEvent" (
    "id" TEXT NOT NULL,
    "commercialOrderId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "amount" DOUBLE PRECISION,
    "reason" TEXT,
    "referenceType" TEXT,
    "referenceId" TEXT,
    "metadataJson" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OperationCommercialOrderEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OperationCommercialOrder_code_key" ON "OperationCommercialOrder"("code");

-- CreateIndex
CREATE INDEX "OperationCommercialOrder_status_idx" ON "OperationCommercialOrder"("status");

-- CreateIndex
CREATE INDEX "OperationCommercialOrder_customerType_idx" ON "OperationCommercialOrder"("customerType");

-- CreateIndex
CREATE INDEX "OperationCommercialOrder_salesChannel_idx" ON "OperationCommercialOrder"("salesChannel");

-- CreateIndex
CREATE INDEX "OperationCommercialOrder_paymentStatus_idx" ON "OperationCommercialOrder"("paymentStatus");

-- CreateIndex
CREATE INDEX "OperationCommercialOrder_fulfillmentStatus_idx" ON "OperationCommercialOrder"("fulfillmentStatus");

-- CreateIndex
CREATE INDEX "OperationCommercialOrder_dispatchId_idx" ON "OperationCommercialOrder"("dispatchId");

-- CreateIndex
CREATE INDEX "OperationCommercialOrder_createdAt_idx" ON "OperationCommercialOrder"("createdAt");

-- CreateIndex
CREATE INDEX "OperationCommercialOrderItem_commercialOrderId_idx" ON "OperationCommercialOrderItem"("commercialOrderId");

-- CreateIndex
CREATE INDEX "OperationCommercialOrderItem_finishedGoodId_idx" ON "OperationCommercialOrderItem"("finishedGoodId");

-- CreateIndex
CREATE INDEX "OperationCommercialOrderItem_productCode_idx" ON "OperationCommercialOrderItem"("productCode");

-- CreateIndex
CREATE INDEX "OperationCommercialOrderEvent_commercialOrderId_idx" ON "OperationCommercialOrderEvent"("commercialOrderId");

-- CreateIndex
CREATE INDEX "OperationCommercialOrderEvent_eventType_idx" ON "OperationCommercialOrderEvent"("eventType");

-- CreateIndex
CREATE INDEX "OperationCommercialOrderEvent_createdById_idx" ON "OperationCommercialOrderEvent"("createdById");

-- CreateIndex
CREATE INDEX "OperationCommercialOrderEvent_createdAt_idx" ON "OperationCommercialOrderEvent"("createdAt");

-- AddForeignKey
ALTER TABLE "OperationCommercialOrder" ADD CONSTRAINT "OperationCommercialOrder_dispatchId_fkey" FOREIGN KEY ("dispatchId") REFERENCES "OperationDispatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperationCommercialOrderItem" ADD CONSTRAINT "OperationCommercialOrderItem_commercialOrderId_fkey" FOREIGN KEY ("commercialOrderId") REFERENCES "OperationCommercialOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperationCommercialOrderItem" ADD CONSTRAINT "OperationCommercialOrderItem_finishedGoodId_fkey" FOREIGN KEY ("finishedGoodId") REFERENCES "OperationFinishedGood"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperationCommercialOrderEvent" ADD CONSTRAINT "OperationCommercialOrderEvent_commercialOrderId_fkey" FOREIGN KEY ("commercialOrderId") REFERENCES "OperationCommercialOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperationCommercialOrderEvent" ADD CONSTRAINT "OperationCommercialOrderEvent_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
