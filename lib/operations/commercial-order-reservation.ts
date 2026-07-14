import { Prisma } from "@prisma/client";
import {
  getCommercialOrderItemProductType,
  resolveCommercialOrderItemKey,
} from "@/app/api/admin/operations/commercial-orders/commercial-orders.helpers";

export type CommercialOrderReservationInput = {
  orderId: string;
  allowPartial?: boolean;
  requestedQty?: number;
};

export type CommercialOrderReservationResult = {
  order: {
    id: string;
    status: string;
    paymentStatus: string;
    fulfillmentStatus: string;
  };
  reservedUnits: Array<{
    id: string;
    internalLabel: string;
    productCode: string;
    productType: string;
  }>;
  missingItems: Array<{
    itemId: string;
    productCode: string;
    requestedQty: number;
    reservedQty: number;
    missingQty: number;
  }>;
  summary: {
    requestedQty: number;
    reservedQty: number;
    missingQty: number;
    status: string;
  };
};

async function reserveUnitsForOrderItem(
  tx: Prisma.TransactionClient,
  orderId: string,
  item: {
    id: string;
    quantity: number;
    productCode: string | null;
    finishedGoodId: string | null;
    finishedGood: { code: string; productType: string } | null;
  }
) {
  const productCode = resolveCommercialOrderItemKey(item);
  const productType = getCommercialOrderItemProductType(item);

  const units = await tx.operationFinishedGoodUnit.findMany({
    where: {
      productCode,
      productType,
      status: "available",
      qaStatus: "passed",
      activationStatus: "not_activated",
      reservedOrderId: null,
      dispatchItems: { none: {} },
    },
    orderBy: [{ createdAt: "asc" }, { internalLabel: "asc" }],
    take: item.quantity,
  });

  if (units.length < item.quantity) {
    return {
      productCode,
      requestedQty: item.quantity,
      reservedQty: units.length,
      missingQty: item.quantity - units.length,
      units,
    };
  }

  await tx.operationFinishedGoodUnit.updateMany({
    where: { id: { in: units.map((unit) => unit.id) } },
    data: {
      status: "reserved",
      reservedOrderId: orderId,
      reservedAt: new Date(),
    },
  });

  await tx.operationFinishedGoodUnitEvent.createMany({
    data: units.map((unit) => ({
      unitId: unit.id,
      eventType: "RESERVED",
      reason: `Reservado para pedido comercial ${orderId}`,
      referenceType: "commercial_order",
      referenceId: orderId,
      metadataJson: { orderId, productCode, productType },
    })),
  });

  return {
    productCode,
    requestedQty: item.quantity,
    reservedQty: units.length,
    missingQty: 0,
    units,
  };
}

export async function reserveCommercialOrderStock(
  tx: Prisma.TransactionClient,
  input: CommercialOrderReservationInput
): Promise<CommercialOrderReservationResult | null> {
  const order = await tx.operationCommercialOrder.findUnique({
    where: { id: input.orderId },
    include: {
      items: {
        include: {
          finishedGood: {
            select: { code: true, productType: true },
          },
        },
      },
    },
  });

  if (!order) return null;

  if (order.customerType === "internal") {
    throw new Error("INTERNAL_ORDER_NO_RESERVATION");
  }

  if (!["accepted", "confirmed", "draft"].includes(order.status) && order.paymentStatus !== "paid") {
    throw new Error("ORDER_NOT_READY_FOR_RESERVATION");
  }

  const reservationResults = [];
  const missingItems = [];

  for (const item of order.items) {
    const reservation = await reserveUnitsForOrderItem(tx, order.id, item);
    reservationResults.push({
      itemId: item.id,
      ...reservation,
    });
    if (reservation.missingQty > 0) {
      missingItems.push({
        itemId: item.id,
        productCode: reservation.productCode,
        requestedQty: reservation.requestedQty,
        reservedQty: reservation.reservedQty,
        missingQty: reservation.missingQty,
      });
    }
  }

  const totalRequested = reservationResults.reduce((sum, result) => sum + result.requestedQty, 0);
  const totalReserved = reservationResults.reduce((sum, result) => sum + result.reservedQty, 0);
  const totalMissing = reservationResults.reduce((sum, result) => sum + result.missingQty, 0);
  const fullStockReserved = totalMissing === 0 && totalRequested > 0;

  if (totalMissing > 0 && !input.allowPartial) {
    throw new Error("INSUFFICIENT_UNIT_STOCK");
  }

  await tx.operationCommercialOrder.update({
    where: { id: order.id },
    data: {
      status: fullStockReserved ? "stock_reserved" : totalReserved > 0 ? "pending_stock" : "needs_production",
      fulfillmentStatus: totalReserved > 0 ? "reserved" : "pending",
    },
  });

  return {
    order: {
      id: order.id,
      status: fullStockReserved ? "stock_reserved" : totalReserved > 0 ? "pending_stock" : "needs_production",
      paymentStatus: order.paymentStatus,
      fulfillmentStatus: totalReserved > 0 ? "reserved" : "pending",
    },
    reservedUnits: reservationResults.flatMap((result) => result.units),
    missingItems,
    summary: {
      requestedQty: totalRequested,
      reservedQty: totalReserved,
      missingQty: totalMissing,
      status: fullStockReserved ? "stock_reserved" : totalReserved > 0 ? "pending_stock" : "needs_production",
    },
  };
}

