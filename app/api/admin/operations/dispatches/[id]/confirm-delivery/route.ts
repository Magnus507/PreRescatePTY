import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { GENERAL_ADMIN_ROLES, requireRole } from "@/lib/rbac";
import { getDispatchCustomerOrderId } from "@/lib/operations/dispatch-source";
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

  try {
    const result = await prisma.$transaction(async (tx) => {
      const dispatch = await tx.operationDispatch.findUnique({
        where: { id },
        include: {
          items: true,
          events: {
            orderBy: { createdAt: "desc" },
            select: { metadataJson: true, referenceType: true, referenceId: true },
          },
        },
      });

      if (!dispatch) throw new Error("NOT_FOUND");
      if (!["dispatched", "sent", "shipped"].includes(dispatch.status)) {
        throw new Error("NOT_SENT");
      }

      const deliveredAt = body.deliveredAt ? new Date(body.deliveredAt) : new Date();
      if (Number.isNaN(deliveredAt.getTime())) throw new Error("INVALID_DELIVERY_DATE");
      const notes = typeof body.notes === "string" ? body.notes.trim() || null : dispatch.notes;
      const orderId = getDispatchCustomerOrderId(dispatch.events);

      await tx.operationDispatch.update({
        where: { id },
        data: {
          status: "delivered",
          deliveredAt,
          notes,
        },
      });

      await tx.operationDispatchItem.updateMany({
        where: { dispatchId: id },
        data: {
          status: "delivered",
          deliveredAt,
        },
      });

      await tx.operationDispatchEvent.create({
        data: {
          dispatchId: id,
          eventType: "DELIVERED",
          reason: "Despacho entregado",
          referenceType: orderId ? "order" : "dispatch",
          referenceId: orderId || id,
          metadataJson: JSON.stringify({
            deliveredAt: deliveredAt.toISOString(),
            orderId,
          }),
          createdById: auth.session.user.id || null,
        },
      });

      const unitIds = dispatch.items
        .map((item) => item.unitId)
        .filter((unitId): unitId is string => Boolean(unitId));
      if (unitIds.length > 0) {
        await tx.operationFinishedGoodUnit.updateMany({
          where: { id: { in: unitIds } },
          data: { status: "delivered", deliveredAt },
        });
      }

      if (orderId) {
        await tx.order.update({
          where: { id: orderId },
          data: { orderStatus: "completed" },
        });
      }

      await writeAuditLog(tx, {
        accountId: auth.session.user.accountId || null,
        actorUserId: auth.session.user.id || null,
        entityType: "operation_dispatch",
        entityId: dispatch.id,
        action: "dispatch.delivered",
        requestId,
        before: { status: dispatch.status, orderId, deliveredAt: dispatch.deliveredAt?.toISOString() || null },
        after: {
          status: "delivered",
          orderId,
          deliveredAt: deliveredAt.toISOString(),
          unitCount: unitIds.length,
        },
      });

      return {
        status: "delivered" as const,
        orderStatus: orderId ? ("completed" as const) : null,
        deliveredAt: deliveredAt.toISOString(),
      };
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error";
    const map: Record<string, string> = {
      NOT_FOUND: "Despacho no encontrado",
      NOT_SENT: "El despacho debe estar enviado primero",
      INVALID_DELIVERY_DATE: "La fecha de entrega no es válida",
    };
    if (map[message]) return NextResponse.json({ error: map[message] }, { status: 400 });
    console.error("[operations/dispatches/:id/confirm-delivery] POST error:", error);
    return NextResponse.json({ error: "No se pudo confirmar la entrega" }, { status: 500 });
  }
}
