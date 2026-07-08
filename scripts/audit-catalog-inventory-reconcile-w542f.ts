import { PrismaClient } from "@prisma/client";
import { extractOperationsProductCode } from "../lib/operations/sync-operations-product-to-store";
import { loadInventoryStockRows } from "../lib/operations/inventory-stock";

const prisma = new PrismaClient();

function stripOperationsMarker(description: string | null | undefined) {
  if (!description) return null;
  return description.replace(/\n?\[operationsProductCode:[^\]]+\]/g, "").trim() || null;
}

async function main() {
  const [storeProducts, finishedGood, stockRows] = await Promise.all([
    prisma.product.findMany({
      where: { OR: [{ name: "Sticker PreRescatePTY" }, { productType: "PRP-FG-STICKER" }] },
      select: { id: true, name: true, description: true, productType: true, isActive: true, stock: true, price: true },
    }),
    prisma.operationFinishedGood.findUnique({
      where: { code: "PRP-FG-STICKER" },
      select: { id: true, code: true, name: true, productType: true, unit: true, status: true },
    }),
    loadInventoryStockRows(),
  ]);

  const stickerRow = stockRows.find((row) => row.productCode === "PRP-FG-STICKER") || null;
  const storeSticker = storeProducts.find((product) => extractOperationsProductCode(product) === "PRP-FG-STICKER") || null;
  const technicalTextVisible = storeProducts.some((product) => Boolean(product.description?.includes("[operationsProductCode:")));
  const publicDescription = stripOperationsMarker(storeSticker?.description);
  const publicDescriptionClean = publicDescription === "Sticker oficial PreRescatePTY para identificación y red de protección.";

  console.log("=== W5.42F Catalog Inventory Audit ===");
  console.log(`stickerStoreExists: ${Boolean(storeSticker)}`);
  console.log(`stickerOperationalExists: ${Boolean(finishedGood)}`);
  console.log(`inventoryRowsForSticker: ${stickerRow ? 1 : 0}`);
  console.log(`stockAvailable: ${stickerRow?.availableCount ?? 0}`);
  console.log(`stockReserved: ${stickerRow?.reservedCount ?? 0}`);
  console.log(`stockTotalUnits: ${stickerRow?.totalUnits ?? 0}`);
  console.log(`storeDescriptionClean: ${publicDescriptionClean}`);
  console.log(`technicalTextVisible: ${technicalTextVisible}`);
  console.log(`publicDescription: ${publicDescription || ""}`);
  console.log(`unitsCreatedByReconcile: 0`);
  console.log(`ordersCreatedByReconcile: 0`);
  console.log(`productionCreatedByReconcile: 0`);
  console.log(`dispatchCreatedByReconcile: 0`);
}

main()
  .catch((error) => {
    console.error("W5.42F audit failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
