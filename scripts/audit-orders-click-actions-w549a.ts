import { prisma } from "@/lib/prisma";
import { buildOperationsOrderViewModel } from "@/lib/operations/operations-order-view-model";
import { canAdminApproveManual, canAdminRejectManual } from "@/lib/order-status";

type Args = {
  code?: string;
  recent?: number;
};

function parseArgs(argv: string[]): Args {
  const args: Args = {};
  for (let i = 2; i < argv.length; i += 1) {
    if (argv[i] === "--code") {
      args.code = argv[i + 1];
      i += 1;
    } else if (argv[i] === "--recent") {
      args.recent = Number(argv[i + 1]);
      i += 1;
    }
  }
  return args;
}

function asIso(value: Date | string | null | undefined) {
  if (!value) return null;
  if (value instanceof Date) return Number.isFinite(value.getTime()) ? value.toISOString() : null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}

async function loadOrders(args: Args) {
  const where = args.code ? { orderNumber: args.code } : {};
  const take = args.recent && args.recent > 0 ? args.recent : 20;

  return prisma.order.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take,
    include: {
      user: {
        select: {
          id: true,
          email: true,
          phone: true,
          profile: { select: { firstName: true, lastName: true } },
        },
      },
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
      chipClaimTokens: { include: { chip: true } },
    },
  });
}

type FilterableOrder = {
  id: string;
  orderNumber: string;
  isInternalOrder: boolean;
  orderStatus: string;
  paymentStatus: string;
  requiresAction: boolean;
};

function getFilteredOrders(orders: FilterableOrder[]) {
  const cancelled = orders.filter((order) => order.orderStatus === "cancelled" || order.paymentStatus === "rejected");
  const pending = orders.filter((order) => Boolean(order.requiresAction));
  const clients = orders.filter((order) => !order.isInternalOrder && !cancelled.some((item) => item.id === order.id));
  const internal = orders.filter((order) => order.isInternalOrder && !cancelled.some((item) => item.id === order.id));
  return {
    all: orders,
    clients,
    internal,
    pending,
    cancelled,
  };
}

async function main() {
  const args = parseArgs(process.argv);
  const orders = await loadOrders(args);

  const rows = [] as Array<Record<string, unknown>>;

  for (const order of orders) {
    const reservedUnits = await prisma.operationFinishedGoodUnit.findMany({
      where: { reservedOrderId: order.id },
      orderBy: [{ createdAt: "asc" }, { internalLabel: "asc" }],
      select: {
        id: true,
        internalLabel: true,
        status: true,
        qaStatus: true,
        activationStatus: true,
        reservedOrderId: true,
        reservedAt: true,
        dispatchedAt: true,
        deliveredAt: true,
        activatedAt: true,
      },
    });

    const dispatch = await prisma.operationDispatch.findFirst({
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
      select: { id: true, code: true, status: true },
    });

    const viewModel = buildOperationsOrderViewModel({
      ...(order as Parameters<typeof buildOperationsOrderViewModel>[0]),
      customerName:
        order.customerName ||
        `${order.user?.profile?.firstName || ""} ${order.user?.profile?.lastName || ""}`.trim() ||
        order.user?.email ||
        "Sin cliente",
      customerEmail: order.customerEmail || order.user?.email || null,
      customerPhone: order.customerPhone || order.user?.phone || null,
      reservedUnits,
      dispatch,
      user: order.user
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

    const paymentProofExists = Boolean(order.paymentProofUrl || order.manualPaymentReference);
    const expectedCanApprove = paymentProofExists && order.paymentStatus === "under_review" && order.provider === "manual";
    const expectedCanReject = expectedCanApprove;
    const canReserveExpected = (order.paymentStatus === "paid" || order.adminReviewStatus === "approved") && reservedUnits.length === 0 && order.orderStatus !== "cancelled" && order.orderStatus !== "completed";
    const canDispatchExpected = order.orderStatus !== "cancelled" && order.orderStatus !== "completed" && reservedUnits.length > 0 && !dispatch && (order.paymentStatus === "paid" || order.adminReviewStatus === "approved");
    const isTerminal = order.orderStatus === "cancelled" || order.paymentStatus === "rejected" || order.orderStatus === "completed";
    const isCancelledTab = order.orderStatus === "cancelled" || order.paymentStatus === "rejected";
    const isPendingTab = Boolean(viewModel.requiresAction);

    rows.push({
      code: order.orderNumber,
      orderNumber: order.orderNumber,
      id: order.id,
      status: order.orderStatus,
      paymentStatus: order.paymentStatus,
      orderKind: order.orderType,
      orderSource: order.provider,
      isCustomerOrder: !order.orderType?.includes("internal"),
      isInternalOrder: order.orderType === "internal_replenishment",
      requiresAction: viewModel.requiresAction,
      isTerminal,
      isCancelledTab,
      isPendingTab,
      canApprove: viewModel.canApprovePayment,
      canReject: viewModel.canRejectPayment,
      canReserve: viewModel.canReserveInternalLabel,
      canDispatch: viewModel.canCreateDispatch,
      paymentProofExists,
      endpointExpected: `POST /api/admin/orders/${order.id}/approve`,
      payloadExpected: { adminReviewNotes: "string?" },
      afterApproveExpected: {
        paymentStatus: "paid",
        canApprove: false,
        canReject: false,
        canReserve: canReserveExpected,
      },
      afterRejectExpected: {
        paymentStatus: "rejected",
        canApprove: false,
        canReject: false,
      },
      reservedUnitsCount: reservedUnits.length,
      dispatchExists: Boolean(dispatch),
      visibleActionFlags: {
        canApprovePayment: viewModel.canApprovePayment,
        canRejectPayment: viewModel.canRejectPayment,
        canReserveInternalLabel: viewModel.canReserveInternalLabel,
        canCreateDispatch: viewModel.canCreateDispatch,
      },
      expectedActionFlags: {
        canApprovePayment: expectedCanApprove,
        canRejectPayment: expectedCanReject,
        canReserveInternalLabel: canReserveExpected,
        canCreateDispatch: canDispatchExpected,
      },
      reservedUnits: reservedUnits.map((unit) => ({
        internalLabel: unit.internalLabel,
        status: unit.status,
        qaStatus: unit.qaStatus,
        activationStatus: unit.activationStatus,
        reservedAt: asIso(unit.reservedAt),
      })),
    });
  }

  const tabs = getFilteredOrders(rows as FilterableOrder[]);

  console.log("=== W5.49A Click/Actions Audit ===");
  console.log(`ordersScanned: ${orders.length}`);
  console.log(JSON.stringify({
    counts: {
      all: tabs.all.length,
      clients: tabs.clients.length,
      internal: tabs.internal.length,
      pending: tabs.pending.length,
      cancelled: tabs.cancelled.length,
    },
    visibleLabels: {
      all: tabs.all.map((order) => order.orderNumber),
      clients: tabs.clients.map((order) => order.orderNumber),
      internal: tabs.internal.map((order) => order.orderNumber),
      pending: tabs.pending.map((order) => order.orderNumber),
      cancelled: tabs.cancelled.map((order) => order.orderNumber),
    },
    note: "La UI actual usa el contador de pending para Cancelados; la lista visible usa cancelled/rejected.",
  }, null, 2));
  for (const row of rows) {
    console.log(JSON.stringify(row, null, 2));
  }
}

main()
  .catch((error) => {
    console.error("W5.49A audit failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
