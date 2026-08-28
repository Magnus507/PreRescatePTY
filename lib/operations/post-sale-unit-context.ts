import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const unitContextSelect = {
  id: true,
  internalLabel: true,
  productCode: true,
  productName: true,
  status: true,
  activationStatus: true,
  deliveredAt: true,
  reservedOrderId: true,
  dispatchItems: {
    orderBy: { createdAt: "desc" as const },
    select: {
      dispatchId: true,
      dispatch: {
        select: {
          id: true,
          code: true,
          status: true,
          deliveredAt: true,
          destinationName: true,
          commercialOrders: {
            select: {
              id: true,
              code: true,
              sourceId: true,
              customerName: true,
              customerEmail: true,
              customerPhone: true,
              items: {
                select: {
                  id: true,
                  finishedGoodId: true,
                  productCode: true,
                  productName: true,
                },
              },
            },
          },
        },
      },
    },
  },
} as const;

export type PostSaleUnitContext = {
  unit: {
    id: string;
    internalLabel: string;
    productCode: string;
    productName: string;
    status: string;
    activationStatus: string;
    deliveredAt: Date | null;
    reservedOrderId: string | null;
  };
  dispatch: { id: string; code: string; status: string; deliveredAt: Date | null } | null;
  commercialOrder: { id: string; code: string; customerName: string | null; customerEmail: string | null; customerPhone: string | null } | null;
  commercialOrderItem: { id: string; productCode: string | null; productName: string; finishedGoodId: string | null } | null;
  finishedGood: { id: string; code: string; name: string } | null;
};

function isDeliveredUnit(unit: { status: string; deliveredAt: Date | null }) {
  return Boolean(unit.deliveredAt) || unit.status === "delivered" || unit.status === "activated";
}

export async function resolvePostSaleUnitContext(
  tx: Prisma.TransactionClient,
  unitId: string
): Promise<PostSaleUnitContext> {
  const unit = await tx.operationFinishedGoodUnit.findUnique({ where: { id: unitId }, select: unitContextSelect });
  if (!unit) throw new Error("INVALID_UNIT");
  if (!isDeliveredUnit(unit)) throw new Error("UNIT_NOT_DELIVERED");

  const dispatch = unit.dispatchItems.map((item) => item.dispatch).find((item) => item.deliveredAt || item.status === "delivered")
    || unit.dispatchItems[0]?.dispatch
    || null;

  const orderCandidates = dispatch?.commercialOrders || [];
  const commercialOrder = orderCandidates.find((order) => order.sourceId && order.sourceId === unit.reservedOrderId)
    || orderCandidates[0]
    || (unit.reservedOrderId
      ? await tx.operationCommercialOrder.findFirst({
          where: { OR: [{ sourceId: unit.reservedOrderId }, { id: unit.reservedOrderId }] },
          select: {
            id: true,
            code: true,
            sourceId: true,
            customerName: true,
            customerEmail: true,
            customerPhone: true,
            items: { select: { id: true, finishedGoodId: true, productCode: true, productName: true } },
          },
        })
      : null);

  const commercialOrderItem = commercialOrder?.items.find((item) => item.productCode === unit.productCode) || null;
  const finishedGood = await tx.operationFinishedGood.findUnique({
    where: { code: unit.productCode },
    select: { id: true, code: true, name: true },
  });

  return {
    unit: {
      id: unit.id,
      internalLabel: unit.internalLabel,
      productCode: unit.productCode,
      productName: unit.productName,
      status: unit.status,
      activationStatus: unit.activationStatus,
      deliveredAt: unit.deliveredAt,
      reservedOrderId: unit.reservedOrderId,
    },
    dispatch: dispatch ? { id: dispatch.id, code: dispatch.code, status: dispatch.status, deliveredAt: dispatch.deliveredAt } : null,
    commercialOrder: commercialOrder ? {
      id: commercialOrder.id,
      code: commercialOrder.code,
      customerName: commercialOrder.customerName,
      customerEmail: commercialOrder.customerEmail,
      customerPhone: commercialOrder.customerPhone,
    } : null,
    commercialOrderItem: commercialOrderItem ? {
      id: commercialOrderItem.id,
      productCode: commercialOrderItem.productCode,
      productName: commercialOrderItem.productName,
      finishedGoodId: commercialOrderItem.finishedGoodId,
    } : null,
    finishedGood,
  };
}

export async function listPostSaleUnitCandidates() {
  const units = await prisma.operationFinishedGoodUnit.findMany({
    where: {
      OR: [
        { deliveredAt: { not: null } },
        { status: { in: ["delivered", "activated"] } },
      ],
    },
    orderBy: { updatedAt: "desc" },
    select: {
      ...unitContextSelect,
      warranties: { select: { id: true, code: true, status: true, coverageStatus: true }, orderBy: { createdAt: "desc" as const } },
      originalReplacements: { select: { id: true, code: true, status: true }, orderBy: { createdAt: "desc" as const } },
      returns: { select: { id: true, code: true, status: true }, orderBy: { createdAt: "desc" as const } },
    },
  });

  const finishedGoods = await prisma.operationFinishedGood.findMany({
    where: { code: { in: [...new Set(units.map((unit) => unit.productCode))] } },
    select: { id: true, code: true, name: true },
  });
  const finishedGoodByCode = new Map(finishedGoods.map((item) => [item.code, item]));

  return units.map((unit) => {
    const dispatch = unit.dispatchItems.map((item) => item.dispatch).find((item) => item.deliveredAt || item.status === "delivered")
      || unit.dispatchItems[0]?.dispatch
      || null;
    const orders = dispatch?.commercialOrders || [];
    const order = orders.find((item) => item.sourceId && item.sourceId === unit.reservedOrderId) || orders[0] || null;
    const orderItem = order?.items.find((item) => item.productCode === unit.productCode) || null;
    const finishedGood = finishedGoodByCode.get(unit.productCode) || null;

    return {
      id: unit.id,
      internalLabel: unit.internalLabel,
      productCode: unit.productCode,
      productName: unit.productName,
      status: unit.status,
      activationStatus: unit.activationStatus,
      deliveredAt: unit.deliveredAt?.toISOString() || dispatch?.deliveredAt?.toISOString() || null,
      dispatch: dispatch ? { id: dispatch.id, code: dispatch.code, status: dispatch.status } : null,
      commercialOrder: order ? {
        id: order.id,
        code: order.code,
        customerName: order.customerName,
        customerEmail: order.customerEmail,
        customerPhone: order.customerPhone,
      } : null,
      commercialOrderItem: orderItem ? { id: orderItem.id, productCode: orderItem.productCode, productName: orderItem.productName } : null,
      finishedGood,
      warranties: unit.warranties,
      replacements: unit.originalReplacements,
      returns: unit.returns,
    };
  });
}
