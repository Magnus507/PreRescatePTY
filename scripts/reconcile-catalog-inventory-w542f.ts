import { PrismaClient } from "@prisma/client";
import { syncOperationsProductToStore } from "../lib/operations/sync-operations-product-to-store";

const prisma = new PrismaClient();
const CONFIRMATION = "RECONCILE_CATALOG_INVENTORY_W542F";

function hasFlag(argv: string[], flag: string) {
  return argv.includes(flag);
}

async function main() {
  const argv = process.argv.slice(2);
  const dryRun = !hasFlag(argv, "--execute") || hasFlag(argv, "--dry-run");
  const confirmIndex = argv.indexOf("--confirm");
  const confirm = confirmIndex >= 0 ? argv[confirmIndex + 1] || "" : "";

  if (!dryRun && confirm !== CONFIRMATION) {
    throw new Error(`Run with --execute --confirm ${CONFIRMATION} to apply changes.`);
  }

  const [storeProducts, operationalSticker, stickerUnits] = await Promise.all([
    prisma.product.findMany({
      where: {
        OR: [
          { name: "Sticker PreRescatePTY" },
          { productType: "PRP-FG-STICKER" },
          { description: { contains: "[operationsProductCode:PRP-FG-STICKER]" } },
        ],
      },
      select: { id: true, name: true, description: true, productType: true, isActive: true, price: true, stock: true },
    }),
    prisma.operationFinishedGood.findUnique({
      where: { code: "PRP-FG-STICKER" },
      select: { id: true, code: true, name: true, productType: true, unit: true, status: true, notes: true },
    }),
    prisma.operationFinishedGoodUnit.findMany({
      where: { productCode: "PRP-FG-STICKER" },
      select: { id: true },
    }),
  ]);

  const stickerStore = storeProducts.find((product) => product.name === "Sticker PreRescatePTY" || product.productType === "PRP-FG-STICKER") || null;
  const stickerOperational = operationalSticker || null;

  console.log("=== W5.42F Catalog Inventory Reconcile ===");
  console.log("Before:");
  console.log(`- storeProducts: ${storeProducts.length}`);
  console.log(`- operationalProducts: ${stickerOperational ? 1 : 0}`);
  console.log(`- stickerStoreExists: ${Boolean(stickerStore)}`);
  console.log(`- stickerOperationalExists: ${Boolean(stickerOperational)}`);
  console.log(`- stickerUnits: ${stickerUnits.length}`);

  const plannedCreateOperationalStickerProduct = !stickerOperational;
  const plannedUpdateStoreLink = Boolean(stickerStore);
  const plannedCreateUnits = false;
  console.log("Planned:");
  console.log(`- createOperationalStickerProduct: ${plannedCreateOperationalStickerProduct ? "yes" : "no"}`);
  console.log(`- updateStoreLink: ${plannedUpdateStoreLink ? "yes" : "no"}`);
  console.log(`- createUnits: no`);

  if (dryRun) {
    console.log("Dry run activo. No se realizaron cambios.");
    return;
  }

  const finishedGood = stickerOperational
    ? stickerOperational
    : await prisma.operationFinishedGood.create({
        data: {
          code: "PRP-FG-STICKER",
          name: "Sticker PreRescatePTY",
          productType: "sticker_prerescatepty",
          unit: "unidad",
          status: "active",
          notes: "Producto base operativo restaurado por reconciliación.",
        },
      });

  const storeProduct = await syncOperationsProductToStore({
    operationsProductCode: "PRP-FG-STICKER",
    operationsProductName: "Sticker PreRescatePTY",
    productType: "PRP-FG-STICKER",
    defaultPrice: stickerStore?.price ?? 0,
    category: "accesorios",
    visible: true,
    description: "Sticker oficial PreRescatePTY para identificación y red de protección.",
  });

  const refreshedUnits = await prisma.operationFinishedGoodUnit.findMany({
    where: { productCode: "PRP-FG-STICKER" },
    select: { id: true },
  });

  console.log("After:");
  console.log(`- operationalProducts: ${finishedGood ? 1 : 0}`);
  console.log(`- stickerOperationalExists: ${Boolean(finishedGood)}`);
  console.log(`- stickerUnits: ${refreshedUnits.length}`);
  console.log(`- storeProductId: ${storeProduct.storeProductId}`);
  console.log(`- unitsCreated: 0`);
}

main()
  .catch((error) => {
    console.error("W5.42F reconcile failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
