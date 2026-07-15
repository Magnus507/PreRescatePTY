import { prisma } from "@/lib/prisma";
import { moneyToNumber } from "@/lib/money";

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

function normalizeTotal(amount: number, commercialTotal: number, itemsTotal: number) {
  return [amount, commercialTotal, itemsTotal].find((value) => Number.isFinite(value) && value > 0) || 0;
}

function asIso(value: Date | string | null | undefined) {
  if (!value) return null;
  if (value instanceof Date) return Number.isFinite(value.getTime()) ? value.toISOString() : null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}

type AuditReservedUnit = {
  id: string;
  internalLabel: string;
  productCode: string;
  productName: string;
  status: string;
  qaStatus: string | null;
  activationStatus: string;
  reservedOrderId: string | null;
  reservedAt: Date | null;
  dispatchedAt: Date | null;
  deliveredAt: Date | null;
  activatedAt: Date | null;
  digitalBatchId: string | null;
  digitalBatchItemId: string | null;
  printOrderId: string | null;
  shortCode: string | null;
};

async function loadDispatchForOrder(orderId: string) {
  const dispatch = await prisma.operationDispatch.findFirst({
    where: {
      events: {
        some: {
          OR: [
            { referenceType: "order", referenceId: orderId },
            { metadataJson: { contains: `"orderId":"${orderId}"` } },
          ],
        },
      },
    },
    include: {
      items: {
        select: {
          id: true,
          unitId: true,
          internalLabel: true,
          productCode: true,
          productName: true,
          status: true,
          pickedAt: true,
          packedAt: true,
          dispatchedAt: true,
          deliveredAt: true,
        },
      },
      events: {
        orderBy: { createdAt: "asc" },
        select: {
          eventType: true,
          createdAt: true,
          metadataJson: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return dispatch;
}

async function main() {
  const args = parseArgs(process.argv);
  const where = args.code ? { orderNumber: args.code } : {};
  const recent = args.recent && args.recent > 0 ? args.recent : 10;

  const orders = await prisma.order.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: recent,
    include: {
      user: { include: { profile: true } },
      items: {
        include: {
          profile: true,
          chip: true,
        },
      },
    },
  });

  console.log("=== W5.46A Order Operational Flow Audit ===");
  console.log(`ordersScanned: ${orders.length}`);

  for (const order of orders) {
    const itemTotal = order.items.reduce((sum, item) => sum + moneyToNumber(item.totalPrice || 0), 0);
    const normalizedTotal = normalizeTotal(moneyToNumber(order.amount || 0), 0, itemTotal);
    const reservedUnits = await prisma.operationFinishedGoodUnit.findMany({
      where: { reservedOrderId: order.id },
      orderBy: [{ createdAt: "asc" }, { internalLabel: "asc" }],
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
        activatedAt: true,
        digitalBatchId: true,
        digitalBatchItemId: true,
        printOrderId: true,
      } as never,
    }) as AuditReservedUnit[];

    const dispatch = await loadDispatchForOrder(order.id);
    const dispatchItems = dispatch?.items || [];
    const dispatchStatus = dispatch?.status || null;
    const orderStatus = order.orderStatus;

    console.log(JSON.stringify({
      id: order.id,
      orderNumber: order.orderNumber,
      status: orderStatus,
      paymentStatus: order.paymentStatus,
      orderSource: order.provider,
      orderKind: order.orderType,
      createdAt: asIso(order.createdAt),
      updatedAt: asIso(order.updatedAt),
      userId: order.userId,
      customerName: order.customerName,
      customerEmail: order.customerEmail,
      customerPhone: order.customerPhone,
      shippingAddress: order.shippingAddress,
      shippingCity: order.shippingCity,
      shippingNotes: order.shippingNotes,
      paymentMethod: order.paymentMethod,
      paymentProofAvailable: Boolean(order.paymentProofUrl || order.manualPaymentReference),
      amount: moneyToNumber(order.amount),
      commercialTotal: itemTotal,
      totalNormalized: normalizedTotal,
      items: order.items.map((item) => ({
        id: item.id,
        productName: item.productType,
        productCode: item.productType,
        quantity: item.quantity,
        unitPrice: moneyToNumber(item.unitPrice),
        totalPrice: moneyToNumber(item.totalPrice),
        expectedUnits: item.quantity,
      })),
      reservation: {
        reservedUnitsCount: reservedUnits.length,
        reservedUnitsLabels: reservedUnits.map((unit) => unit.internalLabel),
        reservedOrderId: reservedUnits[0]?.reservedOrderId || null,
        reservedAt: reservedUnits[0]?.reservedAt ? asIso(reservedUnits[0].reservedAt) : null,
        reservationStatus: reservedUnits.length > 0 ? "reserved" : "none",
        reservationSource: reservedUnits.length > 0 ? "operationFinishedGoodUnit" : "none",
        reservedQtyVsOrderedQty: `${reservedUnits.length}/${order.items.reduce((sum, item) => sum + item.quantity, 0)}`,
        missingReservedUnits: Math.max(order.items.reduce((sum, item) => sum + item.quantity, 0) - reservedUnits.length, 0),
      },
      units: reservedUnits.map((unit) => ({
        id: unit.id,
        internalLabel: unit.internalLabel,
        productCode: unit.productCode,
        productName: unit.productName,
        status: unit.status,
        qaStatus: unit.qaStatus,
        activationStatus: unit.activationStatus,
        shortCode: null,
        hasShortCode: false,
        reservedOrderId: unit.reservedOrderId,
        reservedAt: asIso(unit.reservedAt),
        dispatchId: dispatch?.id || null,
        dispatchedAt: asIso(unit.dispatchedAt),
        deliveredAt: asIso(unit.deliveredAt),
        activatedAt: asIso(unit.activatedAt),
        productionOrderId: null,
        digitalBatchId: unit.digitalBatchId,
        digitalBatchItemId: unit.digitalBatchItemId,
        printOrderId: unit.printOrderId,
      })),
      dispatch: {
        exists: Boolean(dispatch),
        id: dispatch?.id || null,
        status: dispatchStatus,
        preparedAt: dispatchItems.some((item) => item.status === "prepared") ? true : false,
        sentAt: asIso(dispatch?.sentAt),
        deliveredAt: asIso(dispatch?.deliveredAt),
        relatedUnits: dispatchItems.map((item) => item.internalLabel || item.unitId || item.id),
        orderStatusVsDispatchStatus: `${orderStatus} / ${dispatchStatus || "none"}`,
      },
      activation: reservedUnits.map((unit) => ({
        activationStatus: unit.activationStatus,
        shortCode: unit.shortCode,
        digitalBatchItemId: unit.digitalBatchItemId,
        claimToken: null,
        note: "La reserva/despacho no activa el chip; la activación permanece separada.",
      })),
      buttons: {
        approvePayment: ["pending", "under_review"].includes(order.paymentStatus),
        rejectPayment: ["pending", "under_review"].includes(order.paymentStatus),
        reserveInternalLabel: order.paymentStatus === "paid" || Boolean(order.paymentProofUrl || order.manualPaymentReference),
        sendToDispatch: reservedUnits.length > 0 && !dispatch,
        cancelHide: order.orderStatus !== "cancelled" && order.orderStatus !== "completed",
      },
    }, null, 2));
  }
}

main()
  .catch((error) => {
    console.error("W5.46A audit failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
