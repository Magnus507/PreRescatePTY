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
  if (!isCommercialOrderEligibleForReservation(order)) {
    throw new Error("ORDER_NOT_READY_FOR_RESERVATION");
  }

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

  // A retry after the unit has already progressed into a dispatch must be a
  // no-op. Re-running generic stock reservation here could make a completed
  // fulfilment look short because dispatched units are intentionally excluded.
  if (unit.dispatchItems.length > 0 || ["dispatched", "delivered", "activated"].includes(unit.status)) {
    if (unit.reservedOrderId && unit.reservedOrderId !== reservationOrderId) {
      throw new Error("PRODUCED_UNIT_RESERVED_TO_OTHER_ORDER");
    }
    return null;
  }

  if (unit.reservedOrderId && unit.reservedOrderId !== reservationOrderId) {
    throw new Error("PRODUCED_UNIT_RESERVED_TO_OTHER_ORDER");
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

  // If the order is already fully covered by this SKU, do not over-reserve the
  // newly produced unit. It remains legitimate free stock.
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

  // Complete any remaining quantities with the normal strict FIFO allocator.
  return reserveCommercialOrderStock(tx, {
    orderId: order.id,
    allowPartial: true,
  });
}
