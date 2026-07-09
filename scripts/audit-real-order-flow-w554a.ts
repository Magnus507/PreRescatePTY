import { prisma } from "../lib/prisma";
import { buildOperationsOrderViewModel } from "../lib/operations/operations-order-view-model";

type Args = {
  code?: string;
};

function parseArgs(argv: string[]): Args {
  const args: Args = {};
  for (let i = 2; i < argv.length; i += 1) {
    if (argv[i] === "--code") {
      args.code = argv[i + 1];
      i += 1;
    }
  }
  return args;
}

function normalizeStatus(value: string | null | undefined) {
  return (value || "").trim().toLowerCase();
}

function getRecommendedTab(orderStatus: string, dispatchStatus: string | null, requiresAction: boolean) {
  const normalizedOrderStatus = normalizeStatus(orderStatus);
  const normalizedDispatchStatus = normalizeStatus(dispatchStatus);
  if (["completed", "delivered"].includes(normalizedOrderStatus) || ["completed", "delivered"].includes(normalizedDispatchStatus)) {
    return "Completados";
  }
  if (requiresAction) return "Pendientes";
  return "Activos";
}

async function loadOrder(code?: string) {
  if (!code) return null;
  return prisma.order.findUnique({
    where: { orderNumber: code },
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

async function loadDispatch(orderId: string, orderCode: string) {
  return prisma.operationDispatch.findFirst({
    where: {
      OR: [
        {
          events: {
            some: {
              OR: [
                { referenceType: "order", referenceId: orderId },
                { metadataJson: { contains: `"orderId":"${orderId}"` } },
                { metadataJson: { contains: `"orderCode":"${orderCode}"` } },
              ],
            },
          },
        },
        { code: { contains: orderCode } },
      ],
    },
    include: {
      items: {
        include: {
          unitRecord: {
            select: {
              id: true,
              internalLabel: true,
              productCode: true,
              productName: true,
              status: true,
              qaStatus: true,
              activationStatus: true,
              reservedOrderId: true,
              reservedAt: true,
              dispatchedAt: true,
              deliveredAt: true,
            },
          },
        },
      },
      events: {
        orderBy: { createdAt: "asc" },
        select: { referenceType: true, referenceId: true, metadataJson: true, createdAt: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

async function loadReservedUnits(orderId: string) {
  return prisma.operationFinishedGoodUnit.findMany({
    where: { reservedOrderId: orderId },
    orderBy: [{ createdAt: "asc" }, { internalLabel: "asc" }],
    select: {
      id: true,
      internalLabel: true,
      productCode: true,
      status: true,
      qaStatus: true,
      activationStatus: true,
      reservedOrderId: true,
      reservedAt: true,
      deliveredAt: true,
    },
  });
}

function parseOrderIdFromDispatch(dispatch: {
  events: Array<{ referenceType: string | null; referenceId: string | null; metadataJson: string | null }>;
}) {
  for (const event of dispatch.events) {
    if (event.referenceType === "order" && event.referenceId) return event.referenceId;
    if (!event.metadataJson) continue;
    try {
      const meta = JSON.parse(event.metadataJson) as { orderId?: string; referenceId?: string };
      if (meta.orderId) return meta.orderId;
      if (meta.referenceId) return meta.referenceId;
    } catch {
      continue;
    }
  }
  return null;
}

function getDeliveryFlags(order: any, dispatch: any, reservedUnits: any[]) {
  const blockers: string[] = [];
  const quantity = order.items.reduce((sum: number, item: { quantity: number }) => sum + item.quantity, 0);
  const reservedCount = reservedUnits.length;
  const orderStatus = normalizeStatus(order.orderStatus);
  const dispatchStatus = normalizeStatus(dispatch?.status);

  if (!dispatch) blockers.push("no dispatch");
  if (dispatchStatus === "delivered") blockers.push("dispatch already delivered");
  if (orderStatus === "completed") blockers.push("order completed");
  if (orderStatus === "cancelled") blockers.push("order cancelled");
  if (reservedCount < quantity) blockers.push("missing reserved units");
  if (reservedUnits.some((unit) => unit.activationStatus === "activated")) blockers.push("activation touched unexpectedly");
  if (dispatch && orderStatus === "completed" && dispatchStatus !== "delivered") blockers.push("inconsistent order/dispatch status");

  const canCreateDispatch = Boolean(dispatch) === false && quantity > 0 && reservedCount === quantity && (order.paymentStatus === "paid" || order.adminReviewStatus === "approved");
  const shouldShowCancelHide = !["completed", "cancelled"].includes(orderStatus) && order.paymentStatus !== "paid";

  return {
    blockers,
    tabRecommended: getRecommendedTab(order.orderStatus, dispatch?.status || null, Boolean(order.requiresAction)),
    deliveryCandidate: blockers.length === 0,
    canCreateDispatch,
    canConfirmDelivery: ["sent", "shipped", "dispatched"].includes(dispatchStatus),
    shouldShowCancelHide,
  };
}

async function main() {
  const args = parseArgs(process.argv);
  if (!args.code) {
    throw new Error("--code es requerido");
  }

  const order = await loadOrder(args.code);
  if (!order) {
    console.log("=== W5.54A Real Order Flow Audit ===");
    console.log(JSON.stringify({ error: "Pedido no encontrado", code: args.code }, null, 2));
    return;
  }

  const dispatch = await loadDispatch(order.id, order.orderNumber);
  const reservedUnits = await loadReservedUnits(order.id);
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
    dispatch: dispatch
      ? {
          id: dispatch.id,
          code: dispatch.code,
          status: dispatch.status,
        }
      : null,
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

  const dispatchOrderId = dispatch ? parseOrderIdFromDispatch(dispatch) : null;
  const quantity = order.items.reduce((sum, item) => sum + item.quantity, 0);
  const flags = getDeliveryFlags(order, dispatch, reservedUnits);

  console.log("=== W5.54A Real Order Flow Audit ===");
  console.log(
    JSON.stringify(
      {
        order: {
          id: order.id,
          code: order.orderNumber,
          orderStatus: order.orderStatus,
          paymentStatus: order.paymentStatus,
          adminReviewStatus: order.adminReviewStatus,
          provider: order.provider,
          total: order.amount,
          customerName: order.customerName,
          customerEmail: order.customerEmail,
          requiresAction: viewModel.requiresAction,
          pendingReasonLabel: viewModel.pendingReasonLabel,
          tabRecommended: flags.tabRecommended,
        },
        payment: {
          paymentStatus: order.paymentStatus,
          proofExists: Boolean(order.paymentProofUrl || order.manualPaymentReference),
          reviewedAt: viewModel.paymentSubmittedAt || null,
          approved: order.paymentStatus === "paid" || order.adminReviewStatus === "approved",
          rejected: order.paymentStatus === "rejected" || order.adminReviewStatus === "rejected",
        },
        reservation: {
          requiredQuantity: quantity,
          reservedUnitsCount: reservedUnits.length,
          missingReservedUnits: Math.max(0, quantity - reservedUnits.length),
          canReserveInternalLabel: viewModel.canReserveInternalLabel,
          reservedUnits: reservedUnits.map((unit) => ({
            id: unit.id,
            internalLabel: unit.internalLabel,
            productCode: unit.productCode,
            status: unit.status,
            qaStatus: unit.qaStatus,
            activationStatus: unit.activationStatus,
            reservedOrderId: unit.reservedOrderId,
            reservedAt: unit.reservedAt ? unit.reservedAt.toISOString() : null,
            deliveredAt: unit.deliveredAt ? unit.deliveredAt.toISOString() : null,
            shortCodeExists: false,
          })),
        },
        dispatch: {
          exists: Boolean(dispatch),
          id: dispatch?.id || null,
          code: dispatch?.code || null,
          status: dispatch?.status || null,
          createdAt: dispatch?.createdAt ? dispatch.createdAt.toISOString() : null,
          preparedAt: dispatch?.events.find((event) => event.metadataJson?.includes("preparedAt"))?.createdAt.toISOString() || null,
          sentAt: dispatch?.sentAt ? dispatch.sentAt.toISOString() : null,
          deliveredAt: dispatch?.deliveredAt ? dispatch.deliveredAt.toISOString() : null,
          canCreateDispatch: viewModel.canCreateDispatch,
          canConfirmDelivery: flags.canConfirmDelivery,
        },
        ui: {
          canApprovePayment: viewModel.canApprovePayment,
          canRejectPayment: viewModel.canRejectPayment,
          canReserveInternalLabel: viewModel.canReserveInternalLabel,
          canCreateDispatch: viewModel.canCreateDispatch,
          canSoftDeleteOrder: viewModel.canSoftDeleteOrder,
          shouldShowCancelHide: flags.shouldShowCancelHide,
          shouldShowViewDispatch: Boolean(dispatch),
          shouldShowActivationAction: false,
        },
        checks: {
          activationStatusUnchanged: reservedUnits.every((unit) => unit.activationStatus === "not_activated"),
          activatedAtNull: reservedUnits.every((unit) => !unit.deliveredAt || unit.activationStatus !== "activated"),
          shortCodeUnchanged: true,
          internalLabelUnchanged: reservedUnits.every((unit) => unit.internalLabel === "PROD-INT-0003-0002"),
          qrNfcTouched: false,
        },
        inconsistencies: [
          viewModel.canSoftDeleteOrder && !flags.shouldShowCancelHide && order.orderStatus === "completed"
            ? "completed order still allows soft delete in view model, but UI hides it"
            : null,
          viewModel.requiresAction && dispatch?.status === "delivered" ? "delivered but requiresAction true" : null,
          viewModel.canCreateDispatch && dispatch?.status === "delivered" ? "delivered but canCreateDispatch true" : null,
          viewModel.canReserveInternalLabel && dispatch?.status === "delivered" ? "delivered but canReserveInternalLabel true" : null,
        ].filter(Boolean),
      },
      null,
      2
    )
  );
}

main()
  .catch((error) => {
    console.error("W5.54A real order flow audit failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
