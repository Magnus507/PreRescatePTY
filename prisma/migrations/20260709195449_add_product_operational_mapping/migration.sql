-- CreateTable
CREATE TABLE "ProductOperationalMapping" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "finishedGoodId" TEXT,
    "productCode" TEXT,
    "deviceType" TEXT NOT NULL,
    "storeSection" TEXT NOT NULL,
    "purchaseFlow" TEXT NOT NULL,
    "activationFlow" TEXT NOT NULL,
    "visibilityRules" TEXT,
    "requiresCompanyContext" BOOLEAN NOT NULL DEFAULT false,
    "requiresApproval" BOOLEAN NOT NULL DEFAULT false,
    "requiresPersonalization" BOOLEAN NOT NULL DEFAULT false,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "badgeLabel" TEXT,
    "badgeColor" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductOperationalMapping_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProductOperationalMapping_productId_key" ON "ProductOperationalMapping"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductOperationalMapping_finishedGoodId_key" ON "ProductOperationalMapping"("finishedGoodId");

-- CreateIndex
CREATE INDEX "ProductOperationalMapping_deviceType_idx" ON "ProductOperationalMapping"("deviceType");

-- CreateIndex
CREATE INDEX "ProductOperationalMapping_storeSection_idx" ON "ProductOperationalMapping"("storeSection");

-- CreateIndex
CREATE INDEX "ProductOperationalMapping_isPublished_idx" ON "ProductOperationalMapping"("isPublished");

-- CreateIndex
CREATE INDEX "ProductOperationalMapping_productCode_idx" ON "ProductOperationalMapping"("productCode");

-- AddForeignKey
ALTER TABLE "ProductOperationalMapping" ADD CONSTRAINT "ProductOperationalMapping_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductOperationalMapping" ADD CONSTRAINT "ProductOperationalMapping_finishedGoodId_fkey" FOREIGN KEY ("finishedGoodId") REFERENCES "OperationFinishedGood"("id") ON DELETE SET NULL ON UPDATE CASCADE;
