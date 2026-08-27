import type { Prisma } from "@prisma/client";

export type PostSaleUnitOrigin = {
  id: string;
  internalLabel: string;
  productCode: string;
  productName: string;
  status: string;
  activationStatus: string;
  deliveredAt: Date | null;
  reservedOrderId: string | null;
};

export async function assertPostSaleUnitOrigin(params: {
  tx: Prisma.TransactionClient;
  unitId: string;
  dispatchId?: string | null;
  commercialOrderId?: string | null;
}): Promise<PostSaleUnitOrigin> {
  const { tx, unitId, dispatchId = null, commercialOrderId = null } = params;

  const unit = await tx.operationFinishedGoodUnit.findUnique({
    where: { id: unitId },
    select: {
      id: true,
      internalLabel: true,
      productCode: true,
      productName: true,
      status: true,
      activationStatus: true,
      deliveredAt: true,
      reservedOrderId: true,
      dispatchItems: {
        select: { dispatchId: true },
      },
    },
  });

  if (!unit) throw new Error("INVALID_UNIT");

  const delivered =
    Boolean(unit.deliveredAt) ||
    unit.status === "delivered" ||
    unit.status === "activated";

  if (!delivered) throw new Error("UNIT_NOT_DELIVERED");

  const dispatchIds = new Set(unit.dispatchItems.map((item) => item.dispatchId));

  if (dispatchId && !dispatchIds.has(dispatchId)) {
    throw new Error("UNIT_DISPATCH_MISMATCH");
  }

  if (commercialOrderId) {
    const commercialOrder = await tx.operationCommercialOrder.findUnique({
      where: { id: commercialOrderId },
      select: {
        id: true,
        sourceId: true,
        dispatchId: true,
      },
    });

    if (!commercialOrder) throw new Error("INVALID_COMMERCIAL_ORDER");

    const reservationOrderId = commercialOrder.sourceId || commercialOrder.id;
    const matchesReservation = unit.reservedOrderId === reservationOrderId;
    const matchesDispatch = Boolean(
      commercialOrder.dispatchId && dispatchIds.has(commercialOrder.dispatchId)
    );

    if (!matchesReservation && !matchesDispatch) {
      throw new Error("UNIT_ORDER_MISMATCH");
    }

    if (
      dispatchId &&
      commercialOrder.dispatchId &&
      dispatchId !== commercialOrder.dispatchId
    ) {
      throw new Error("ORDER_DISPATCH_MISMATCH");
    }
  }

  return {
    id: unit.id,
    internalLabel: unit.internalLabel,
    productCode: unit.productCode,
    productName: unit.productName,
    status: unit.status,
    activationStatus: unit.activationStatus,
    deliveredAt: unit.deliveredAt,
    reservedOrderId: unit.reservedOrderId,
  };
}
