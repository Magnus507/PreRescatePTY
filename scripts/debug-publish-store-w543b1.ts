import { prisma } from "@/lib/prisma";
import { extractOperationsProductCode } from "@/lib/operations/sync-operations-product-to-store";
import { loadInventoryStockRows } from "@/lib/operations/inventory-stock";

function getArg(flag: string) {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] : null;
}

function stripMarker(description: string | null | undefined) {
  if (!description) return null;
  return description.replace(/\n?\[operationsProductCode:[^\]]+\]/g, "").trim() || null;
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
      select: { id: true, name: true, description: true, productType: true, isActive: true, price: true },
      orderBy: { updatedAt: "desc" },
    }),
    loadInventoryStockRows(),
  ]);

  const marker = `[operationsProductCode:${code}]`;
  const byMarker = storeProducts.filter((product) => product.description?.includes(marker));
  const byName = storeProducts.filter((product) => product.name === "Sticker PreRescatePTY" || product.name === "Sticker PreRescatePTY Empresarial");
  const byProductType = storeProducts.filter((product) => product.productType === code);
  const activeProductsWithMarker = byMarker.filter((product) => product.isActive);
  const inactiveProductsWithMarker = byMarker.filter((product) => !product.isActive);
  const duplicates = storeProducts.filter((product) => extractOperationsProductCode(product) === code).length > 1;
  const matchedStock = stockRows.find((row) => row.productCode === code) || null;
  const publicApiWouldReturn = activeProductsWithMarker.length > 0;
  const publicApiReason = publicApiWouldReturn ? "active marker match" : "inactive or missing marker";
  const buttonShouldShowPublished = activeProductsWithMarker.length > 0;

  console.log("=== W5.43B.1 Publish Debug ===");
  console.log("OperationFinishedGood:");
  console.log(`- exists: ${Boolean(operationProduct)}`);
  console.log(`- id: ${operationProduct?.id || null}`);
  console.log(`- code: ${operationProduct?.code || code}`);
  console.log(`- name: ${operationProduct?.name || null}`);
  console.log(`- status: ${operationProduct?.status || null}`);
  console.log("Product matches:");
  console.log(`- byMarker count: ${byMarker.length}`);
  console.log(`- byMarker ids: ${byMarker.map((product) => product.id).join(", ") || "none"}`);
  console.log(`- byName count: ${byName.length}`);
  console.log(`- byName ids: ${byName.map((product) => product.id).join(", ") || "none"}`);
  console.log(`- byProductType count: ${byProductType.length}`);
  console.log(`- activeProductsWithMarker: ${activeProductsWithMarker.length}`);
  console.log(`- inactiveProductsWithMarker: ${inactiveProductsWithMarker.length}`);
  console.log(`- duplicates: ${duplicates}`);
  console.log("Expected button state:");
  console.log(`- shouldShowPublished: ${buttonShouldShowPublished}`);
  console.log(`- reason: ${buttonShouldShowPublished ? "marker exact + active" : "missing marker or inactive"}`);
  console.log("Public API:");
  console.log(`- wouldReturnInApiProducts: ${publicApiWouldReturn}`);
  console.log(`- reason: ${publicApiReason}`);
  console.log(`- availableStock: ${matchedStock?.availableCount ?? 0}`);
  console.log(`- reservedStock: ${matchedStock?.reservedCount ?? 0}`);
  console.log(`- descriptionClean: ${stripMarker(byMarker[0]?.description || null)}`);
  console.log("Admin products:");
  console.log(`- appearsInAdminProducts: ${byMarker.length > 0}`);
  console.log(`- isActive: ${byMarker[0]?.isActive ?? null}`);
  console.log(`- markerPresent: ${Boolean(byMarker[0]?.description?.includes(marker))}`);
  console.log("Sync helper:");
  console.log(`- matchStrategy: ${byMarker.length > 0 ? "marker" : byProductType.length > 0 ? "productType" : byName.length > 0 ? "name" : "none"}`);
  console.log(`- isActive: ${byMarker[0]?.isActive ?? false}`);
  console.log(`- markerPresent: ${Boolean(byMarker[0]?.description?.includes(marker))}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : String(error));
  process.exit(1);
});
