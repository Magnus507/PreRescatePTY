import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const CONFIRMATION = "RESET_OPERATIONS_W542E";

function hasExecuteFlag(argv: string[]) {
  return argv.includes("--execute");
}

function hasDryRunFlag(argv: string[]) {
  return argv.includes("--dry-run") || !hasExecuteFlag(argv);
}

function getConfirmValue(argv: string[]) {
  const index = argv.indexOf("--confirm");
  return index >= 0 ? argv[index + 1] || "" : "";
}

async function main() {
  const argv = process.argv.slice(2);
  const dryRun = hasDryRunFlag(argv);
  const confirm = getConfirmValue(argv);

  if (!dryRun && confirm !== CONFIRMATION) {
    throw new Error(`Run with --execute --confirm ${CONFIRMATION} to apply changes.`);
  }

  const [orders, productionOrders, dispatches, units, claimTokens, corporateRequests] = await Promise.all([
    prisma.order.findMany({
      where: {
        OR: [
          { orderNumber: { startsWith: "PR-" } },
          { orderNumber: { startsWith: "INT-" } },
          { providerReference: { startsWith: "PR-" } },
          { providerReference: { startsWith: "INT-" } },
        ],
      },
      select: { id: true },
    }),
    prisma.operationProductionOrder.findMany({
      where: {
        OR: [
          { code: { startsWith: "PROD-INT-" } },
          { notes: { contains: "Pedido interno" } },
          { title: { contains: "intern" } },
        ],
      },
      select: { id: true },
    }),
    prisma.operationDispatch.findMany({
      select: { id: true },
    }),
    prisma.operationFinishedGoodUnit.findMany({
      select: { id: true },
    }),
    prisma.chipClaimToken.findMany({
      select: { id: true, orderId: true },
    }),
    prisma.corporateProductRequest.findMany({
      where: {
        orderId: { not: null },
      },
      select: { id: true },
    }),
  ]);

  console.log("=== W5.42E Operations Reset ===");
  console.log(`dryRun: ${dryRun}`);
  console.log(`ordersToDelete: ${orders.length}`);
  console.log(`productionOrdersToDelete: ${productionOrders.length}`);
  console.log(`dispatchesToDelete: ${dispatches.length}`);
  console.log(`unitsToDelete: ${units.length}`);
  console.log(`claimTokensToDelete: ${claimTokens.length}`);
  console.log(`corporateRequestsToDelete: ${corporateRequests.length}`);

  if (dryRun) {
    console.log("Dry run activo. No se realizaron cambios.");
    return;
  }

  await prisma.operationReturnEvent.deleteMany({});
  await prisma.operationReturn.deleteMany({});
  await prisma.operationReplacementEvent.deleteMany({});
  await prisma.operationReplacement.deleteMany({});
  await prisma.operationWarrantyEvent.deleteMany({});
  await prisma.operationWarranty.deleteMany({});
  await prisma.operationDispatchEvent.deleteMany({});
  await prisma.operationDispatchItem.deleteMany({});
  await prisma.operationDispatch.deleteMany({});
  await prisma.operationCommercialOrderEvent.deleteMany({});
  await prisma.operationCommercialOrderItem.deleteMany({});
  await prisma.operationCommercialOrder.deleteMany({});
  await prisma.operationPrintOrderItem.deleteMany({});
  await prisma.operationPrintOrder.deleteMany({});
  await prisma.operationFinishedGoodUnitEvent.deleteMany({});
  await prisma.operationFinishedGoodUnit.deleteMany({});
  await prisma.operationDigitalBatchItem.deleteMany({});
  await prisma.operationDigitalBatch.deleteMany({});
  await prisma.operationFinishedGoodEvent.deleteMany({});
  await prisma.operationFinishedGood.deleteMany({});
  await prisma.operationPackingEvent.deleteMany({});
  await prisma.operationPackingBatch.deleteMany({});
  await prisma.operationQcInspectionEvent.deleteMany({});
  await prisma.operationQcInspection.deleteMany({});
  await prisma.operationProductionEvent.deleteMany({});
  await prisma.operationProductionOrderItem.deleteMany({});
  await prisma.operationProductionOrder.deleteMany({});
  await prisma.operationMaterialEvent.deleteMany({});
  await prisma.operationMaterial.deleteMany({});
  await prisma.corporateProductRequestItem.deleteMany({
    where: {
      request: {
        orderId: { in: orders.map((order) => order.id) },
      },
    },
  });
  await prisma.corporateProductRequest.deleteMany({
    where: {
      orderId: { in: orders.map((order) => order.id) },
    },
  });
  await prisma.corporateOrderEmployeeItem.deleteMany({
    where: {
      orderId: { in: orders.map((order) => order.id) },
    },
  });
  await prisma.orderItem.deleteMany({
    where: {
      order: {
        OR: [
          { orderNumber: { startsWith: "PR-" } },
          { orderNumber: { startsWith: "INT-" } },
          { providerReference: { startsWith: "PR-" } },
          { providerReference: { startsWith: "INT-" } },
        ],
      },
    },
  });
  await prisma.chipClaimToken.deleteMany({
    where: {
      orderId: { in: orders.map((order) => order.id) },
    },
  });
  await prisma.order.deleteMany({
    where: {
      id: { in: orders.map((order) => order.id) },
    },
  });

  console.log("Reset operativo completado.");
}

main()
  .catch((error) => {
    console.error("W5.42E reset failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
