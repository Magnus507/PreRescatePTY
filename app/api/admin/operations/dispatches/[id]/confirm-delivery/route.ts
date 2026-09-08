import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { GENERAL_ADMIN_ROLES, requireRole } from "@/lib/rbac";
import { getDispatchCustomerOrderId } from "@/lib/operations/dispatch-source";
import { getAuditRequestId, writeAuditLog } from "@/lib/audit";

export const dynamic = "force-dynamic";

const SENT_STATUSES = ["dispatched", "sent", "shipped"] as const;

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
      // Serialize delivery retries. A concurrent delivery that loses this lock
      // sees the committed delivered status and becomes an idempotent no-op.
      const lock = await tx.operationDispatch.updateMany({
        where: { id, status: { in: [...SENT_STATUSES] } },
        data: { updatedAt: new Date() },
      });

      if (lock.count !== 1) {
        const current = await tx.operationDispatch.findUnique({
          where: { id },
          include: {
            events: {
              orderBy: { createdAt: "desc" },
              select: { metadataJson: true, referenceType: true, referenceId: true },
            },
          },
        });
        if (!current) throw new Error("NOT_FOUND");
        const orderId = getDispatchCustomerOrderId(current.events);
        if (current.status === "delivered") {
          return {
            status: "delivered" as const,
            orderStatus: orderId ? ("completed" as const) : null,
            deliveredAt: current.deliveredAt?.toISOString() || null,
            idempotent: true,
          };
        }
        throw new Error("NOT_SENT");
      }

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

      const orderId = getDispatchCustomerOrderId(dispatch.events);
      const deliveredAt = body.deliveredAt ? new Date(body.deliveredAt) : new Date();
      if (Number.isNaN(deliveredAt.getTime())) throw new Error("INVALID_DELIVERY_DATE");
      const notes = typeof body.notes === "string" ? body.notes.trim() || null : dispatch.notes;

      if (dispatch.items.length === 0) throw new Error("NO_ITEMS");
      const unitIds = dispatch.items
        .map((item) => item.unitId)
        .filter((unitId): unitId is string => Boolean(unitId));
      if (unitIds.length !== dispatch.items.length) {
        throw new Error("UNTRACEABLE_ITEMS");
      }
      if (new Set(unitIds).size !== unitIds.length) {
        throw new Error("DUPLICATE_UNIT_IN_DISPATCH");
      }

      const commercialOrder = await tx.operationCommercialOrder.findFirst({
        where: { dispatchId: id },
        select: { id: true, sourceId: true },
      });
      if (dispatch.destinationType === "customer" && !commercialOrder) {
        throw new Error("CUSTOMER_ORDER_NOT_FOUND");
      }
      const expectedReservationOrderId = commercialOrder
        ? commercialOrder.sourceId || commercialOrder.id
        : null;

      const physicalUnits = await tx.operationFinishedGoodUnit.findMany({
        where: { id: { in: unitIds } },
        select: {
          id: true,
          status: true,
          qaStatus: true,
          activationStatus: true,
          activatedAt: true,
          reservedOrderId: true,
          dispatchItems: {
            where: { dispatchId: id },
            select: { id: true },
          },
        },
      });
      if (physicalUnits.length !== unitIds.length) {
        throw new Error("UNIT_STATE_MISMATCH");
      }
      for (const unit of physicalUnits) {
        if (
          unit.status !== "dispatched" ||
          unit.qaStatus !== "passed" ||
          unit.activationStatus !== "not_activated" ||
          unit.activatedAt ||
          unit.dispatchItems.length !== 1 ||
          !unit.reservedOrderId
        ) {
          throw new Error("UNIT_STATE_MISMATCH");
        }
        if (
          expectedReservationOrderId &&
          unit.reservedOrderId !== expectedReservationOrderId
        ) {
          throw new Error("UNIT_STATE_MISMATCH");
        }
      }

      await tx.operationDispatch.update({
        where: { id },
        data: {
          status: "delivered",
          deliveredAt,
          notes,
        },
      });

      await tx.operationCommercialOrder.updateMany({
        where: { dispatchId: id },
        data: {
          status: "completed",
          fulfillmentStatus: "delivered",
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

      const updatedUnits = await tx.operationFinishedGoodUnit.updateMany({
        where: {
          id: { in: unitIds },
          status: "dispatched",
          qaStatus: "passed",
          activationStatus: "not_activated",
          activatedAt: null,
        },
        data: { status: "delivered", deliveredAt },
      });
      if (updatedUnits.count !== unitIds.length) {
        throw new Error("UNIT_STATE_MISMATCH");
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
        before: {
          status: dispatch.status,
          orderId,
          deliveredAt: dispatch.deliveredAt?.toISOString() || null,
        },
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
        idempotent: false,
      };
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error";
    const map: Record<string, string> = {
      NOT_FOUND: "Despacho no encontrado",
      NOT_SENT: "El despacho debe estar enviado primero",
      INVALID_DELIVERY_DATE: "La fecha de entrega no es válida",
      NO_ITEMS: "El despacho no contiene artículos",
      UNTRACEABLE_ITEMS: "Todos los artículos deben tener una unidad física trazable antes de entregar",
      DUPLICATE_UNIT_IN_DISPATCH: "Una misma unidad física aparece más de una vez en el despacho",
      CUSTOMER_ORDER_NOT_FOUND: "El despacho de cliente no tiene un pedido comercial propietario",
      UNIT_STATE_MISMATCH: "Las unidades físicas no están todas en un estado entregable consistente",
    };
    if (map[message]) return NextResponse.json({ error: map[message] }, { status: 409 });
    console.error("[operations/dispatches/:id/confirm-delivery] POST error:", error);
    return NextResponse.json({ error: "No se pudo confirmar la entrega" }, { status: 500 });
  }
}
