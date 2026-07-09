import { prisma } from "../lib/prisma";
import { buildOperationsOrderViewModel } from "../lib/operations/operations-order-view-model";

type Args = {
  recent?: number;
  code?: string;
  dispatch?: string;
};

function parseArgs(argv: string[]): Args {
  const args: Args = {};
  for (let i = 2; i < argv.length; i += 1) {
    const value = argv[i + 1];
    if (argv[i] === "--recent") {
      args.recent = Number(value);
      i += 1;
    } else if (argv[i] === "--code") {
      args.code = value;
      i += 1;
    } else if (argv[i] === "--dispatch") {
      args.dispatch = value;
      i += 1;
    }
  }
  return args;
}

function normalizeStatus(value: string | null | undefined) {
  return (value || "").trim().toLowerCase();
}

function getTab(orderStatus: string, dispatchStatus: string | null, requiresAction: boolean) {
  if (["completed", "delivered"].includes(normalizeStatus(orderStatus)) || ["completed", "delivered"].includes(normalizeStatus(dispatchStatus))) {
    return "Completados";
  }
  if (requiresAction) return "Pendientes";
  return "Activos";
}

function asIso(value: Date | string | null | undefined) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

async function loadOrders(args: Args) {
  const take = args.recent && args.recent > 0 ? args.recent : 30;
  const where = args.code ? { orderNumber: args.code } : {};
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

async function loadDispatches(args: Args) {
  const where = args.dispatch
    ? {
        OR: [
          { id: args.dispatch },
          { code: args.dispatch },
        ],
      }
    : args.code
      ? {
          OR: [
            { code: { contains: args.code } },
            {
              events: {
                some: {
                  OR: [
                    { referenceType: "order", referenceId: args.code },
                    { metadataJson: { contains: `"orderCode":"${args.code}"` } },
                    { metadataJson: { contains: `"orderId":"${args.code}"` } },
                  ],
                },
              },
            },
          ],
        }
      : {};

  return prisma.operationDispatch.findMany({
    where,
    orderBy: { createdAt: "desc" },
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
            },
          },
        },
      },
      events: {
        orderBy: { createdAt: "asc" },
        select: { referenceType: true, referenceId: true, metadataJson: true, createdAt: true },
      },
    },
    take: args.recent && args.recent > 0 ? args.recent : 30,
  });
}

function extractOrderId(dispatch: {
  events: Array<{ referenceType: string; referenceId: string; metadataJson: string | null }>;
  destinationReference?: string | null;
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
  return dispatch.destinationReference || null;
}

function toDeliveryCandidate(order: any, dispatch: any) {
  const quantity = order.items.reduce((sum: number, item: { quantity: number }) => sum + item.quantity, 0);
  const reservedUnits = dispatch?.items?.filter((item: any) => Boolean(item.unitId)) || [];
  const orderStatus = normalizeStatus(order.orderStatus);
  const dispatchStatus = normalizeStatus(dispatch?.status);
  const blockers: string[] = [];

  if (!dispatch) blockers.push("no dispatch");
  if (dispatchStatus === "delivered") blockers.push("dispatch already delivered");
  if (orderStatus === "completed") blockers.push("order completed");
  if (orderStatus === "cancelled") blockers.push("order cancelled");
  if (reservedUnits.length < quantity) blockers.push("missing reserved units");
  if (dispatch?.items?.some((item: any) => item.unitRecord?.activationStatus === "activated")) blockers.push("activation touched unexpectedly");

  if (dispatch && orderStatus && dispatchStatus && orderStatus !== "completed" && dispatchStatus === "delivered") {
    blockers.push("inconsistent order/dispatch status");
  }

  const canCreateDispatch = Boolean(dispatch) === false && quantity > 0 && reservedUnits.length === quantity && order.paymentStatus === "paid";
  const requiresAction = Boolean(order.orderStatus && !["completed", "delivered", "cancelled"].includes(order.orderStatus));

  return {
    deliveryCandidate: blockers.length === 0,
    blockers,
    canCreateDispatch,
    requiresAction,
    tabRecommended: getTab(order.orderStatus, dispatch?.status || null, requiresAction),
    expectedAfterDelivery: {
      dispatch: "delivered",
      order: "completed",
      tab: "Completados",
      activation: "unchanged",
      shortCode: "unchanged",
      internalLabel: "unchanged",
    },
  };
}

async function main() {
  const args = parseArgs(process.argv);
  const [orders, dispatches] = await Promise.all([loadOrders(args), loadDispatches(args)]);

  const dispatchByOrderId = new Map<string, (typeof dispatches)[number]>();
  for (const dispatch of dispatches) {
    const orderId = extractOrderId(dispatch as any);
    if (orderId && !dispatchByOrderId.has(orderId)) {
      dispatchByOrderId.set(orderId, dispatch);
    }
  }

  const rows = await Promise.all(orders.map(async (order) => {
    const dispatch = dispatchByOrderId.get(order.id) || null;
    const reservedUnits = await awaitReservedUnits(order.id);
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

    const quantity = order.items.reduce((sum, item) => sum + item.quantity, 0);
    const candidateInfo = toDeliveryCandidate(order, dispatch);
    return {
      orderId: order.id,
      orderCode: order.orderNumber,
      orderStatus: order.orderStatus,
      paymentStatus: order.paymentStatus,
      dispatchId: dispatch?.id || null,
      dispatchCode: dispatch?.code || null,
      dispatchStatus: dispatch?.status || null,
      dispatchCreatedAt: asIso(dispatch?.createdAt),
      dispatchDeliveredAt: asIso(dispatch?.deliveredAt),
      reservedUnitsCount: reservedUnits.length,
      units: reservedUnits.map((unit) => ({
        id: unit.id,
        internalLabel: unit.internalLabel,
        status: unit.status,
        qaStatus: unit.qaStatus,
        activationStatus: unit.activationStatus,
        shortCodeExists: false,
        reservedOrderId: unit.reservedOrderId,
      })),
      canCreateDispatch: viewModel.canCreateDispatch,
      requiresAction: viewModel.requiresAction,
      tabRecommended: candidateInfo.tabRecommended,
      deliveryCandidate: candidateInfo.deliveryCandidate,
      blockers: candidateInfo.blockers,
      expectedAfterDelivery: candidateInfo.expectedAfterDelivery,
      quantity,
    };
  }));

  console.log("=== W5.53A Dispatch Delivery Audit ===");
  console.log(JSON.stringify({ scanned: rows.length }, null, 2));
  for (const row of rows) {
    console.log(JSON.stringify(row, null, 2));
  }
}

async function awaitReservedUnits(orderId: string) {
  return prisma.operationFinishedGoodUnit.findMany({
    where: { reservedOrderId: orderId },
    orderBy: [{ createdAt: "asc" }, { internalLabel: "asc" }],
    select: {
      id: true,
      internalLabel: true,
      status: true,
      qaStatus: true,
      activationStatus: true,
      reservedOrderId: true,
    },
  });
}

main()
  .catch((error) => {
    console.error("W5.53A dispatch delivery audit failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
