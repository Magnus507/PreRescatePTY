import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { GENERAL_ADMIN_ROLES, requireRole } from "@/lib/rbac";

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
      if (order.paymentStatus !== "paid" && order.adminReviewStatus !== "approved") throw new Error("PAYMENT_NOT_APPROVED");

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

      const operationalQuantity = order.items.reduce((sum, item) => sum + item.quantity, 0);
      if (operationalQuantity <= 0) throw new Error("INVALID_OPERATIONAL_QUANTITY");
      if (reservedUnits.length !== operationalQuantity) throw new Error("RESERVATION_MISMATCH");

      if (reservedUnits.some((unit) => unit.reservedOrderId !== order.id)) {
        throw new Error("UNIT_ORDER_MISMATCH");
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
        select: { id: true },
      });

      if (existingDispatch) throw new Error("ORDER_ALREADY_HAS_DISPATCH");

      const dispatchCode = `DSP-${parseOrderCode(order.orderNumber)}`;
      const dispatch = await tx.operationDispatch.create({
        data: {
          code: dispatchCode,
          status: "pending_pick",
          destinationType: "customer",
          destinationName: order.customerName || null,
          destinationReference: order.providerReference || order.orderNumber,
          destinationAddress: order.shippingAddress || null,
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
                customerName: order.customerName,
                customerEmail: order.customerEmail,
                customerPhone: order.customerPhone,
                shippingCity: order.shippingCity,
                shippingAddress: order.shippingAddress,
                shippingNotes: order.shippingNotes,
                reservedUnitIds: reservedUnits.map((unit) => unit.id),
              }),
              createdById: auth.session.user.id || null,
            },
          },
        },
        select: { id: true, code: true, status: true },
      });

      await tx.order.update({
        where: { id: order.id },
        data: { orderStatus: "processing" },
      });

      await tx.operationFinishedGoodUnit.updateMany({
        where: { id: { in: reservedUnits.map((unit) => unit.id) } },
        data: { status: "reserved" },
      });

      return { order, dispatch, reservedUnits };
    });

    return NextResponse.json({
      success: true,
      dispatchId: result.dispatch.id,
      dispatchCode: result.dispatch.code,
      status: result.dispatch.status,
      message: "Despacho creado desde unidades reservadas",
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
        ORDER_ALREADY_HAS_DISPATCH: "El pedido ya tiene un despacho asociado",
      };
      if (messageMap[error.message]) {
        return NextResponse.json({ error: messageMap[error.message] }, { status: 400 });
      }
    }

    console.error("[orders/:id/send-to-dispatch] POST error:", error);
    return NextResponse.json({ error: "No se pudo crear el despacho" }, { status: 500 });
  }
}
