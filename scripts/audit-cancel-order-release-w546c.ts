import { prisma } from "@/lib/prisma";
import { releaseEligibleOrderReservations } from "@/lib/operations/release-order-reservations";

type Args = {
  code?: string;
  dryRunCancel?: boolean;
  executeCancel?: boolean;
  confirm?: string;
};

function parseArgs(argv: string[]): Args {
  const args: Args = {};
  for (let i = 2; i < argv.length; i += 1) {
    if (argv[i] === "--code") {
      args.code = argv[i + 1];
      i += 1;
    } else if (argv[i] === "--dry-run-cancel") {
      args.dryRunCancel = true;
    } else if (argv[i] === "--execute-cancel") {
      args.executeCancel = true;
    } else if (argv[i] === "--confirm") {
      args.confirm = argv[i + 1];
      i += 1;
    }
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv);
  const code = args.code?.trim();
  if (!code) {
    throw new Error("--code es requerido");
  }

  const order = await prisma.order.findFirst({
    where: { orderNumber: code },
    select: {
      id: true,
      orderNumber: true,
      orderStatus: true,
      paymentStatus: true,
      paymentProofUrl: true,
      manualPaymentReference: true,
    },
  });

  if (!order) {
    throw new Error(`Pedido no encontrado: ${code}`);
  }

  const dryRun = args.dryRunCancel || !args.executeCancel;
  const result = await releaseEligibleOrderReservations(prisma, {
    orderId: order.id,
    actorId: null,
    reason: `Audit de cancelacion para ${order.orderNumber}`,
    dryRun: true,
  });

  const payload = {
    orderNumber: order.orderNumber,
    orderStatus: order.orderStatus,
    paymentStatus: order.paymentStatus,
    paymentProofAvailable: Boolean(order.paymentProofUrl || order.manualPaymentReference),
    reservedUnits: result.eligibleCount,
    eligibleCount: result.eligibleCount - result.blockedCount,
    blockedCount: result.blockedCount,
    releasedCount: result.releasedCount,
    releasedUnits: result.releasedUnits,
    blockedUnits: result.blockedUnits,
    whatWouldChange: dryRun ? "Solo lectura / simulacion" : "Ejecucion controlada solicitada",
    canCancelSafely: result.blockedCount === 0,
    releasePlan: result.releasedUnits.map((unit) => ({
      id: unit.id,
      internalLabel: unit.internalLabel,
      from: unit.previousStatus,
      to: unit.newStatus,
    })),
  };

  console.log(JSON.stringify(payload, null, 2));

  if (args.executeCancel) {
    if (args.confirm !== "CANCEL_RELEASE_W546C") {
      throw new Error("Confirmacion invalida");
    }
    if (result.blockedCount > 0) {
      throw new Error("No se puede ejecutar: hay unidades bloqueadas");
    }

    await prisma.$transaction(async (tx) => {
      await releaseEligibleOrderReservations(tx, {
        orderId: order.id,
        actorId: null,
        reason: `Cancelacion ejecutada desde script para ${order.orderNumber}`,
        dryRun: false,
      });
      await tx.order.update({
        where: { id: order.id },
        data: {
          orderStatus: "cancelled",
          paymentStatus: "cancelled",
        },
      });
    });

    const postState = await prisma.order.findUnique({
      where: { id: order.id },
      select: { orderStatus: true, paymentStatus: true },
    });
    console.log(JSON.stringify({ postState }, null, 2));
  }
}

main()
  .catch((error) => {
    console.error("W5.46C audit failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
