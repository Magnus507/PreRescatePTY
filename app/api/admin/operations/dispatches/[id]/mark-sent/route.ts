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
      // Serialize the irreversible send transition. Without this row lock two
      // concurrent requests can both observe `prepared` and both record a send.
      await tx.operationDispatch.updateMany({
        where: { id },
        data: { updatedAt: new Date() },
      });

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

      const eventOrderId = getDispatchCustomerOrderId(dispatch.events);
      const linkedCommercialOrders = await tx.operationCommercialOrder.findMany({
        where: { dispatchId: id },
        select: {
          id: true,
          sourceId: true,
          customerType: true,
          status: true,
          paymentStatus: true,
        },
      });

      let orderId: string | null = eventOrderId;
      let reservationOrderId: string | null = null;
      const unitIds = dispatch.items
        .map((item) => item.unitId)
        .filter((unitId): unitId is string => Boolean(unitId));

      if (dispatch.destinationType === "customer") {
        if (linkedCommercialOrders.length !== 1) {
          throw new Error("CUSTOMER_DISPATCH_ORDER_LINK_INVALID");
        }

        const commercialOrder = linkedCommercialOrders[0];
        if (commercialOrder.customerType === "internal") {
          throw new Error("INTERNAL_ORDER_NO_DISPATCH");
        }
        if (["cancelled", "rejected"].includes(commercialOrder.status)) {
          throw new Error("ORDER_CANCELLED");
        }
        if (commercialOrder.paymentStatus !== "paid") {
          throw new Error("ORDER_NOT_PAID");
        }

        reservationOrderId = commercialOrder.sourceId || commercialOrder.id;
        orderId = commercialOrder.sourceId || null;

        if (eventOrderId && orderId && eventOrderId !== orderId) {
          throw new Error("DISPATCH_ORDER_IDENTITY_MISMATCH");
        }

        if (orderId) {
          const customerOrder = await tx.order.findUnique({
            where: { id: orderId },
            select: { orderStatus: true, paymentStatus: true },
          });
          if (!customerOrder) throw new Error("SOURCE_ORDER_NOT_FOUND");
          if (["cancelled", "completed", "shipped"].includes(customerOrder.orderStatus)) {
            throw new Error("SOURCE_ORDER_NOT_SHIPPABLE");
          }
          if (customerOrder.paymentStatus !== "paid") {
            throw new Error("ORDER_NOT_PAID");
          }
        }

        const uniqueUnitIds = [...new Set(unitIds)];
        if (unitIds.length !== dispatch.items.length || uniqueUnitIds.length !== dispatch.items.length) {
          throw new Error("CUSTOMER_DISPATCH_TRACEABILITY_INVALID");
        }

        const units = await tx.operationFinishedGoodUnit.findMany({
          where: { id: { in: uniqueUnitIds } },
          select: {
            id: true,
            status: true,
            qaStatus: true,
            activationStatus: true,
            reservedOrderId: true,
          },
        });
        if (units.length !== uniqueUnitIds.length) {
          throw new Error("CUSTOMER_DISPATCH_TRACEABILITY_INVALID");
        }
        if (
          units.some(
            (unit) =>
              unit.status !== "reserved" ||
              unit.qaStatus !== "passed" ||
              unit.activationStatus !== "not_activated" ||
              unit.reservedOrderId !== reservationOrderId
          )
        ) {
          throw new Error("CUSTOMER_DISPATCH_UNIT_STATE_INVALID");
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

      if (unitIds.length > 0) {
        const updatedUnits = dispatch.destinationType === "customer" && reservationOrderId
          ? await tx.operationFinishedGoodUnit.updateMany({
              where: {
                id: { in: unitIds },
                status: "reserved",
                qaStatus: "passed",
                activationStatus: "not_activated",
                reservedOrderId: reservationOrderId,
              },
              data: { status: "dispatched", dispatchedAt: sentAt },
            })
          : await tx.operationFinishedGoodUnit.updateMany({
              where: { id: { in: unitIds } },
              data: { status: "dispatched", dispatchedAt: sentAt },
            });

        if (dispatch.destinationType === "customer" && updatedUnits.count !== unitIds.length) {
          throw new Error("CUSTOMER_DISPATCH_UNIT_STATE_RACE");
        }
      }

      if (orderId) {
        const shipped = await tx.order.updateMany({
          where: {
            id: orderId,
            orderStatus: { in: ["pending", "processing"] },
            paymentStatus: "paid",
          },
          data: { orderStatus: "shipped" },
        });
        if (dispatch.destinationType === "customer" && shipped.count !== 1) {
          throw new Error("SOURCE_ORDER_STATE_RACE");
        }
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
      CUSTOMER_DISPATCH_ORDER_LINK_INVALID: "El despacho cliente no tiene una relación única y válida con su pedido.",
      INTERNAL_ORDER_NO_DISPATCH: "Una producción/pedido interno no puede enviarse como despacho de cliente.",
      ORDER_CANCELLED: "El pedido fue cancelado y no puede enviarse.",
      ORDER_NOT_PAID: "El pedido ya no tiene un pago válido para ser enviado.",
      DISPATCH_ORDER_IDENTITY_MISMATCH: "La identidad del pedido no coincide con la trazabilidad del despacho.",
      SOURCE_ORDER_NOT_FOUND: "No se encontró el pedido cliente origen del despacho.",
      SOURCE_ORDER_NOT_SHIPPABLE: "El pedido cliente ya no está en un estado válido para envío.",
      CUSTOMER_DISPATCH_TRACEABILITY_INVALID: "El despacho cliente no tiene una unidad física única por artículo.",
      CUSTOMER_DISPATCH_UNIT_STATE_INVALID: "Una o más unidades ya no están reservadas y válidas para este pedido.",
      CUSTOMER_DISPATCH_UNIT_STATE_RACE: "El estado de una unidad cambió durante el envío. No se realizó el despacho.",
      SOURCE_ORDER_STATE_RACE: "El estado del pedido cambió durante el envío. No se realizó el despacho.",
    };
    if (map[message]) return NextResponse.json({ error: map[message] }, { status: 409 });
    console.error("[operations/dispatches/:id/mark-sent] POST error:", error);
    return NextResponse.json({ error: "No se pudo marcar enviado" }, { status: 500 });
  }
}
