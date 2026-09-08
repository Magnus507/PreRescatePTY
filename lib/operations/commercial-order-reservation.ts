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

type ReservableUnit = {
  id: string;
  internalLabel: string;
  productCode: string;
  productType: string;
};

async function reserveUnitsForProduct(
  tx: Prisma.TransactionClient,
  reservationOrderId: string,
  commercialOrderId: string,
  productCode: string,
  requestedQty: number
) {
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

  const requiredQty = Math.max(0, requestedQty - existingReservedUnits.length);

  if (requiredQty > 0) {
    const candidates = await tx.operationFinishedGoodUnit.findMany({
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

    const candidateIds = candidates.map((unit) => unit.id);
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
    reservedQty: Math.min(requestedQty, reservedUnits.length),
    missingQty: Math.max(0, requestedQty - reservedUnits.length),
    units: reservedUnits.slice(0, requestedQty) as ReservableUnit[],
  };
}

export async function reserveCommercialOrderStock(
  tx: Prisma.TransactionClient,
  input: CommercialOrderReservationInput
): Promise<CommercialOrderReservationResult | null> {
  // Row-touch first: concurrent reservation attempts for the same commercial
  // order are serialized before stock is inspected.
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
  if (order.customerType === "internal") throw new Error("INTERNAL_ORDER_NO_RESERVATION");
  if (!isCommercialOrderEligibleForReservation(order)) {
    throw new Error("ORDER_NOT_READY_FOR_RESERVATION");
  }

  const reservationOrderId = order.sourceId || order.id;

  // One physical requirement per canonical product. Processing raw order lines
  // independently lets line B count the unit already reserved for line A when
  // both lines share a SKU. Aggregate before touching inventory so one physical
  // unit can satisfy exactly one requested unit.
  const requirements = new Map<string, { itemId: string; requestedQty: number }>();
  let unmappedRequestedQty = 0;
  let firstUnmappedItemId = "";

  for (const item of order.items) {
    const productCode = resolveCommercialOrderItemKey(item);
    const quantity = Math.max(0, Math.floor(Number(item.quantity) || 0));
    if (!productCode) {
      unmappedRequestedQty += quantity;
      if (!firstUnmappedItemId) firstUnmappedItemId = item.id;
      continue;
    }

    const current = requirements.get(productCode);
    if (current) {
      current.requestedQty += quantity;
    } else {
      requirements.set(productCode, { itemId: item.id, requestedQty: quantity });
    }
  }

  const reservationResults: Array<{
    itemId: string;
    productCode: string;
    requestedQty: number;
    reservedQty: number;
    missingQty: number;
    units: ReservableUnit[];
  }> = [];

  for (const [productCode, requirement] of requirements) {
    const reservation = await reserveUnitsForProduct(
      tx,
      reservationOrderId,
      order.id,
      productCode,
      requirement.requestedQty
    );
    reservationResults.push({ itemId: requirement.itemId, ...reservation });
  }

  if (unmappedRequestedQty > 0) {
    reservationResults.push({
      itemId: firstUnmappedItemId,
      productCode: "",
      requestedQty: unmappedRequestedQty,
      reservedQty: 0,
      missingQty: unmappedRequestedQty,
      units: [],
    });
  }

  const missingItems = reservationResults
    .filter((result) => result.missingQty > 0)
    .map((result) => ({
      itemId: result.itemId,
      productCode: result.productCode,
      requestedQty: result.requestedQty,
      reservedQty: result.reservedQty,
      missingQty: result.missingQty,
    }));

  const totalRequested = reservationResults.reduce((sum, result) => sum + result.requestedQty, 0);
  const totalReserved = reservationResults.reduce((sum, result) => sum + result.reservedQty, 0);
  const totalMissing = reservationResults.reduce((sum, result) => sum + result.missingQty, 0);
  const fullStockReserved = totalMissing === 0 && totalRequested > 0;

  if (totalMissing > 0 && !input.allowPartial) {
    throw new Error("INSUFFICIENT_UNIT_STOCK");
  }

  const status = fullStockReserved
    ? "stock_reserved"
    : totalReserved > 0
      ? "pending_stock"
      : "needs_production";
  const fulfillmentStatus = totalReserved > 0 ? "reserved" : "pending";

  await tx.operationCommercialOrder.update({
    where: { id: order.id },
    data: { status, fulfillmentStatus },
  });

  return {
    order: {
      id: order.id,
      status,
      paymentStatus: order.paymentStatus,
      fulfillmentStatus,
    },
    reservedUnits: reservationResults.flatMap((result) => result.units),
    missingItems,
    summary: {
      requestedQty: totalRequested,
      reservedQty: totalReserved,
      missingQty: totalMissing,
      status,
    },
  };
}
