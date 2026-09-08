import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { GENERAL_ADMIN_ROLES, requireRole } from "@/lib/rbac";
import { reserveCommercialOrderStock } from "@/lib/operations/commercial-order-reservation";
import { getAuditRequestId, writeAuditLog } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole(GENERAL_ADMIN_ROLES);
  if (!auth.authorized) return auth.response;

  const { id } = await params;
  const requestId = getAuditRequestId(req);

  try {
    const result = await prisma.$transaction(async (tx) => {
      const order = await tx.operationCommercialOrder.findUnique({
        where: { id },
        select: {
          id: true,
          sourceId: true,
          paymentStatus: true,
          status: true,
          fulfillmentStatus: true,
        },
      });

      if (!order) return null;
      if (order.paymentStatus !== "paid") {
        throw new Error("ORDER_PAYMENT_NOT_PAID");
      }

      // Inventory is always reserved against the immutable quantities recorded
      // on the commercial order. The API intentionally does not accept an
      // arbitrary quantity or a payment override that could diverge from the
      // checkout/payment source of truth.
      const reservation = await reserveCommercialOrderStock(tx, {
        orderId: id,
        allowPartial: true,
      });

      if (!reservation) return null;

      await writeAuditLog(tx, {
        accountId: auth.session.user.accountId || null,
        actorUserId: auth.session.user.id || null,
        entityType: "operation_commercial_order",
        entityId: order.id,
        action: "commercial_order.stock_reserved",
        requestId,
        before: {
          sourceId: order.sourceId,
          paymentStatus: order.paymentStatus,
          status: order.status,
          fulfillmentStatus: order.fulfillmentStatus,
        },
        after: {
          reservation: reservation.summary,
        },
      });

      return {
        ...reservation,
        message:
          reservation.summary.reservedQty > 0
            ? reservation.summary.missingQty > 0
              ? "Reserva parcial aplicada"
              : "Stock reservado correctamente"
            : "No había stock disponible para reservar",
      };
    });

    if (!result) {
      return NextResponse.json({ error: "Pedido comercial no encontrado" }, { status: 404 });
    }

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "ORDER_PAYMENT_NOT_PAID" || message === "ORDER_NOT_READY_FOR_RESERVATION") {
      return NextResponse.json(
        { error: "El pedido debe estar pagado y en un estado reservable antes de tomar inventario." },
        { status: 409 }
      );
    }
    if (message === "SOURCE_ORDER_CANCELLED") {
      return NextResponse.json(
        { error: "El pedido origen fue cancelado y ya no puede reservar inventario." },
        { status: 409 }
      );
    }
    if (message === "INTERNAL_ORDER_NO_RESERVATION") {
      return NextResponse.json(
        { error: "Los pedidos internos no reservan inventario de cliente." },
        { status: 409 }
      );
    }

    console.error("[operations/commercial-orders/:id/reserve-stock] POST error:", error);
    return NextResponse.json({ error: "Error al reservar stock del pedido" }, { status: 500 });
  }
}
