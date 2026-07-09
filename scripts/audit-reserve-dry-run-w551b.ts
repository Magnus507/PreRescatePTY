import { prisma } from "@/lib/prisma";
import { buildOperationsOrderViewModel } from "@/lib/operations/operations-order-view-model";

type Args = {
  product?: string;
  quantity?: number;
  code?: string;
};

function parseArgs(argv: string[]): Args {
  const args: Args = {};
  for (let i = 2; i < argv.length; i += 1) {
    if (argv[i] === "--product") {
      args.product = argv[i + 1];
      i += 1;
    } else if (argv[i] === "--quantity") {
      args.quantity = Number(argv[i + 1]);
      i += 1;
    } else if (argv[i] === "--code") {
      args.code = argv[i + 1];
      i += 1;
    }
  }
  return args;
}

async function loadExistingOrder(code: string) {
  return prisma.order.findFirst({
    where: { orderNumber: code },
    include: {
      items: {
        select: {
          id: true,
          productType: true,
          quantity: true,
          totalPrice: true,
          unitPrice: true,
          profileId: true,
          chipId: true,
        },
      },
      user: {
        select: {
          id: true,
          email: true,
          phone: true,
          profile: { select: { firstName: true, lastName: true } },
        },
      },
    },
  });
}

async function main() {
  const args = parseArgs(process.argv);
  const productCode = args.product?.trim() || "PRP-FG-STICKER";
  const quantity = Number.isFinite(args.quantity || 1) && (args.quantity || 1) > 0 ? Number(args.quantity || 1) : 1;
  const existingOrder = args.code?.trim() ? await loadExistingOrder(args.code.trim()) : null;
  const order = existingOrder;
  const hypotheticalOrder = {
    id: "dry-run-order",
    orderNumber: "DRY-RUN-ORDER",
    provider: "manual",
    orderStatus: "processing",
    paymentStatus: "paid",
    adminReviewStatus: "approved",
    orderType: "manual",
    customerName: "Dry Run",
    customerEmail: null,
    customerPhone: null,
    customerDocument: null,
    amount: 25,
    commercialTotal: 25,
    totalNormalized: 25,
    items: [{ id: "dry-run-item", productType: productCode, quantity, totalPrice: 25, unitPrice: 25, profileId: null, chipId: null }],
    reservedUnits: [] as Array<Record<string, unknown>>,
    dispatch: null as Record<string, unknown> | null,
    reservedOrderId: null,
    shippingAddress: null,
    shippingCity: null,
    shippingNotes: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const sourceOrder = order || hypotheticalOrder;
  const reservedUnits = order
    ? await prisma.operationFinishedGoodUnit.findMany({
        where: { reservedOrderId: order.id },
        select: { id: true, internalLabel: true, status: true, qaStatus: true, activationStatus: true, reservedOrderId: true, reservedAt: true, createdAt: true },
        orderBy: [{ createdAt: "asc" }, { internalLabel: "asc" }],
      })
    : [];
  const dispatch = order
    ? await prisma.operationDispatch.findFirst({
        where: {
          events: {
            some: {
              OR: [
                { referenceType: "order", referenceId: order.id },
                { metadataJson: { contains: `"orderId":"${order.id}"` } },
              ],
            },
          },
        },
        select: { id: true, code: true, status: true, dispatchedAt: true, deliveredAt: true },
      })
    : null;

  const availableUnits = await prisma.operationFinishedGoodUnit.findMany({
    where: {
      productCode,
      status: "available",
      qaStatus: "passed",
      activationStatus: "not_activated",
      reservedOrderId: null,
    },
    select: {
      id: true,
      internalLabel: true,
      status: true,
      qaStatus: true,
      activationStatus: true,
      reservedOrderId: true,
      reservedAt: true,
      createdAt: true,
    },
    orderBy: [{ createdAt: "asc" }, { internalLabel: "asc" }, { id: "asc" }],
  });

  const candidateViewModel = buildOperationsOrderViewModel({
    ...(sourceOrder as Parameters<typeof buildOperationsOrderViewModel>[0]),
    customerName: sourceOrder.customerName || "Dry Run",
    customerEmail: sourceOrder.customerEmail || null,
    customerPhone: sourceOrder.customerPhone || null,
    reservedUnits,
    dispatch,
    user: order?.user
      ? {
          email: order.user.email || null,
          phone: order.user.phone || null,
          profile: order.user.profile
            ? {
                firstName: order.user.profile.firstName || null,
                lastName: order.user.profile.lastName || null,
              }
            : null,
        }
      : null,
  });

  const scenarioMode = order ? "existing-order" : "hypothetical";
  const missingReservedUnits = Math.max(0, quantity - reservedUnits.length);
  const wouldReserve = availableUnits[0] || null;
  const endpoint = `/api/admin/operations/finished-good-units/[unitId]/events`;
  const body = {
    action: "reserve",
    referenceType: "commercial_order",
    referenceId: order?.id || "<orderId>",
    reason: `Reservado para pedido ${order?.orderNumber || "DRY-RUN-ORDER"}`,
  };

  console.log("=== W5.51B Reserve Dry Run ===");
  console.log(JSON.stringify({
    scenario: {
      mode: scenarioMode,
      productCode,
      quantity,
      paymentStatus: sourceOrder.paymentStatus,
      orderStatus: sourceOrder.orderStatus,
      provider: sourceOrder.provider,
      dispatchExists: Boolean(dispatch),
      reservedUnitsCount: reservedUnits.length,
      missingReservedUnits,
    },
    eligibleUnits: availableUnits,
    wouldReserve: wouldReserve
      ? {
          unitId: wouldReserve.id,
          internalLabel: wouldReserve.internalLabel,
        }
      : null,
    wouldCallEndpoint: `POST ${endpoint}`,
    wouldSendBody: body,
    wouldMutateInRealExecution: [
      "unit.status -> reserved",
      "unit.reservedOrderId -> order.id",
      "unit.reservedAt -> now",
      "unit events create RESERVED",
    ],
    mustNotMutate: [
      "activationStatus",
      "activatedAt",
      "shortCode",
      "internalLabel",
      "dispatch",
      "order.userId",
      "final chip user",
      "QR/NFC",
      "paymentStatus",
      "order status unless endpoint explicitly changes it",
    ],
    expectedUiAfterReserve: [
      "Reservar etiqueta interna hidden if reservation complete",
      "reserved unit visible with internalLabel",
      "QC passed visible",
      "activation not_activated visible",
      "Enviar a despacho visible if full reservation",
      "pedido remains in Activos/Pendientes, not Completados",
      "no activation",
    ],
    blockers: [
      !wouldReserve ? "no eligible units" : null,
      missingReservedUnits <= 0 ? "insufficient eligible units" : null,
      "endpoint mutates forbidden fields",
      "UI does not refresh selected order",
      "duplicate click/double reserve risk",
    ].filter(Boolean),
    selectionOrder: [
      "createdAt asc",
      "internalLabel asc",
      "id asc",
    ],
  }, null, 2));
}

main()
  .catch((error) => {
    console.error("W5.51B dry-run failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
