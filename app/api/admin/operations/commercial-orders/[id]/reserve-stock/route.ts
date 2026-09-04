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
  const body = await req.json().catch(() => ({}));
  const confirmPendingPayment = Boolean(body?.confirmPendingPayment);

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

      if (order.paymentStatus === "pending" && !confirmPendingPayment) {
        throw new Error("PAYMENT_PENDING_CONFIRMATION_REQUIRED");
      }

      // Inventory is always reserved against the immutable quantities recorded
      // on the commercial order. The API intentionally does not accept an
      // arbitrary quantity that could diverge from the customer order.
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
          confirmPendingPayment,
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
    if (error instanceof Error && error.message === "PAYMENT_PENDING_CONFIRMATION_REQUIRED") {
      return NextResponse.json(
        { error: "El pedido tiene pago pendiente. Confirma la acción para reservar stock." },
        { status: 409 }
      );
    }

    console.error("[operations/commercial-orders/:id/reserve-stock] POST error:", error);
    return NextResponse.json({ error: "Error al reservar stock del pedido" }, { status: 500 });
  }
}
