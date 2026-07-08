import { prisma } from "@/lib/prisma";
import { buildOperationsOrderViewModel } from "@/lib/operations/operations-order-view-model";
import { canAdminApproveManual, canAdminRejectManual, getOrderStatusLabel } from "@/lib/order-status";

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
  const take = args.recent && args.recent > 0 ? args.recent : 10;

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
      chipClaimTokens: {
        include: {
          chip: true,
        },
      },
    },
  });
}

async function main() {
  const args = parseArgs(process.argv);
  const orders = await loadOrders(args);

  console.log("=== W5.47A Full Orders Flow Audit ===");
  console.log(`ordersScanned: ${orders.length}`);

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
      select: {
        id: true,
        code: true,
        status: true,
        dispatchedAt: true,
        deliveredAt: true,
      },
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

    const expectedApprove = Boolean(order.paymentProofUrl || order.manualPaymentReference) && order.paymentStatus === "under_review";
    const expectedReject = expectedApprove;
    const expectedReserve = (order.paymentStatus === "paid" || order.adminReviewStatus === "approved") && reservedUnits.length === 0 && order.orderStatus !== "cancelled" && order.orderStatus !== "completed";
    const expectedDispatch = order.orderStatus !== "cancelled" && order.orderStatus !== "completed" && Boolean(dispatch) === false && reservedUnits.length > 0 && (order.paymentStatus === "paid" || order.adminReviewStatus === "approved");

    console.log(JSON.stringify({
      id: order.id,
      orderNumber: order.orderNumber,
      code: order.providerReference || order.orderNumber,
      status: order.orderStatus,
      paymentStatus: order.paymentStatus,
      orderSource: order.provider,
      orderKind: order.orderType,
      createdAt: asIso(order.createdAt),
      updatedAt: asIso(order.updatedAt),
      userId: order.userId,
      customerName: order.customerName,
      customerEmail: order.customerEmail || order.user?.email || null,
      customerPhone: order.customerPhone || order.user?.phone || null,
      shippingAddress: order.shippingAddress || null,
      shippingCity: order.shippingCity || null,
      shippingNotes: order.shippingNotes || null,
      paymentMethod: order.paymentMethod,
      paymentProof: Boolean(order.paymentProofUrl || order.manualPaymentReference),
      paymentProofUrl: order.paymentProofUrl || order.manualPaymentReference || null,
      amount: order.amount,
      commercialTotal: order.amount,
      totalNormalized: order.amount,
      items: order.items,
      reservedUnits: reservedUnits.map((unit) => ({
        id: unit.id,
        internalLabel: unit.internalLabel,
        status: unit.status,
        qaStatus: unit.qaStatus,
        activationStatus: unit.activationStatus,
        reservedOrderId: unit.reservedOrderId,
        reservedAt: asIso(unit.reservedAt),
        dispatchedAt: asIso(unit.dispatchedAt),
        deliveredAt: asIso(unit.deliveredAt),
        activatedAt: asIso(unit.activatedAt),
      })),
      dispatch: dispatch ? { id: dispatch.id, code: dispatch.code, status: dispatch.status } : null,
      activationRelated: reservedUnits.map((unit) => ({
        activationStatus: unit.activationStatus,
        activatedAt: asIso(unit.activatedAt),
      })),
      visibleActionFlags: {
        canApprovePayment: viewModel.canApprovePayment,
        canRejectPayment: viewModel.canRejectPayment,
        canReserveInternalLabel: viewModel.canReserveInternalLabel,
        canSendToProduction: viewModel.canSendToProduction,
        canCreateDispatch: viewModel.canCreateDispatch,
        canSoftDeleteOrder: viewModel.canSoftDeleteOrder,
      },
      expectedActionFlags: {
        canApprovePayment: expectedApprove,
        canRejectPayment: expectedReject,
        canReserveInternalLabel: expectedReserve,
        canSendToProduction: expectedReserve,
        canCreateDispatch: expectedDispatch,
        canSoftDeleteOrder: order.orderStatus !== "cancelled" && order.orderStatus !== "completed",
      },
      canAdminApproveManual: canAdminApproveManual(order),
      canAdminRejectManual: canAdminRejectManual(order),
      requiresAction: viewModel.requiresAction,
      pendingReasonLabel: viewModel.pendingReasonLabel,
      pendingCategory: viewModel.pendingCategory,
      orderStatusLabel: getOrderStatusLabel(order.orderStatus, order.paymentStatus),
    }, null, 2));
  }
}

main()
  .catch((error) => {
    console.error("W5.47A audit failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
