import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { GENERAL_ADMIN_ROLES, requireRole } from "@/lib/rbac";
import { releaseEligibleOrderReservations } from "@/lib/operations/release-order-reservations";
import { getAuditRequestId, writeAuditLog } from "@/lib/audit";
import { getCommercialOrderReservationOwnerId } from "../../commercial-orders.helpers";

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
  const reason = typeof body?.reason === "string" ? body.reason.trim() : "";
  const requestedQtyInput = Number(body?.quantity);

  try {
    const result = await prisma.$transaction(async (tx) => {
      // Serialize release against other commercial-order decisions.
      await tx.operationCommercialOrder.updateMany({
        where: { id },
        data: { updatedAt: new Date() },
      });
      const order = await tx.operationCommercialOrder.findUnique({
        where: { id },
        select: {
          id: true,
          sourceId: true,
          dispatchId: true,
          status: true,
          fulfillmentStatus: true,
          items: { select: { quantity: true } },
        },
      });

      if (!order) return null;
      if (order.dispatchId) throw new Error("ORDER_HAS_DISPATCH");

      const reservationOrderId = getCommercialOrderReservationOwnerId(order);
      const reservedUnits = await tx.operationFinishedGoodUnit.findMany({
        where: {
          reservedOrderId: reservationOrderId,
          status: "reserved",
        },
        orderBy: [{ reservedAt: "asc" }, { createdAt: "asc" }, { internalLabel: "asc" }],
        select: { id: true, internalLabel: true, productCode: true },
      });

      const requestedQty = Number.isFinite(requestedQtyInput) && requestedQtyInput > 0
        ? Math.floor(requestedQtyInput)
        : reservedUnits.length;
      const unitsToRelease = requestedQty >= reservedUnits.length
        ? reservedUnits
        : reservedUnits.slice(Math.max(0, reservedUnits.length - requestedQty));

      const release = await releaseEligibleOrderReservations(tx, {
        orderId: reservationOrderId,
        actorId: auth.session.user.id || null,
        reason: reason || `Liberado desde pedido comercial ${order.id}`,
        unitIds: unitsToRelease.map((unit) => unit.id),
      });
      if (release.blockedCount > 0) {
        throw new Error("RESERVATION_RELEASE_BLOCKED");
      }

      const remainingReserved = await tx.operationFinishedGoodUnit.count({
        where: {
          reservedOrderId: reservationOrderId,
          status: "reserved",
        },
      });
      const requiredQuantity = order.items.reduce((sum, item) => sum + item.quantity, 0);
      const nextStatus = remainingReserved === 0
        ? "accepted"
        : remainingReserved >= requiredQuantity
          ? "stock_reserved"
          : "pending_stock";

      const updatedOrder = await tx.operationCommercialOrder.update({
        where: { id: order.id },
        data: {
          status: nextStatus,
          fulfillmentStatus: remainingReserved > 0 ? "reserved" : "pending",
        },
      });

      await writeAuditLog(tx, {
        accountId: auth.session.user.accountId || null,
        actorUserId: auth.session.user.id || null,
        entityType: "operation_commercial_order",
        entityId: order.id,
        action: "commercial_order.reservation_released",
        requestId,
        before: {
          sourceId: order.sourceId,
          status: order.status,
          fulfillmentStatus: order.fulfillmentStatus,
          reservedQty: reservedUnits.length,
        },
        after: {
          status: updatedOrder.status,
          fulfillmentStatus: updatedOrder.fulfillmentStatus,
          releasedQty: release.releasedCount,
          remainingReserved,
          reason: reason || null,
        },
      });

      return {
        orderId: order.id,
        order: updatedOrder,
        releasedUnits: release.releasedUnits,
        releasedQty: release.releasedCount,
        remainingReserved,
        reason: reason || null,
      };
    });

    if (!result) {
      return NextResponse.json({ error: "Pedido comercial no encontrado" }, { status: 404 });
    }

    return NextResponse.json({
      ...result,
      message: result.releasedQty > 0 ? "Reserva liberada" : "No había unidades reservadas para liberar",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "ORDER_HAS_DISPATCH") {
      return NextResponse.json({ error: "No se puede liberar una reserva con despacho asociado" }, { status: 409 });
    }
    if (message === "RESERVATION_RELEASE_BLOCKED") {
      return NextResponse.json(
        { error: "La reserva cambió o una unidad ya está comprometida; no se liberó inventario." },
        { status: 409 }
      );
    }

    console.error("[operations/commercial-orders/:id/release-reservation] POST error:", error);
    return NextResponse.json({ error: "Error al liberar reserva del pedido" }, { status: 500 });
  }
}
