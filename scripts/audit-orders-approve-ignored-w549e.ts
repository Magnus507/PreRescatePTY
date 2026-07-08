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
    },
  });
}

async function main() {
  const args = parseArgs(process.argv);
  const orders = await loadOrders(args);

  console.log("=== W5.49E Approve Ignored Audit ===");
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

    console.log(JSON.stringify({
      orderNumber: order.orderNumber,
      id: order.id,
      status: order.orderStatus,
      paymentStatus: order.paymentStatus,
      paymentProofExists,
      canApproveExpected: paymentProofExists && order.paymentStatus === "under_review" && order.provider === "manual",
      canRejectExpected: paymentProofExists && order.paymentStatus === "under_review" && order.provider === "manual",
      approveActionKey: `approve:${order.id}`,
      rejectActionKey: `reject:${order.id}`,
      endpointExpected: `POST /api/admin/orders/${order.id}/approve`,
      afterApproveExpected: {
        paymentStatus: "paid",
        status: "processing",
        canApprove: false,
        canReject: false,
        canReserve: reservedUnits.length === 0,
        canDispatch: false,
      },
      visibleActionFlags: {
        canApprovePayment: viewModel.canApprovePayment,
        canRejectPayment: viewModel.canRejectPayment,
        canReserveInternalLabel: viewModel.canReserveInternalLabel,
        canCreateDispatch: viewModel.canCreateDispatch,
      },
      manualActions: {
        canAdminApproveManual: canAdminApproveManual(order),
        canAdminRejectManual: canAdminRejectManual(order),
      },
      reservedUnitsCount: reservedUnits.length,
      dispatchExists: Boolean(dispatch),
    }, null, 2));
  }
}

main()
  .catch((error) => {
    console.error("W5.49E audit failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
