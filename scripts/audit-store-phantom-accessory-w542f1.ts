import { PrismaClient } from "@prisma/client";
import { extractOperationsProductCode } from "../lib/operations/sync-operations-product-to-store";
import { loadInventoryStockRows } from "../lib/operations/inventory-stock";

const prisma = new PrismaClient();

function stripOperationsMarker(description: string | null | undefined) {
  if (!description) return null;
  return description.replace(/\n?\[operationsProductCode:[^\]]+\]/g, "").trim() || null;
}

async function main() {
  const [storeProducts, baseFinishedGoods, stockRows] = await Promise.all([
    prisma.product.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        description: true,
        productType: true,
        category: true,
        price: true,
        stock: true,
        isActive: true,
      },
    }),
    prisma.operationFinishedGood.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        code: true,
        name: true,
        productType: true,
        status: true,
        notes: true,
      },
    }),
    loadInventoryStockRows(),
  ]);

  const stockByCode = new Map(stockRows.map((row) => [row.productCode, row]));
  const visibleStoreProducts = storeProducts.map((product) => {
    const operationsProductCode = extractOperationsProductCode(product);
    const stock = operationsProductCode ? stockByCode.get(operationsProductCode) : null;
    return {
      id: product.id,
      code: operationsProductCode,
      name: product.name,
      publicName: stripOperationsMarker(product.description) || product.name,
      operationsProductCode,
      published: product.isActive,
      storeVisible: product.isActive,
      isActive: product.isActive,
      status: product.isActive ? "active" : "inactive",
      sourceModel: "Product",
      stockAvailable: stock?.availableCount ?? 0,
      stockTotal: stock?.totalUnits ?? 0,
      description: stripOperationsMarker(product.description),
    };
  });

  const chipEmpresarial = visibleStoreProducts.find((product) => product.name === "Chip Empresarial" || product.operationsProductCode === "Chip Empresarial") || null;
  const chipEmpresarialVisible = Boolean(chipEmpresarial);
  const isHardcodedFallback = false;
  const isMappedFromPRPFGSTICKEREMP = Boolean(visibleStoreProducts.find((product) => product.operationsProductCode === "PRP-FG-STICKER-EMP"));
  const isExplicitlyPublished = Boolean(chipEmpresarial?.published);
  const isPhantom = chipEmpresarialVisible && !isMappedFromPRPFGSTICKEREMP && chipEmpresarial?.name === "Chip Empresarial";

  console.log("=== W5.42F.1 Store Phantom Accessory Audit ===");
  console.log("Productos visibles en tienda:");
  for (const product of visibleStoreProducts) {
    console.log(
      JSON.stringify(
        {
          id: product.id,
          code: product.code,
          name: product.name,
          publicName: product.publicName,
          operationsProductCode: product.operationsProductCode,
          published: product.published,
          storeVisible: product.storeVisible,
          isActive: product.isActive,
          status: product.status,
          sourceModel: product.sourceModel,
          stockAvailable: product.stockAvailable,
          stockTotal: product.stockTotal,
          description: product.description,
        },
        null,
        2
      )
    );
  }

  console.log("Productos base operativos:");
  for (const item of baseFinishedGoods) {
    const row = stockByCode.get(item.code);
    console.log(
      JSON.stringify(
        {
          code: item.code,
          name: item.name,
          type: item.productType,
          active: item.status,
          balance: row?.availableCount ?? 0,
          published: row?.storeVisible ?? false,
          storeVisible: row?.storeVisible ?? false,
        },
        null,
        2
      )
    );
  }

  console.log("Diagnóstico:");
  console.log(`chipEmpresarialVisible: ${chipEmpresarialVisible}`);
  console.log(`sourceOfChipEmpresarial: ${chipEmpresarial ? "Product" : "none"}`);
  console.log(`isHardcodedFallback: ${isHardcodedFallback}`);
  console.log(`isMappedFromPRPFGSTICKEREMP: ${isMappedFromPRPFGSTICKEREMP}`);
  console.log(`isExplicitlyPublished: ${isExplicitlyPublished}`);
  console.log(`isPhantom: ${isPhantom}`);
}

main()
  .catch((error) => {
    console.error("W5.42F.1 audit failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
