import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { GENERAL_ADMIN_ROLES, requireRole } from "@/lib/rbac";
import { getDispatchCustomerOrderId } from "@/lib/operations/dispatch-source";

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
        include: {
          items: true,
          events: {
            orderBy: { createdAt: "desc" },
            select: { metadataJson: true, referenceType: true, referenceId: true },
          },
        },
      });

      if (!dispatch) throw new Error("NOT_FOUND");
      if (dispatch.status !== "prepared") throw new Error("NOT_PREPARED");
      if (dispatch.items.length === 0) throw new Error("NO_ITEMS");
      if (dispatch.items.some((item) => !item.packedAt && item.status !== "packed")) {
        throw new Error("ITEMS_NOT_PACKED");
      }

      const sentAt = new Date();
      const carrierName =
        typeof body.carrierName === "string" ? body.carrierName.trim() || null : dispatch.carrierName;
      const trackingReference =
        typeof body.trackingReference === "string"
          ? body.trackingReference.trim() || null
          : dispatch.trackingReference;
      const notes = typeof body.notes === "string" ? body.notes.trim() || null : dispatch.notes;
      const orderId = getDispatchCustomerOrderId(dispatch.events);

      await tx.operationDispatch.update({
        where: { id },
        data: {
          status: "dispatched",
          sentAt,
          carrierName,
          trackingReference,
          notes,
        },
      });

      await tx.operationDispatchItem.updateMany({
        where: { dispatchId: id },
        data: {
          status: "dispatched",
          dispatchedAt: sentAt,
        },
      });

      await tx.operationDispatchEvent.create({
        data: {
          dispatchId: id,
          eventType: "DISPATCHED",
          reason: "Despacho enviado",
          referenceType: orderId ? "order" : "dispatch",
          referenceId: orderId || id,
          metadataJson: JSON.stringify({
            sentAt: sentAt.toISOString(),
            orderId,
            carrierName,
            trackingReference,
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
          data: { status: "dispatched", dispatchedAt: sentAt },
        });
      }

      if (orderId) {
        await tx.order.update({
          where: { id: orderId },
          data: { orderStatus: "shipped" },
        });
      }

      return {
        status: "dispatched" as const,
        orderStatus: orderId ? ("shipped" as const) : null,
        sentAt: sentAt.toISOString(),
      };
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error";
    const map: Record<string, string> = {
      NOT_FOUND: "Despacho no encontrado",
      NOT_PREPARED: "El despacho debe estar preparado primero",
      NO_ITEMS: "El despacho no contiene artículos",
      ITEMS_NOT_PACKED: "Todos los artículos deben estar preparados antes de enviar",
    };
    if (map[message]) return NextResponse.json({ error: map[message] }, { status: 400 });
    console.error("[operations/dispatches/:id/mark-sent] POST error:", error);
    return NextResponse.json({ error: "No se pudo marcar enviado" }, { status: 500 });
  }
}
