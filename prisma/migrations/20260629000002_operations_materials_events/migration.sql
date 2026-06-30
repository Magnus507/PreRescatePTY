-- CreateTable
CREATE TABLE "OperationMaterial" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "supplierName" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OperationMaterial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OperationMaterialEvent" (
    "id" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "reason" TEXT,
    "referenceType" TEXT,
    "referenceId" TEXT,
    "metadataJson" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OperationMaterialEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OperationMaterial_code_key" ON "OperationMaterial"("code");

-- CreateIndex
CREATE INDEX "OperationMaterial_category_idx" ON "OperationMaterial"("category");

-- CreateIndex
CREATE INDEX "OperationMaterial_status_idx" ON "OperationMaterial"("status");

-- CreateIndex
CREATE INDEX "OperationMaterial_createdAt_idx" ON "OperationMaterial"("createdAt");

-- CreateIndex
CREATE INDEX "OperationMaterialEvent_materialId_idx" ON "OperationMaterialEvent"("materialId");

-- CreateIndex
CREATE INDEX "OperationMaterialEvent_eventType_idx" ON "OperationMaterialEvent"("eventType");

-- CreateIndex
CREATE INDEX "OperationMaterialEvent_createdById_idx" ON "OperationMaterialEvent"("createdById");

-- CreateIndex
CREATE INDEX "OperationMaterialEvent_createdAt_idx" ON "OperationMaterialEvent"("createdAt");

-- AddForeignKey
ALTER TABLE "OperationMaterialEvent" ADD CONSTRAINT "OperationMaterialEvent_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperationMaterialEvent" ADD CONSTRAINT "OperationMaterialEvent_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "OperationMaterial"("id") ON DELETE CASCADE ON UPDATE CASCADE;

