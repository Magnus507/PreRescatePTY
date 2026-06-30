-- CreateTable
CREATE TABLE "PointOfSale" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "contactName" TEXT,
    "contactPhone" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PointOfSale_pkey" PRIMARY KEY ("id")
);

-- AlterTable: Agregar columnas a Chip
ALTER TABLE "Chip" ADD COLUMN "pointOfSaleId" TEXT;
ALTER TABLE "Chip" ADD COLUMN "consignedAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "PointOfSale_name_key" ON "PointOfSale"("name");
CREATE INDEX "PointOfSale_isActive_idx" ON "PointOfSale"("isActive");

-- CreateIndex
CREATE INDEX "Chip_pointOfSaleId_idx" ON "Chip"("pointOfSaleId");

-- AddForeignKey
ALTER TABLE "Chip" ADD CONSTRAINT "Chip_pointOfSaleId_fkey" FOREIGN KEY ("pointOfSaleId") REFERENCES "PointOfSale"("id") ON DELETE SET NULL ON UPDATE CASCADE;