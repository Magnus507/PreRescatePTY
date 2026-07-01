import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { GENERAL_ADMIN_ROLES, requireRole } from "@/lib/rbac";

export const dynamic = "force-dynamic";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole(GENERAL_ADMIN_ROLES);
  if (!auth.authorized) return auth.response;

  const { id } = await params;

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
        select: { id: true, internalLabel: true },
      });

      await tx.operationFinishedGoodUnit.updateMany({
        where: { id: { in: reservedUnits.map((unit) => unit.id) } },
        data: {
          status: "available",
          reservedOrderId: null,
          reservedAt: null,
        },
      });

      await tx.operationFinishedGoodUnitEvent.createMany({
        data: reservedUnits.map((unit) => ({
          unitId: unit.id,
          eventType: "RELEASED",
          reason: `Liberado desde pedido comercial ${order.id}`,
          referenceType: "commercial_order",
          referenceId: order.id,
          metadataJson: { orderId: order.id, internalLabel: unit.internalLabel },
        })),
      });

      const updatedOrder = await tx.operationCommercialOrder.update({
        where: { id: order.id },
        data: {
          status: "pending_stock",
          fulfillmentStatus: "pending",
        },
      });

      return {
        order: updatedOrder,
        releasedUnits: reservedUnits,
      };
    });

    if (!result) {
      return NextResponse.json({ error: "Pedido comercial no encontrado" }, { status: 404 });
    }

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Error && error.message === "ORDER_HAS_DISPATCH") {
      return NextResponse.json({ error: "No se puede liberar una reserva con despacho asociado" }, { status: 409 });
    }

    console.error("[operations/commercial-orders/:id/release-units] POST error:", error);
    return NextResponse.json({ error: "Error al liberar unidades del pedido" }, { status: 500 });
  }
}
