import { prisma } from "../lib/prisma";

const CONFIRM = "YES_REPAIR_INTERNAL_STOCK_W542C";

async function main() {
  const dryRun = process.env.CONFIRM_REPAIR_INTERNAL_STOCK_W542C !== CONFIRM;

  const orders = await prisma.operationProductionOrder.findMany({
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
            select: { id: true, internalLabel: true, reservedOrderId: true, status: true, qaStatus: true, activationStatus: true },
          },
        },
      },
    },
  });

  const candidates = orders.flatMap((order) =>
    order.digitalItems.flatMap((item) =>
      item.finishedGoodUnits.filter(
        (unit) => unit.status === "reserved" && unit.qaStatus === "passed" && unit.activationStatus === "not_activated"
      )
    )
  );

  console.log(dryRun ? "=== W5.42C REPAIR DRY-RUN ===" : "=== W5.42C REPAIR RUN ===");
  console.log(`Candidatas seguras: ${candidates.length}`);

  if (dryRun) return;

  const updated = await prisma.operationFinishedGoodUnit.updateMany({
    where: {
      id: { in: candidates.map((candidate) => candidate.id) },
    },
    data: {
      status: "available",
      reservedOrderId: null,
      activationStatus: "not_activated",
    },
  });

  console.log(`Unidades actualizadas: ${updated.count}`);
}

main()
  .catch((error) => {
    console.error("W5.42C repair failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
