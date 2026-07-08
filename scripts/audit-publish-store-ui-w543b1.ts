import { prisma } from "@/lib/prisma";
import { extractOperationsProductCode } from "@/lib/operations/sync-operations-product-to-store";
import { loadInventoryStockRows } from "@/lib/operations/inventory-stock";

function getArg(flag: string) {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] : null;
}

async function main() {
  const code = getArg("--code") || "";
  if (!code) throw new Error("Missing --code");

  const [operationProduct, storeProducts, stockRows] = await Promise.all([
    prisma.operationFinishedGood.findUnique({
      where: { code },
      select: { id: true, code: true, name: true, status: true },
    }),
    prisma.product.findMany({
      select: { id: true, name: true, description: true, productType: true, isActive: true },
      orderBy: { updatedAt: "desc" },
    }),
    loadInventoryStockRows(),
  ]);

  const marker = `[operationsProductCode:${code}]`;
  const exactMatches = storeProducts.filter((product) => product.description?.includes(marker));
  const activeMatches = exactMatches.filter((product) => product.isActive);
  const inactiveMatches = exactMatches.filter((product) => !product.isActive);
  const stock = stockRows.find((row) => row.productCode === code) || null;

  console.log("=== W5.43B.1 Publish UI Audit ===");
  console.log(`operationProductExists: ${Boolean(operationProduct)}`);
  console.log(`exactMatches: ${exactMatches.length}`);
  console.log(`activeMatches: ${activeMatches.length}`);
  console.log(`inactiveMatches: ${inactiveMatches.length}`);
  console.log(`shouldButtonShowDejarDePublicar: ${activeMatches.length > 0}`);
  console.log(`shouldButtonShowPublicarEnTienda: ${activeMatches.length === 0}`);
  console.log(`stockAvailable: ${stock?.availableCount ?? 0}`);
  console.log(`stockReserved: ${stock?.reservedCount ?? 0}`);
  console.log(`apiWouldReturn: ${activeMatches.length > 0 && extractOperationsProductCode(activeMatches[0]) === code}`);
  console.log(`markerCleanDescription: ${activeMatches[0]?.description?.replace(/\n?\[operationsProductCode:[^\]]+\]/g, "").trim() || null}`);
  console.log(`otherCodeContamination: ${storeProducts.some((product) => product.description?.includes("[operationsProductCode:PRP-FG-STICKER]") && code !== "PRP-FG-STICKER" && extractOperationsProductCode(product) === code)}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : String(error));
  process.exit(1);
});
