import { Prisma } from "@prisma/client";
import { resolveCommercialOrderItemKey } from "@/app/api/admin/operations/commercial-orders/commercial-orders.helpers";
import {
  isCommercialOrderEligibleForReservation,
  reserveCommercialOrderStock,
} from "@/lib/operations/commercial-order-reservation";

export async function reconcileCustomerProducedUnitReservation(
  tx: Prisma.TransactionClient,
  input: { commercialOrderId: string; unitId: string }
) {
  const order = await tx.operationCommercialOrder.findUnique({
    where: { id: input.commercialOrderId },
    include: {
      items: {
        include: {
          finishedGood: { select: { code: true, productType: true } },
        },
      },
    },
  });
  if (!order) throw new Error("COMMERCIAL_ORDER_NOT_FOUND");
  if (order.customerType === "internal") return null;

  const unit = await tx.operationFinishedGoodUnit.findUnique({
    where: { id: input.unitId },
    select: {
      id: true,
      productCode: true,
      status: true,
      qaStatus: true,
      activationStatus: true,
      reservedOrderId: true,
      dispatchItems: { select: { id: true }, take: 1 },
    },
  });
  if (!unit) throw new Error("UNIT_NOT_FOUND");

  const reservationOrderId = order.sourceId || order.id;
  if (unit.reservedOrderId && unit.reservedOrderId !== reservationOrderId) {
    throw new Error("PRODUCED_UNIT_RESERVED_TO_OTHER_ORDER");
  }

  const requiredByCode = new Map<string, number>();
  for (const item of order.items) {
    const code = resolveCommercialOrderItemKey(item);
    if (!code) continue;
    requiredByCode.set(code, (requiredByCode.get(code) || 0) + item.quantity);
  }

  const requiredQty = requiredByCode.get(unit.productCode) || 0;
  if (requiredQty <= 0) {
    throw new Error("PRODUCED_UNIT_PRODUCT_MISMATCH");
  }

  // Once fulfilment has already advanced, QC retry is deliberately a no-op.
  if (
    unit.dispatchItems.length > 0 ||
    ["dispatched", "delivered", "activated"].includes(unit.status) ||
    (["stock_reserved", "dispatch_created"].includes(order.status) && unit.reservedOrderId === reservationOrderId)
  ) {
    return null;
  }

  if (!isCommercialOrderEligibleForReservation(order)) {
    throw new Error("ORDER_NOT_READY_FOR_RESERVATION");
  }

  if (unit.reservedOrderId === reservationOrderId && unit.status === "reserved") {
    return reserveCommercialOrderStock(tx, {
      orderId: order.id,
      allowPartial: true,
    });
  }

  if (
    unit.status !== "available" ||
    unit.qaStatus !== "passed" ||
    unit.activationStatus !== "not_activated" ||
    unit.reservedOrderId !== null
  ) {
    throw new Error("PRODUCED_UNIT_NOT_RESERVABLE");
  }

  const alreadyReservedForCode = await tx.operationFinishedGoodUnit.count({
    where: {
      reservedOrderId: reservationOrderId,
      status: "reserved",
      productCode: unit.productCode,
      dispatchItems: { none: {} },
    },
  });

  if (alreadyReservedForCode < requiredQty) {
    const claimed = await tx.operationFinishedGoodUnit.updateMany({
      where: {
        id: unit.id,
        productCode: unit.productCode,
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
    if (claimed.count !== 1) throw new Error("PRODUCED_UNIT_RESERVATION_RACE");

    await tx.operationFinishedGoodUnitEvent.create({
      data: {
        unitId: unit.id,
        eventType: "RESERVED",
        reason: `Unidad fabricada reservada para su pedido origen ${reservationOrderId}`,
        referenceType: "commercial_order",
        referenceId: order.id,
        metadataJson: {
          commercialOrderId: order.id,
          customerOrderId: reservationOrderId,
          productCode: unit.productCode,
          reservationSource: "customer_production_qc",
        },
      },
    });
  }

  return reserveCommercialOrderStock(tx, {
    orderId: order.id,
    allowPartial: true,
  });
}
