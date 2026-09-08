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
      // Serialize shipment against cancellation (and duplicate shipment calls)
      // using a row write. PostgreSQL re-evaluates the status predicate after a
      // concurrent writer commits, so only one terminal transition can win.
      const lock = await tx.operationDispatch.updateMany({
        where: { id, status: "prepared" },
        data: { updatedAt: new Date() },
      });
      if (lock.count !== 1) {
        const current = await tx.operationDispatch.findUnique({
          where: { id },
          select: { status: true },
        });
        if (!current) throw new Error("NOT_FOUND");
        throw new Error("NOT_PREPARED");
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
      if (dispatch.items.length === 0) throw new Error("NO_ITEMS");
      if (dispatch.items.some((item) => !item.packedAt && item.status !== "packed")) {
        throw new Error("ITEMS_NOT_PACKED");
      }

      const unitIds = dispatch.items
        .map((item) => item.unitId)
        .filter((unitId): unitId is string => Boolean(unitId));
      if (unitIds.length !== dispatch.items.length) {
        throw new Error("UNTRACEABLE_ITEMS");
      }
      if (new Set(unitIds).size !== unitIds.length) {
        throw new Error("DUPLICATE_UNIT_IN_DISPATCH");
      }

      const orderId = getDispatchCustomerOrderId(dispatch.events);
      const commercialOrder = await tx.operationCommercialOrder.findFirst({
        where: { dispatchId: id },
        select: {
          id: true,
          sourceId: true,
          status: true,
          paymentStatus: true,
        },
      });

      if (dispatch.destinationType === "customer" && !commercialOrder) {
        throw new Error("CUSTOMER_ORDER_NOT_FOUND");
      }

      let expectedReservationOrderId: string | null = null;
      if (commercialOrder) {
        if (
          ["cancelled", "rejected"].includes(commercialOrder.status) ||
          commercialOrder.paymentStatus !== "paid"
        ) {
          throw new Error("ORDER_NO_LONGER_SHIPPABLE");
        }

        const sourceOrderId = commercialOrder.sourceId || orderId;
        if (sourceOrderId) {
          const sourceOrder = await tx.order.findUnique({
            where: { id: sourceOrderId },
            select: { orderStatus: true, paymentStatus: true },
          });
          if (
            sourceOrder &&
            (sourceOrder.orderStatus === "cancelled" || sourceOrder.paymentStatus !== "paid")
          ) {
            throw new Error("ORDER_NO_LONGER_SHIPPABLE");
          }
        }
        expectedReservationOrderId = commercialOrder.sourceId || commercialOrder.id;
      }

      const physicalUnits = await tx.operationFinishedGoodUnit.findMany({
        where: { id: { in: unitIds } },
        select: {
          id: true,
          status: true,
          qaStatus: true,
          activationStatus: true,
          reservedOrderId: true,
          dispatchedAt: true,
          deliveredAt: true,
          activatedAt: true,
          dispatchItems: {
            where: { dispatchId: id },
            select: { id: true },
          },
        },
      });
      if (physicalUnits.length !== unitIds.length) {
        throw new Error("PHYSICAL_UNIT_MISSING");
      }

      for (const unit of physicalUnits) {
        if (
          unit.status !== "reserved" ||
          unit.qaStatus !== "passed" ||
          unit.activationStatus !== "not_activated" ||
          unit.dispatchedAt ||
          unit.deliveredAt ||
          unit.activatedAt ||
          unit.dispatchItems.length !== 1
        ) {
          throw new Error("RESERVATION_CHANGED_BEFORE_SHIPMENT");
        }
        if (
          expectedReservationOrderId &&
          unit.reservedOrderId !== expectedReservationOrderId
        ) {
          throw new Error("RESERVATION_CHANGED_BEFORE_SHIPMENT");
        }
        if (!unit.reservedOrderId) {
          throw new Error("RESERVATION_CHANGED_BEFORE_SHIPMENT");
        }
      }

      const sentAt = new Date();
      const carrierName =
        typeof body.carrierName === "string" ? body.carrierName.trim() || null : dispatch.carrierName;
      const trackingReference =
        typeof body.trackingReference === "string"
          ? body.trackingReference.trim() || null
          : dispatch.trackingReference;
      const notes = typeof body.notes === "string" ? body.notes.trim() || null : dispatch.notes;

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

      await tx.operationCommercialOrder.updateMany({
        where: { dispatchId: id },
        data: {
          status: "processing",
          fulfillmentStatus: "dispatched",
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

      await tx.operationFinishedGoodUnit.updateMany({
        where: {
          id: { in: unitIds },
          status: "reserved",
          qaStatus: "passed",
          activationStatus: "not_activated",
        },
        data: { status: "dispatched", dispatchedAt: sentAt },
      });

      if (orderId) {
        await tx.order.update({
          where: { id: orderId },
          data: { orderStatus: "shipped" },
        });
      }

      await writeAuditLog(tx, {
        accountId: auth.session.user.accountId || null,
        actorUserId: auth.session.user.id || null,
        entityType: "operation_dispatch",
        entityId: dispatch.id,
        action: "dispatch.sent",
        requestId,
        before: {
          status: dispatch.status,
          orderId,
          carrierName: dispatch.carrierName,
          trackingReference: dispatch.trackingReference,
        },
        after: {
          status: "dispatched",
          orderId,
          sentAt: sentAt.toISOString(),
          carrierName,
          trackingReference,
          unitCount: unitIds.length,
        },
      });

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
      UNTRACEABLE_ITEMS: "Todos los artículos deben tener una unidad física trazable antes de enviar",
      DUPLICATE_UNIT_IN_DISPATCH: "Una misma unidad física aparece más de una vez en el despacho",
      CUSTOMER_ORDER_NOT_FOUND: "El despacho de cliente no tiene un pedido comercial propietario",
      ORDER_NO_LONGER_SHIPPABLE: "El pedido fue cancelado, rechazado o dejó de estar pagado; no puede enviarse",
      PHYSICAL_UNIT_MISSING: "Una unidad física del despacho ya no existe",
      RESERVATION_CHANGED_BEFORE_SHIPMENT: "La reserva física cambió; vuelve a validar el pedido antes de enviar",
    };
    if (map[message]) return NextResponse.json({ error: map[message] }, { status: 409 });
    console.error("[operations/dispatches/:id/mark-sent] POST error:", error);
    return NextResponse.json({ error: "No se pudo marcar enviado" }, { status: 500 });
  }
}
