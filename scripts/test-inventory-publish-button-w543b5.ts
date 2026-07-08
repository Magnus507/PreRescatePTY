import { syncOperationsProductToStore } from "@/lib/operations/sync-operations-product-to-store";
import { prisma } from "@/lib/prisma";
import { loadInventoryStockRows } from "@/lib/operations/inventory-stock";

function getArg(flag: string) {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] : null;
}

function hasFlag(flag: string) {
  return process.argv.includes(flag);
}

async function getState(code: string) {
  const marker = `[operationsProductCode:${code}]`;
  const [operationProduct, storeProducts, stockRows] = await Promise.all([
    prisma.operationFinishedGood.findUnique({
      where: { code },
      select: { id: true, code: true, name: true, status: true, productType: true, unit: true },
    }),
    prisma.product.findMany({
      select: { id: true, name: true, description: true, productType: true, category: true, price: true, stock: true, isActive: true },
      orderBy: { updatedAt: "desc" },
    }),
    loadInventoryStockRows(),
  ]);

  const exact = storeProducts.filter((product) => product.description?.includes(marker));
  const active = exact.filter((product) => product.isActive);
  const inactive = exact.filter((product) => !product.isActive);
  const stock = stockRows.find((row) => row.productCode === code) || null;
  const storeProduct = exact[0] || null;

  return {
    operationProduct,
    storeProduct,
    exact,
    active,
    inactive,
    stock,
    shouldShowPublished: active.length > 0,
    buttonLabel: active.length > 0 ? "Dejar de publicar" : "Publicar en Tienda",
    apiWouldReturn: active.length > 0,
  };
}

async function main() {
  const code = getArg("--code") || "";
  const dryRun = hasFlag("--dry-run");
  const execute = hasFlag("--execute");
  const confirm = getArg("--confirm");
  const prepareInactive = hasFlag("--prepare-inactive");

  if (!code) throw new Error("Missing --code");
  if (!dryRun && !execute) throw new Error("Use --dry-run or --execute");
  if (execute && confirm !== "PUBLISH_BUTTON_W543B5") throw new Error("Missing confirmation token");

  const before = await getState(code);
  console.log("=== W5.43B.5 Publish Button Test ===");
  console.log(`before.isActive: ${before.storeProduct?.isActive ?? null}`);
  console.log(`before.buttonLabel: ${before.buttonLabel}`);
  console.log(`before.apiWouldReturn: ${before.apiWouldReturn}`);
  console.log(`before.stock: ${before.stock?.availableCount ?? 0}`);

  if (dryRun) {
    return;
  }

  if (execute) {
    const codeName = before.operationProduct?.name || "Sticker PreRescatePTY";
    const baseInput = {
      operationsProductCode: code,
      operationsProductName: codeName,
      productType: code,
      defaultPrice: 25,
      category: "Sticker Base",
      description: "Sticker oficial PreRescatePTY para identificación y red de protección.",
    };

    if (prepareInactive) {
      await syncOperationsProductToStore({ ...baseInput, isActive: false });
    }

    const publishResult = await syncOperationsProductToStore({ ...baseInput, isActive: true });
    const after = await getState(code);

    console.log(`publishResult.isActive: ${publishResult.isActive}`);
    console.log(`publishResult.markerPresent: ${publishResult.markerPresent}`);
    console.log(`publishResult.matchStrategy: ${publishResult.matchStrategy}`);
    console.log(`after.isActive: ${after.storeProduct?.isActive ?? null}`);
    console.log(`after.buttonLabel: ${after.buttonLabel}`);
    console.log(`after.apiWouldReturn: ${after.apiWouldReturn}`);
    console.log(`after.stock: ${after.stock?.availableCount ?? 0}`);

    if (after.storeProduct?.isActive !== true) {
      throw new Error("Publish did not activate the store product");
    }
    if (after.buttonLabel !== "Dejar de publicar") {
      throw new Error("Button label did not update to Dejar de publicar");
    }
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : String(error));
  process.exit(1);
});
