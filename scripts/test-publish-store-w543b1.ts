import { prisma } from "@/lib/prisma";
import { extractOperationsProductCode } from "@/lib/operations/sync-operations-product-to-store";
import { loadInventoryStockRows } from "@/lib/operations/inventory-stock";

function getArg(flag: string) {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] : null;
}

async function main() {
  const code = getArg("--code") || "";
  const dryRun = process.argv.includes("--dry-run");
  const execute = process.argv.includes("--execute");

  if (!code) throw new Error("Missing --code");
  if (!dryRun && !execute) throw new Error("Use --dry-run or --execute");
  if (execute) {
    throw new Error("Execute mode is intentionally disabled in this guarded script");
  }

  const [operationProduct, storeProducts, stockRows] = await Promise.all([
    prisma.operationFinishedGood.findUnique({
      where: { code },
      select: { id: true, code: true, name: true, status: true },
    }),
    prisma.product.findMany({
      select: { id: true, name: true, description: true, productType: true, isActive: true, price: true },
      orderBy: { updatedAt: "desc" },
    }),
    loadInventoryStockRows(),
  ]);

  const marker = `[operationsProductCode:${code}]`;
  const storeProduct = storeProducts.find((product) => product.description?.includes(marker)) || null;
  const stock = stockRows.find((row) => row.productCode === code) || null;

  console.log("=== W5.43B.1 Publish Test (dry-run) ===");
  console.log(`operationProductExists: ${Boolean(operationProduct)}`);
  console.log(`storeProductExists: ${Boolean(storeProduct)}`);
  console.log(`storeProductIsActive: ${storeProduct?.isActive ?? false}`);
  console.log(`markerPresent: ${Boolean(storeProduct?.description?.includes(marker))}`);
  console.log(`publicApiWouldReturn: ${Boolean(storeProduct?.isActive && extractOperationsProductCode(storeProduct) === code)}`);
  console.log(`availableStock: ${stock?.availableCount ?? 0}`);
  console.log(`reservedStock: ${stock?.reservedCount ?? 0}`);
  console.log(`descriptionClean: ${storeProduct?.description?.replace(/\n?\[operationsProductCode:[^\]]+\]/g, "").trim() || null}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : String(error));
  process.exit(1);
});
