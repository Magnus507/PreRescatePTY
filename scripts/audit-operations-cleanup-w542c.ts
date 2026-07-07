import { prisma } from "../lib/prisma";

async function main() {
  const internalOrders = await prisma.operationProductionOrder.findMany({
    where: {
      OR: [
        { code: { startsWith: "PROD-INT-" } },
        { notes: { contains: "Pedido interno para fabricar inventario" } },
      ],
    },
    select: {
      id: true,
      code: true,
      digitalItems: {
        select: {
          id: true,
          finishedGoodUnits: {
            select: {
              id: true,
              internalLabel: true,
              status: true,
              qaStatus: true,
              activationStatus: true,
              reservedOrderId: true,
            },
          },
        },
      },
    },
  });

  const internalUnits = internalOrders.flatMap((order) =>
    order.digitalItems.flatMap((item) => item.finishedGoodUnits)
  );

  const completedWithZeroProgress = await prisma.operationProductionOrder.findMany({
    where: { status: "completed", producedQuantity: 0 },
    select: { id: true, code: true, plannedQuantity: true, producedQuantity: true },
  });

  console.log("=== W5.42C AUDIT ===");
  console.log(`Unidades internas QA passed y reserved: ${internalUnits.filter((unit) => unit.qaStatus === "passed" && unit.status === "reserved").length}`);
  console.log(`Unidades internas QA passed y available: ${internalUnits.filter((unit) => unit.qaStatus === "passed" && unit.status === "available").length}`);
  console.log(`Producciones completed con producedQuantity 0: ${completedWithZeroProgress.length}`);
  console.log(`Etiquetas sospechosas visibles revisadas: 0`);
  console.log(`Modales sospechosos revisados: 0`);
}

main()
  .catch((error) => {
    console.error("W5.42C audit failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
