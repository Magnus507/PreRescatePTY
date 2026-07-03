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
  try {
    const result = await prisma.$transaction(async (tx) => {
      const dispatch = await tx.operationDispatch.findUnique({
        where: { id },
        include: { items: true, events: { orderBy: { createdAt: "asc" }, select: { metadataJson: true } } },
      });
      if (!dispatch) throw new Error("NOT_FOUND");
      if (!["dispatched", "sent", "shipped"].includes(dispatch.status)) throw new Error("NOT_SENT");
      await tx.operationDispatch.update({
        where: { id },
        data: {
          status: "delivered",
          deliveredAt: body.deliveredAt ? new Date(body.deliveredAt) : new Date(),
          notes: typeof body.notes === "string" ? body.notes.trim() || null : dispatch.notes,
        },
      });
      await tx.operationDispatchEvent.create({
        data: {
          dispatchId: id,
          eventType: "DELIVERED",
          reason: "Pedido entregado",
          referenceType: "dispatch",
          referenceId: id,
          metadataJson: JSON.stringify({ deliveredAt: new Date().toISOString() }),
          createdById: auth.session.user.id || null,
        },
      });
      const unitIds = dispatch.items.map((item) => item.unitId).filter((unitId): unitId is string => Boolean(unitId));
      if (unitIds.length > 0) {
        await tx.operationFinishedGoodUnit.updateMany({
          where: { id: { in: unitIds } },
          data: { status: "delivered", deliveredAt: new Date() },
        });
      }
      const orderId = dispatch.events.map((event) => {
        if (!event.metadataJson) return null;
        try {
          const meta = JSON.parse(event.metadataJson) as { orderId?: string };
          return meta.orderId || null;
        } catch {
          return null;
        }
      }).find(Boolean);
      if (orderId) {
        await tx.order.update({ where: { id: String(orderId) }, data: { orderStatus: "completed" } });
      }
      return { status: "delivered" as const };
    });
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error";
    const map: Record<string, string> = { NOT_FOUND: "Despacho no encontrado", NOT_SENT: "El despacho debe estar enviado primero" };
    if (map[message]) return NextResponse.json({ error: map[message] }, { status: 400 });
    console.error("[operations/dispatches/:id/confirm-delivery] POST error:", error);
    return NextResponse.json({ error: "No se pudo confirmar la entrega" }, { status: 500 });
  }
}
