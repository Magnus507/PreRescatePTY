import { prisma } from "@/lib/prisma";
import { buildOperationsOrderViewModel } from "@/lib/operations/operations-order-view-model";

type Args = { code?: string; recent?: number };

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

async function loadLegacyOrders(args: Args) {
  const where = args.code ? { orderNumber: args.code } : {};
  const take = args.recent && args.recent > 0 ? args.recent : 50;
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
    },
  });
}

async function loadCommercialOrders(args: Args) {
  const where = args.code ? { code: args.code } : {};
  const take = args.recent && args.recent > 0 ? args.recent : 50;
  return prisma.operationCommercialOrder.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take,
    include: {
      items: {
        select: {
          id: true,
          quantity: true,
          totalPrice: true,
          unitPrice: true,
          productCode: true,
          productName: true,
        },
      },
      dispatch: { select: { id: true, code: true, status: true, dispatchedAt: true, deliveredAt: true } },
    },
  });
}

function normalizeStatus(value: string | null | undefined) {
  return value || "pending";
}

async function main() {
  const args = parseArgs(process.argv);
  const [legacyOrders, commercialOrders] = await Promise.all([
    loadLegacyOrders(args),
    loadCommercialOrders(args),
  ]);

  const rows: Array<Record<string, unknown>> = [];

  for (const order of legacyOrders) {
    const reservedUnits = await prisma.operationFinishedGoodUnit.findMany({
      where: { reservedOrderId: order.id },
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
      orderBy: [{ createdAt: "asc" }, { internalLabel: "asc" }],
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
      select: { id: true, code: true, status: true, dispatchedAt: true, deliveredAt: true },
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

    rows.push({
      kind: "legacy",
      code: order.orderNumber,
      id: order.id,
      orderKind: order.orderType,
      orderSource: order.provider,
      isCustomerOrder: true,
      isInternalOrder: false,
      status: order.orderStatus,
      paymentStatus: order.paymentStatus,
      requiresAction: viewModel.requiresAction,
      canApprovePayment: viewModel.canApprovePayment,
      canRejectPayment: viewModel.canRejectPayment,
      canReserveInternalLabel: viewModel.canReserveInternalLabel,
      canCreateDispatch: viewModel.canCreateDispatch,
      reservedUnitsCount: reservedUnits.length,
      missingReservedUnits: Math.max(0, (order.items?.[0]?.quantity || 1) - reservedUnits.length),
      dispatchExists: Boolean(dispatch),
      dispatchStatus: dispatch?.status || null,
      deliveredAt: dispatch?.deliveredAt || null,
      productionOrderId: null,
      productionStatus: null,
      internalStatus: null,
      visibleTab: getLegacyVisibleTab(viewModel.requiresAction, order),
      recommendedTab: getLegacyRecommendedTab(order, reservedUnits, dispatch, viewModel.requiresAction),
      reason: getLegacyReason(order, reservedUnits, dispatch, viewModel),
    });
  }

  for (const order of commercialOrders) {
    const isCompleted = normalizeStatus(order.status) === "completed";
    const isCancelled = normalizeStatus(order.status) === "cancelled";
    const requiresAction = Boolean(order.fulfillmentStatus && !["completed", "failed", "cancelled", "delivered"].includes(order.fulfillmentStatus));
    rows.push({
      kind: "internal",
      code: order.code,
      id: order.id,
      orderKind: "internal_replenishment",
      orderSource: "commercial_order",
      isCustomerOrder: false,
      isInternalOrder: true,
      status: normalizeStatus(order.status),
      paymentStatus: normalizeStatus(order.paymentStatus),
      requiresAction,
      canApprovePayment: false,
      canRejectPayment: false,
      canReserveInternalLabel: false,
      canCreateDispatch: false,
      reservedUnitsCount: 0,
      missingReservedUnits: 0,
      dispatchExists: Boolean(order.dispatch),
      dispatchStatus: order.dispatch?.status || null,
      deliveredAt: null,
      productionOrderId: null,
      productionStatus: null,
      internalStatus: order.fulfillmentStatus || normalizeStatus(order.status),
      visibleTab: isCancelled ? "cancelled" : requiresAction ? "internal" : isCompleted ? "completed" : "internal",
      recommendedTab: isCancelled ? "cancelled" : requiresAction ? "internal" : isCompleted ? "completed" : "active",
      reason: isCancelled
        ? "cancelled"
        : requiresAction
          ? "produccion_interna_pendiente"
          : isCompleted
            ? "produccion_interna_completada"
            : "produccion_interna_activa",
    });
  }

  const current = {
    all: rows.length,
    clients: rows.filter((row) => row.kind === "legacy" && !row.isInternalOrder).length,
    internal: rows.filter((row) => row.isInternalOrder).length,
    pending: rows.filter((row) => Boolean(row.requiresAction)).length,
    cancelled: rows.filter((row) => row.status === "cancelled" || row.paymentStatus === "rejected").length,
  };

  const recommended = {
    active: rows.filter((row) => row.recommendedTab === "active").length,
    clientsActive: rows.filter((row) => row.recommendedTab === "clientsActive").length,
    internalActive: rows.filter((row) => row.recommendedTab === "internalActive").length,
    pending: rows.filter((row) => row.recommendedTab === "pending").length,
    completed: rows.filter((row) => row.recommendedTab === "completed").length,
    cancelled: rows.filter((row) => row.recommendedTab === "cancelled").length,
  };

  console.log("=== W5.50A Tabs Distribution Audit ===");
  console.log(JSON.stringify({ current, recommended, scanned: rows.length }, null, 2));
  for (const row of rows) {
    console.log(JSON.stringify(row, null, 2));
  }
}

function getLegacyVisibleTab(requiresAction: boolean, order: { orderStatus: string; paymentStatus: string; isInternalOrder?: boolean }) {
  if (order.orderStatus === "cancelled" || order.paymentStatus === "rejected") return "cancelled";
  if (order.isInternalOrder) return "internal";
  if (requiresAction) return "pending";
  return "active";
}

function getLegacyRecommendedTab(
  order: { orderStatus: string; paymentStatus: string; isInternalOrder?: boolean; adminReviewStatus?: string | null },
  reservedUnits: Array<{ id: string }> ,
  dispatch: { id: string; status: string; dispatchedAt?: Date | null; deliveredAt?: Date | null } | null,
  requiresAction: boolean
) {
  if (order.orderStatus === "cancelled" || order.paymentStatus === "rejected") return "cancelled";
  if (order.isInternalOrder) return requiresAction ? "internalActive" : "completed";
  const isCompleted = Boolean(order.orderStatus === "completed" || dispatch?.deliveredAt || dispatch?.status === "delivered");
  if (isCompleted) return "completed";
  if (requiresAction) return "pending";
  if (reservedUnits.length > 0 || dispatch) return "active";
  return "active";
}

function getLegacyReason(
  order: { orderStatus: string; paymentStatus: string; isInternalOrder?: boolean; adminReviewStatus?: string | null },
  reservedUnits: Array<{ id: string }>,
  dispatch: { id: string; status: string; dispatchedAt?: Date | null; deliveredAt?: Date | null } | null,
  viewModel: { requiresAction: boolean; pendingReasonLabel: string | null }
) {
  if (order.orderStatus === "cancelled" || order.paymentStatus === "rejected") return "terminal_cancelled";
  if (order.isInternalOrder && !viewModel.requiresAction) return "internal_completed";
  if (order.isInternalOrder) return viewModel.pendingReasonLabel || "internal_active";
  if (dispatch?.deliveredAt || dispatch?.status === "delivered" || order.orderStatus === "completed") return "completed";
  if (viewModel.requiresAction) return viewModel.pendingReasonLabel || "pending";
  if (reservedUnits.length > 0) return "active_with_reservation";
  return "active";
}

main()
  .catch((error) => {
    console.error("W5.50A audit failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
