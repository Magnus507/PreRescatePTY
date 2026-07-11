import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { GENERAL_ADMIN_ROLES, requireRole } from "@/lib/rbac";
import {
  getCommercialOrderItemProductType,
  resolveCommercialOrderItemKey,
} from "../../commercial-orders.helpers";

export const dynamic = "force-dynamic";

async function loadReservedQty(tx: Prisma.TransactionClient, orderId: string, productCode: string, productType: string) {
  return tx.operationFinishedGoodUnit.count({
    where: {
      reservedOrderId: orderId,
      productCode,
      productType,
      status: "reserved",
    },
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole(GENERAL_ADMIN_ROLES);
  if (!auth.authorized) return auth.response;

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const requestedQtyInput = Number(body?.quantity);
  const confirmPendingPayment = Boolean(body?.confirmPendingPayment);

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

      if (order.customerType === "internal") {
        throw new Error("INTERNAL_ORDER_NO_RESERVATION");
      }

      if (order.paymentStatus === "pending" && !confirmPendingPayment) {
        throw new Error("PAYMENT_PENDING_CONFIRMATION_REQUIRED");
      }

      if (!["accepted", "confirmed", "draft"].includes(order.status) && order.paymentStatus !== "paid" && !confirmPendingPayment) {
        throw new Error("ORDER_NOT_READY_FOR_RESERVATION");
      }

      const productCodes = Array.from(
        new Set(
          order.items
            .map((item) => resolveCommercialOrderItemKey(item))
            .filter(Boolean)
        )
      );

      if (productCodes.length !== 1) {
        throw new Error("MULTIPLE_PRODUCT_CODES_NOT_SUPPORTED");
      }

      const totalRequestedQty = order.items.reduce((sum, item) => sum + item.quantity, 0);
      const targetQty = Number.isFinite(requestedQtyInput) && requestedQtyInput > 0
        ? Math.min(Math.floor(requestedQtyInput), totalRequestedQty)
        : totalRequestedQty;

      const representativeItem = order.items[0];
      const productCode = resolveCommercialOrderItemKey(representativeItem);
      const productType = getCommercialOrderItemProductType(representativeItem);

      const alreadyReservedQty = await loadReservedQty(tx, order.id, productCode, productType);
      const remainingToReserve = Math.max(0, targetQty - alreadyReservedQty);

      const availableQty = await tx.operationFinishedGoodUnit.count({
        where: {
          productCode,
          productType,
          status: "available",
          qaStatus: "passed",
          activationStatus: "not_activated",
          reservedOrderId: null,
          dispatchItems: { none: {} },
        },
      });

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
        take: remainingToReserve,
      });

      if (units.length > 0) {
        await tx.operationFinishedGoodUnit.updateMany({
          where: { id: { in: units.map((unit) => unit.id) } },
          data: {
            status: "reserved",
            reservedOrderId: order.id,
            reservedAt: new Date(),
          },
        });

        await tx.operationFinishedGoodUnitEvent.createMany({
          data: units.map((unit) => ({
            unitId: unit.id,
            eventType: "RESERVED",
            reason: `Reservado para pedido comercial ${order.id}`,
            referenceType: "commercial_order",
            referenceId: order.id,
            metadataJson: { orderId: order.id, productCode, productType },
          })),
        });
      }

      const reservedUnits = await tx.operationFinishedGoodUnit.findMany({
        where: {
          reservedOrderId: order.id,
          productCode,
          productType,
          status: "reserved",
        },
        orderBy: [{ createdAt: "asc" }, { internalLabel: "asc" }],
      });

      const totalReservedQty = reservedUnits.length;
      const newlyReservedQty = units.length;
      const missingQty = Math.max(0, targetQty - totalReservedQty);

      await tx.operationCommercialOrder.update({
        where: { id: order.id },
        data: {
          status: totalReservedQty > 0 ? "stock_reserved" : "needs_production",
          fulfillmentStatus: totalReservedQty > 0 ? "reserved" : "pending",
        },
      });

      return {
        order,
        reservedUnits,
        alreadyReservedQty,
        newlyReservedQty,
        requestedQty: targetQty,
        availableQty,
        targetReservationQty: remainingToReserve,
        productCode,
        missingQty,
        message:
          totalReservedQty > 0
            ? missingQty > 0
              ? "Reserva parcial aplicada"
              : alreadyReservedQty > 0
                ? "Reserva confirmada"
                : "Stock reservado correctamente"
            : "No había stock disponible para reservar",
      };
    });

    if (!result) {
      return NextResponse.json({ error: "Pedido comercial no encontrado" }, { status: 404 });
    }

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Error && error.message === "INTERNAL_ORDER_NO_RESERVATION") {
      return NextResponse.json(
        { error: "Los pedidos internos no reservan stock. Deben producir inventario." },
        { status: 400 }
      );
    }

    if (error instanceof Error && error.message === "PAYMENT_PENDING_CONFIRMATION_REQUIRED") {
      return NextResponse.json(
        { error: "El pedido tiene pago pendiente. Confirma la acción para reservar stock." },
        { status: 409 }
      );
    }

    if (error instanceof Error && error.message === "ORDER_NOT_READY_FOR_RESERVATION") {
      return NextResponse.json({ error: "El pedido debe estar aceptado o confirmado para reservar stock" }, { status: 400 });
    }

    if (error instanceof Error && error.message === "MULTIPLE_PRODUCT_CODES_NOT_SUPPORTED") {
      return NextResponse.json(
        { error: "Esta fase solo admite pedidos con un único productCode. Divide la reserva por producto." },
        { status: 400 }
      );
    }

    console.error("[operations/commercial-orders/:id/reserve-stock] POST error:", error);
    return NextResponse.json({ error: "Error al reservar stock del pedido" }, { status: 500 });
  }
}
