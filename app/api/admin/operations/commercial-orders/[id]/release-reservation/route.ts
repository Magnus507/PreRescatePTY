import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { GENERAL_ADMIN_ROLES, requireRole } from "@/lib/rbac";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole(GENERAL_ADMIN_ROLES);
  if (!auth.authorized) return auth.response;

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const reason = typeof body?.reason === "string" ? body.reason.trim() : "";
  const requestedQtyInput = Number(body?.quantity);

  try {
    const result = await prisma.$transaction(async (tx) => {
      const order = await tx.operationCommercialOrder.findUnique({
        where: { id },
        select: { id: true, dispatchId: true, status: true, fulfillmentStatus: true },
      });

      if (!order) return null;

      if (order.dispatchId) {
        throw new Error("ORDER_HAS_DISPATCH");
      }

      const reservedUnits = await tx.operationFinishedGoodUnit.findMany({
        where: { reservedOrderId: order.id, status: "reserved" },
        orderBy: [{ reservedAt: "asc" }, { createdAt: "asc" }, { internalLabel: "asc" }],
        select: { id: true, internalLabel: true, productCode: true },
      });

      const requestedQty = Number.isFinite(requestedQtyInput) && requestedQtyInput > 0
        ? Math.floor(requestedQtyInput)
        : reservedUnits.length;
      const unitsToRelease = requestedQty >= reservedUnits.length
        ? reservedUnits
        : reservedUnits.slice(Math.max(0, reservedUnits.length - requestedQty));

      if (unitsToRelease.length > 0) {
        await tx.operationFinishedGoodUnit.updateMany({
          where: { id: { in: unitsToRelease.map((unit) => unit.id) } },
          data: {
            status: "available",
            reservedOrderId: null,
            reservedAt: null,
          },
        });

        await tx.operationFinishedGoodUnitEvent.createMany({
          data: unitsToRelease.map((unit) => ({
            unitId: unit.id,
            eventType: "RELEASED",
            reason: reason || `Liberado desde pedido comercial ${order.id}`,
            referenceType: "commercial_order",
            referenceId: order.id,
            metadataJson: { orderId: order.id, internalLabel: unit.internalLabel, reason: reason || null },
          })),
        });
      }

      const remainingReserved = Math.max(0, reservedUnits.length - unitsToRelease.length);

      await tx.operationCommercialOrder.update({
        where: { id: order.id },
        data: {
          status: remainingReserved > 0 ? "stock_reserved" : "accepted",
          fulfillmentStatus: remainingReserved > 0 ? "reserved" : "pending",
        },
      });

      return {
        orderId: order.id,
        releasedUnits: unitsToRelease,
        releasedQty: unitsToRelease.length,
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
    if (error instanceof Error && error.message === "ORDER_HAS_DISPATCH") {
      return NextResponse.json({ error: "No se puede liberar una reserva con despacho asociado" }, { status: 409 });
    }

    console.error("[operations/commercial-orders/:id/release-reservation] POST error:", error);
    return NextResponse.json({ error: "Error al liberar reserva del pedido" }, { status: 500 });
  }
}
