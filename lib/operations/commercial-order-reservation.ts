import { Prisma } from "@prisma/client";
import {
  getCommercialOrderReservationOwnerId,
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

const RESERVATION_ELIGIBLE_ORDER_STATUSES = new Set([
  "accepted",
  "confirmed",
  "draft",
  "needs_production",
  "pending_stock",
]);

export function isCommercialOrderEligibleForReservation(order: {
  status: string;
  paymentStatus: string;
}) {
  return (
    order.paymentStatus === "paid" &&
    RESERVATION_ELIGIBLE_ORDER_STATUSES.has(order.status)
  );
}

async function reserveUnitsForProduct(
  tx: Prisma.TransactionClient,
  reservationOrderId: string,
  commercialOrderId: string,
  productCode: string,
  requestedQty: number
) {
  if (!productCode) {
    return {
      productCode: "",
      requestedQty,
      reservedQty: 0,
      missingQty: requestedQty,
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
  const requiredQty = Math.max(0, requestedQty - alreadyReservedQty);

  if (requiredQty === 0) {
    return {
      productCode,
      requestedQty,
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
    requestedQty,
    reservedQty: reservedUnits.length,
    missingQty: Math.max(0, requestedQty - reservedUnits.length),
    units: reservedUnits,
  };
}

export async function reserveCommercialOrderStock(
  tx: Prisma.TransactionClient,
  input: CommercialOrderReservationInput
): Promise<CommercialOrderReservationResult | null> {
  await tx.operationCommercialOrder.updateMany({
    where: { id: input.orderId },
    data: { updatedAt: new Date() },
  });
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
  if (!isCommercialOrderEligibleForReservation(order)) {
    throw new Error("ORDER_NOT_READY_FOR_RESERVATION");
  }

  // The operational projection may lag a real checkout cancellation. Never let
  // a stale paid projection re-reserve physical stock for a source Order that is
  // already terminal. Missing source rows are allowed for non-checkout/legacy
  // external references used by Operations.
  if (order.sourceId) {
    const sourceOrder = await tx.order.findUnique({
      where: { id: order.sourceId },
      select: { orderStatus: true },
    });
    if (sourceOrder?.orderStatus === "cancelled") {
      throw new Error("SOURCE_ORDER_CANCELLED");
    }
  }

  const reservationOrderId = getCommercialOrderReservationOwnerId(order);

  // Consolidate all order lines by canonical finished-good code before touching
  // physical stock. Counting reservations per line lets the same physical unit
  // satisfy multiple lines of the same SKU and can falsely mark the order as
  // fully reserved.
  const requirements = new Map<
    string,
    { itemId: string; productCode: string; requestedQty: number }
  >();
  for (const item of order.items) {
    const productCode = resolveCommercialOrderItemKey(item);
    const requirementKey = productCode || `__unmapped:${item.id}`;
    const existing = requirements.get(requirementKey);
    if (existing) {
      existing.requestedQty += item.quantity;
    } else {
      requirements.set(requirementKey, {
        itemId: item.id,
        productCode,
        requestedQty: item.quantity,
      });
    }
  }

  const reservationResults = [];
  const missingItems = [];

  for (const requirement of requirements.values()) {
    const reservation = await reserveUnitsForProduct(
      tx,
      reservationOrderId,
      order.id,
      requirement.productCode,
      requirement.requestedQty
    );
    reservationResults.push({
      itemId: requirement.itemId,
      ...reservation,
    });
    if (reservation.missingQty > 0) {
      missingItems.push({
        itemId: requirement.itemId,
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
