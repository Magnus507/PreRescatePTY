import { Prisma } from "@prisma/client";
import { resolveCommercialOrderItemKey } from "@/app/api/admin/operations/commercial-orders/commercial-orders.helpers";

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
  reservationOrderId: string,
  commercialOrderId: string,
  item: {
    id: string;
    quantity: number;
    productCode: string | null;
    finishedGoodId: string | null;
    finishedGood: { code: string; productType: string } | null;
  }
) {
  // productCode is the canonical SKU that identifies the sellable finished good.
  // productType is descriptive metadata and has changed over time (legacy rows may
  // contain the SKU while current rows contain a slug), so it must never become a
  // second stock key that can make physically correct inventory invisible.
  const productCode = resolveCommercialOrderItemKey(item);

  if (!productCode) {
    return {
      productCode: "",
      requestedQty: item.quantity,
      reservedQty: 0,
      missingQty: item.quantity,
      units: [] as Array<{
        id: string;
        internalLabel: string;
        productCode: string;
        productType: string;
      }>,
    };
  }

  const existingReservedUnits = await tx.operationFinishedGoodUnit.findMany({
    where: {
      reservedOrderId: reservationOrderId,
      status: "reserved",
      productCode,
      dispatchItems: { none: {} },
    },
    orderBy: [{ createdAt: "asc" }, { internalLabel: "asc" }],
    select: {
      id: true,
      internalLabel: true,
      productCode: true,
      productType: true,
    },
  });

  const alreadyReservedQty = existingReservedUnits.length;
  const requiredQty = Math.max(0, item.quantity - alreadyReservedQty);

  if (requiredQty === 0) {
    return {
      productCode,
      requestedQty: item.quantity,
      reservedQty: alreadyReservedQty,
      missingQty: 0,
      units: existingReservedUnits,
    };
  }

  const units = await tx.operationFinishedGoodUnit.findMany({
    where: {
      productCode,
      status: "available",
      qaStatus: "passed",
      activationStatus: "not_activated",
      reservedOrderId: null,
      dispatchItems: { none: {} },
    },
    orderBy: [{ createdAt: "asc" }, { internalLabel: "asc" }],
    take: requiredQty,
    select: {
      id: true,
      internalLabel: true,
      productCode: true,
      productType: true,
    },
  });

  const candidateIds = units.map((unit) => unit.id);

  if (candidateIds.length > 0) {
    await tx.operationFinishedGoodUnit.updateMany({
      where: {
        id: { in: candidateIds },
        productCode,
        status: "available",
        qaStatus: "passed",
        activationStatus: "not_activated",
        reservedOrderId: null,
        dispatchItems: { none: {} },
      },
      data: {
        status: "reserved",
        reservedOrderId: reservationOrderId,
        reservedAt: new Date(),
      },
    });

    // Re-read after the conditional claim. If another order won a concurrent
    // race, only rows actually reserved by this order are returned and audited.
    const claimedUnits = await tx.operationFinishedGoodUnit.findMany({
      where: {
        id: { in: candidateIds },
        reservedOrderId: reservationOrderId,
        status: "reserved",
        productCode,
        dispatchItems: { none: {} },
      },
      orderBy: [{ createdAt: "asc" }, { internalLabel: "asc" }],
      select: {
        id: true,
        internalLabel: true,
        productCode: true,
        productType: true,
      },
    });

    if (claimedUnits.length > 0) {
      await tx.operationFinishedGoodUnitEvent.createMany({
        data: claimedUnits.map((unit) => ({
          unitId: unit.id,
          eventType: "RESERVED",
          reason: `Reservado para pedido cliente ${reservationOrderId}`,
          referenceType: "commercial_order",
          referenceId: commercialOrderId,
          metadataJson: {
            commercialOrderId,
            customerOrderId: reservationOrderId,
            productCode,
            productType: unit.productType,
          },
        })),
      });
    }
  }

  const reservedUnits = await tx.operationFinishedGoodUnit.findMany({
    where: {
      reservedOrderId: reservationOrderId,
      status: "reserved",
      productCode,
      dispatchItems: { none: {} },
    },
    orderBy: [{ createdAt: "asc" }, { internalLabel: "asc" }],
    select: {
      id: true,
      internalLabel: true,
      productCode: true,
      productType: true,
    },
  });

  return {
    productCode,
    requestedQty: item.quantity,
    reservedQty: reservedUnits.length,
    missingQty: Math.max(0, item.quantity - reservedUnits.length),
    units: reservedUnits,
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

  // Physical units belong to the real customer Order throughout picking and
  // dispatch. OperationCommercialOrder is the operational projection and stays
  // in the audit event as the reference, but must not become a second order id
  // for physical inventory.
  const reservationOrderId = order.sourceId || order.id;
  const reservationResults = [];
  const missingItems = [];

  for (const item of order.items) {
    const reservation = await reserveUnitsForOrderItem(
      tx,
      reservationOrderId,
      order.id,
      item
    );
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
