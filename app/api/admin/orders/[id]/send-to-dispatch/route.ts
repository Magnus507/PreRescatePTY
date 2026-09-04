import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { GENERAL_ADMIN_ROLES, requireRole } from "@/lib/rbac";
import { getAuditRequestId, writeAuditLog } from "@/lib/audit";

export const dynamic = "force-dynamic";

function parseOrderCode(orderNumber: string) {
  return orderNumber.startsWith("OP-") ? orderNumber : `OP-CLI-${orderNumber}`;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole(GENERAL_ADMIN_ROLES);
  if (!auth.authorized) return auth.response;

  const { id } = await params;
  const requestId = getAuditRequestId(req);

  try {
    const result = await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id },
        include: {
          items: true,
          user: { select: { id: true, email: true, phone: true } },
        },
      });

      if (!order) throw new Error("ORDER_NOT_FOUND");
      if (order.provider === "manual" && order.orderType === "internal_replenishment") {
        throw new Error("INTERNAL_ORDER_NO_DISPATCH");
      }
      if (order.orderStatus === "cancelled") throw new Error("ORDER_CANCELLED");
      if (order.orderStatus === "completed") throw new Error("ORDER_COMPLETED");
      if (order.paymentStatus !== "paid" && order.adminReviewStatus !== "approved") {
        throw new Error("PAYMENT_NOT_APPROVED");
      }

      const operationalOrder = await tx.operationCommercialOrder.findFirst({
        where: {
          sourceId: order.id,
          customerType: { not: "internal" },
        },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          code: true,
          dispatchId: true,
          items: {
            select: { quantity: true },
          },
        },
      });

      if (operationalOrder?.dispatchId) {
        const existing = await tx.operationDispatch.findUnique({
          where: { id: operationalOrder.dispatchId },
          select: { id: true, code: true, status: true },
        });
        if (existing) {
          return {
            order,
            operationalOrder,
            dispatch: existing,
            reservedUnits: [] as Array<{ id: string }>,
            operationalQuantity: operationalOrder.items.reduce(
              (sum, item) => sum + item.quantity,
              0
            ),
            existing: true,
          };
        }
      }

      const existingDispatch = await tx.operationDispatch.findFirst({
        where: {
          events: {
            some: {
              referenceType: "order",
              referenceId: order.id,
            },
          },
        },
        select: { id: true, code: true, status: true },
      });

      if (existingDispatch) {
        if (operationalOrder && !operationalOrder.dispatchId) {
          await tx.operationCommercialOrder.update({
            where: { id: operationalOrder.id },
            data: {
              dispatchId: existingDispatch.id,
              fulfillmentStatus: "dispatch_pending",
              status: "processing",
            },
          });
        }

        return {
          order,
          operationalOrder,
          dispatch: existingDispatch,
          reservedUnits: [] as Array<{ id: string }>,
          operationalQuantity: operationalOrder
            ? operationalOrder.items.reduce((sum, item) => sum + item.quantity, 0)
            : order.items.reduce((sum, item) => sum + item.quantity, 0),
          existing: true,
        };
      }

      const reservedUnits = await tx.operationFinishedGoodUnit.findMany({
        where: {
          reservedOrderId: order.id,
          status: "reserved",
          qaStatus: "passed",
          activationStatus: "not_activated",
          internalLabel: { not: "" },
        },
        orderBy: [{ createdAt: "asc" }, { internalLabel: "asc" }],
      });

      // Reservation is performed from the operational commercial order, so the
      // dispatch gate validates against that same physical quantity. Legacy
      // Order items remain only as a compatibility fallback.
      const operationalQuantity = operationalOrder
        ? operationalOrder.items.reduce((sum, item) => sum + item.quantity, 0)
        : order.items.reduce((sum, item) => sum + item.quantity, 0);

      if (operationalQuantity <= 0) throw new Error("INVALID_OPERATIONAL_QUANTITY");
      if (reservedUnits.length !== operationalQuantity) throw new Error("RESERVATION_MISMATCH");

      if (reservedUnits.some((unit) => unit.reservedOrderId !== order.id)) {
        throw new Error("UNIT_ORDER_MISMATCH");
      }

      const dispatchCode = `DSP-${parseOrderCode(order.orderNumber)}`;
      const fullDestinationAddress = [order.shippingAddress, order.shippingCity]
        .filter((value): value is string => Boolean(value?.trim()))
        .join(", ");

      const dispatch = await tx.operationDispatch.create({
        data: {
          code: dispatchCode,
          status: "pending_pick",
          destinationType: "customer",
          destinationName: order.customerName || null,
          destinationReference: order.providerReference || order.orderNumber,
          destinationAddress: fullDestinationAddress || null,
          notes: order.shippingNotes || null,
          items: {
            create: reservedUnits.map((unit) => ({
              unitId: unit.id,
              internalLabel: unit.internalLabel,
              productCode: unit.productCode,
              productName: unit.productName,
              quantity: 1,
              unit: "unit",
              status: "pending_pick",
              notes: `Separado desde pedido ${order.orderNumber}`,
            })),
          },
          events: {
            create: {
              eventType: "CREATED",
              reason: "Despacho creado desde pedido con reserva completa",
              referenceType: "order",
              referenceId: order.id,
              metadataJson: JSON.stringify({
                orderId: order.id,
                orderCode: order.orderNumber,
                orderDisplayCode: order.providerReference || order.orderNumber,
                operationalOrderId: operationalOrder?.id || null,
                operationalOrderCode: operationalOrder?.code || null,
                operationalQuantity,
                customerName: order.customerName,
                customerEmail: order.customerEmail,
                customerPhone: order.customerPhone,
                shippingCity: order.shippingCity,
                shippingAddress: order.shippingAddress,
                shippingNotes: order.shippingNotes,
                destinationReference: order.providerReference || order.orderNumber,
                reservedUnitIds: reservedUnits.map((unit) => unit.id),
              }),
              createdById: auth.session.user.id || null,
            },
          },
        },
        select: { id: true, code: true, status: true },
      });

      if (operationalOrder) {
        await tx.operationCommercialOrder.update({
          where: { id: operationalOrder.id },
          data: {
            dispatchId: dispatch.id,
            fulfillmentStatus: "dispatch_pending",
            status: "processing",
          },
        });
      }

      await tx.order.update({
        where: { id: order.id },
        data: { orderStatus: "processing" },
      });

      await writeAuditLog(tx, {
        actorUserId: auth.session.user.id || null,
        entityType: "order",
        entityId: order.id,
        action: "order.sent_to_dispatch",
        requestId,
        before: { orderStatus: order.orderStatus, paymentStatus: order.paymentStatus },
        after: { dispatchId: dispatch.id, dispatchCode: dispatch.code, operationalOrderId: operationalOrder?.id || null, operationalQuantity },
      });

      return {
        order,
        operationalOrder,
        dispatch,
        reservedUnits,
        operationalQuantity,
        existing: false,
      };
    });

    return NextResponse.json({
      success: true,
      dispatchId: result.dispatch.id,
      dispatchCode: result.dispatch.code,
      status: result.dispatch.status,
      operationalOrderId: result.operationalOrder?.id || null,
      operationalQuantity: result.operationalQuantity,
      alreadyExisted: result.existing,
      message: result.existing
        ? "El pedido ya estaba transferido a Despachos"
        : "Pedido transferido a Despachos",
      reservedUnitIds: result.reservedUnits.map((unit) => unit.id),
    });
  } catch (error) {
    if (error instanceof Error) {
      const messageMap: Record<string, string> = {
        ORDER_NOT_FOUND: "Pedido no encontrado",
        INTERNAL_ORDER_NO_DISPATCH: "Los pedidos internos no crean despacho desde esta ruta",
        ORDER_CANCELLED: "El pedido cancelado no puede enviarse a despacho",
        ORDER_COMPLETED: "El pedido completado no puede enviarse a despacho",
        PAYMENT_NOT_APPROVED: "El pedido no tiene pago aprobado",
        INVALID_OPERATIONAL_QUANTITY: "El pedido no tiene cantidad operativa válida",
        RESERVATION_MISMATCH: "Las unidades reservadas no coinciden con la cantidad operativa",
        UNIT_ORDER_MISMATCH: "Hay unidades reservadas que no pertenecen al pedido",
      };
      if (messageMap[error.message]) {
        return NextResponse.json({ error: messageMap[error.message] }, { status: 400 });
      }
    }

    console.error("[orders/:id/send-to-dispatch] POST error:", error);
    return NextResponse.json({ error: "No se pudo crear el despacho" }, { status: 500 });
  }
}
