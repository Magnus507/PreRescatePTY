import { prisma } from "../lib/prisma";
import { extractOperationsProductCode } from "../lib/operations/sync-operations-product-to-store";
import { loadInventoryStockRows } from "../lib/operations/inventory-stock";

async function main() {
  const [storeProducts, stockRows] = await Promise.all([
    prisma.product.findMany({
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, productType: true, description: true, stock: true, price: true, isActive: true },
    }),
    loadInventoryStockRows(),
  ]);

  const publishedCodes = new Map<string, string>();
  for (const product of storeProducts) {
    const code = extractOperationsProductCode(product);
    if (code && !publishedCodes.has(code)) publishedCodes.set(code, product.id);
  }

  const linkedStockRows = stockRows.filter((row) => row.storeProductId);
  const unlinkedStockRows = stockRows.filter((row) => !row.storeProductId);
  const productsWithoutLink = storeProducts.filter((product) => !extractOperationsProductCode(product));

  console.log(JSON.stringify({
    storeProducts: storeProducts.length,
    stockRows: stockRows.length,
    linkedStockRows: linkedStockRows.length,
    unlinkedStockRows: unlinkedStockRows.length,
    productsWithoutLink: productsWithoutLink.map((product) => ({
      id: product.id,
      name: product.name,
      productType: product.productType,
      stock: product.stock,
      price: product.price,
      isActive: product.isActive,
    })),
    stockSummary: stockRows.map((row) => ({
      productCode: row.productCode,
      productName: row.productName,
      storeProductId: row.storeProductId,
      availableCount: row.availableCount,
      reservedCount: row.reservedCount,
      qaPendingCount: row.qaPendingCount,
      qaFailedCount: row.qaFailedCount,
      totalUnits: row.totalUnits,
    })),
  }, null, 2));
}

main().catch((error) => {
  console.error("[audit-store-inventory-sync-w540x]", error);
  process.exitCode = 1;
});
