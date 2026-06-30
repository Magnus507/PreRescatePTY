-- CreateTable
CREATE TABLE "OperationDispatch" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "destinationType" TEXT NOT NULL DEFAULT 'customer',
    "destinationName" TEXT,
    "destinationReference" TEXT,
    "destinationAddress" TEXT,
    "scheduledAt" TIMESTAMP(3),
    "dispatchedAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OperationDispatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OperationDispatchItem" (
    "id" TEXT NOT NULL,
    "dispatchId" TEXT NOT NULL,
    "finishedGoodId" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OperationDispatchItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OperationDispatchEvent" (
    "id" TEXT NOT NULL,
    "dispatchId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION,
    "reason" TEXT,
    "referenceType" TEXT,
    "referenceId" TEXT,
    "metadataJson" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OperationDispatchEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OperationDispatch_code_key" ON "OperationDispatch"("code");

-- CreateIndex
CREATE INDEX "OperationDispatch_status_idx" ON "OperationDispatch"("status");

-- CreateIndex
CREATE INDEX "OperationDispatch_destinationType_idx" ON "OperationDispatch"("destinationType");

-- CreateIndex
CREATE INDEX "OperationDispatch_createdAt_idx" ON "OperationDispatch"("createdAt");

-- CreateIndex
CREATE INDEX "OperationDispatchItem_dispatchId_idx" ON "OperationDispatchItem"("dispatchId");

-- CreateIndex
CREATE INDEX "OperationDispatchItem_finishedGoodId_idx" ON "OperationDispatchItem"("finishedGoodId");

-- CreateIndex
CREATE INDEX "OperationDispatchEvent_dispatchId_idx" ON "OperationDispatchEvent"("dispatchId");

-- CreateIndex
CREATE INDEX "OperationDispatchEvent_eventType_idx" ON "OperationDispatchEvent"("eventType");

-- CreateIndex
CREATE INDEX "OperationDispatchEvent_createdById_idx" ON "OperationDispatchEvent"("createdById");

-- CreateIndex
CREATE INDEX "OperationDispatchEvent_createdAt_idx" ON "OperationDispatchEvent"("createdAt");

-- AddForeignKey
ALTER TABLE "OperationDispatchItem" ADD CONSTRAINT "OperationDispatchItem_dispatchId_fkey" FOREIGN KEY ("dispatchId") REFERENCES "OperationDispatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperationDispatchItem" ADD CONSTRAINT "OperationDispatchItem_finishedGoodId_fkey" FOREIGN KEY ("finishedGoodId") REFERENCES "OperationFinishedGood"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperationDispatchEvent" ADD CONSTRAINT "OperationDispatchEvent_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperationDispatchEvent" ADD CONSTRAINT "OperationDispatchEvent_dispatchId_fkey" FOREIGN KEY ("dispatchId") REFERENCES "OperationDispatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
