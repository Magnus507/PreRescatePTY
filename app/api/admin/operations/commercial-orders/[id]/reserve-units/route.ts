import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { GENERAL_ADMIN_ROLES, requireRole } from "@/lib/rbac";
import {
  getCommercialOrderItemProductType,
  resolveCommercialOrderItemKey,
} from "../../commercial-orders.helpers";

export const dynamic = "force-dynamic";

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
      productCode: productCode,
      productType,
      status: "available",
      qaStatus: "passed",
      activationStatus: "not_activated",
      reservedOrderId: null,
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

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole(GENERAL_ADMIN_ROLES);
  if (!auth.authorized) return auth.response;

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const allowPartial = Boolean(body?.allowPartial);

  try {
    const result = await prisma.$transaction(async (tx) => {
      const order = await tx.operationCommercialOrder.findUnique({
        where: { id },
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

      if (totalMissing > 0 && !allowPartial) {
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
        order,
        reservedUnits: reservationResults.flatMap((result) => result.units),
        missingItems,
        summary: {
          requestedQty: totalRequested,
          reservedQty: totalReserved,
          missingQty: totalMissing,
          status: fullStockReserved ? "stock_reserved" : totalReserved > 0 ? "pending_stock" : "needs_production",
        },
      };
    });

    if (!result) {
      return NextResponse.json({ error: "Pedido comercial no encontrado" }, { status: 404 });
    }

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Error && error.message === "INSUFFICIENT_UNIT_STOCK") {
      return NextResponse.json({ error: "No hay unidades suficientes para reservar" }, { status: 409 });
    }

    console.error("[operations/commercial-orders/:id/reserve-units] POST error:", error);
    return NextResponse.json({ error: "Error al reservar unidades para pedido" }, { status: 500 });
  }
}
