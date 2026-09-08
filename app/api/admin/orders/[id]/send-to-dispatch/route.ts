import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { GENERAL_ADMIN_ROLES, requireRole } from "@/lib/rbac";
import { getAuditRequestId, writeAuditLog } from "@/lib/audit";
import { resolveCommercialOrderItemKey } from "@/app/api/admin/operations/commercial-orders/commercial-orders.helpers";

export const dynamic = "force-dynamic";

function parseOrderCode(orderNumber: string) {
  return orderNumber.startsWith("OP-") ? orderNumber : `OP-CLI-${orderNumber}`;
}

async function getAvailableDispatchCode(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  orderNumber: string
) {
  const baseCode = `DSP-${parseOrderCode(orderNumber)}`;
  let candidate = baseCode;
  for (let suffix = 2; suffix <= 50; suffix += 1) {
    const existing = await tx.operationDispatch.findUnique({
      where: { code: candidate },
      select: { id: true },
    });
    if (!existing) return candidate;
    candidate = `${baseCode}-R${suffix}`;
  }
  throw new Error("DISPATCH_CODE_EXHAUSTED");
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
      // Serialize duplicate dispatch requests and cancellation-sensitive reads on
      // the immutable checkout Order. A second request re-reads the state after
      // the first transaction commits instead of creating a parallel dispatch.
      const orderLock = await tx.order.updateMany({
        where: { id },
        data: { updatedAt: new Date() },
      });
      if (orderLock.count !== 1) throw new Error("ORDER_NOT_FOUND");

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
      if (order.paymentStatus !== "paid") {
        throw new Error("PAYMENT_NOT_APPROVED");
      }

      const operationalOrders = await tx.operationCommercialOrder.findMany({
        where: {
          sourceId: order.id,
          customerType: { not: "internal" },
        },
        orderBy: { createdAt: "desc" },
        take: 2,
        select: {
          id: true,
          code: true,
          sourceId: true,
          status: true,
          paymentStatus: true,
          dispatchId: true,
          items: {
            include: {
              finishedGood: {
                select: { code: true, productType: true },
              },
            },
          },
        },
      });

      if (operationalOrders.length === 0) throw new Error("OPERATIONAL_ORDER_REQUIRED");
      if (operationalOrders.length > 1) throw new Error("AMBIGUOUS_OPERATIONAL_ORDER");
      const operationalOrder = operationalOrders[0];
      if (["cancelled", "rejected", "completed"].includes(operationalOrder.status)) {
        throw new Error("OPERATIONAL_ORDER_NOT_SHIPPABLE");
      }
      if (operationalOrder.paymentStatus !== "paid") {
        throw new Error("OPERATIONAL_ORDER_NOT_SHIPPABLE");
      }

      const operationalQuantity = operationalOrder.items.reduce(
        (sum, item) => sum + item.quantity,
        0
      );
      if (operationalQuantity <= 0) throw new Error("INVALID_OPERATIONAL_QUANTITY");

      if (operationalOrder.dispatchId) {
        const linked = await tx.operationDispatch.findUnique({
          where: { id: operationalOrder.dispatchId },
          select: { id: true, code: true, status: true },
        });
        if (linked && linked.status !== "cancelled") {
          return {
            order,
            operationalOrder,
            dispatch: linked,
            reservedUnits: [] as Array<{ id: string }>,
            operationalQuantity,
            existing: true,
          };
        }
        await tx.operationCommercialOrder.update({
          where: { id: operationalOrder.id },
          data: { dispatchId: null },
        });
      }

      const existingDispatch = await tx.operationDispatch.findFirst({
        where: {
          status: { not: "cancelled" },
          events: {
            some: {
              referenceType: "order",
              referenceId: order.id,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        select: { id: true, code: true, status: true },
      });

      if (existingDispatch) {
        await tx.operationCommercialOrder.update({
          where: { id: operationalOrder.id },
          data: {
            dispatchId: existingDispatch.id,
            fulfillmentStatus: "dispatch_pending",
            status: "processing",
          },
        });

        return {
          order,
          operationalOrder,
          dispatch: existingDispatch,
          reservedUnits: [] as Array<{ id: string }>,
          operationalQuantity,
          existing: true,
        };
      }

      const requiredByProductCode = new Map<string, number>();
      for (const item of operationalOrder.items) {
        const productCode = resolveCommercialOrderItemKey(item).trim();
        if (!productCode) throw new Error("MISSING_PRODUCT_CODE");
        requiredByProductCode.set(
          productCode,
          (requiredByProductCode.get(productCode) || 0) + item.quantity
        );
      }

      const reservedUnits = await tx.operationFinishedGoodUnit.findMany({
        where: {
          reservedOrderId: order.id,
          status: "reserved",
          qaStatus: "passed",
          activationStatus: "not_activated",
          internalLabel: { not: "" },
          dispatchItems: { none: {} },
        },
        orderBy: [{ createdAt: "asc" }, { internalLabel: "asc" }],
      });

      if (reservedUnits.length !== operationalQuantity) throw new Error("RESERVATION_MISMATCH");
      if (reservedUnits.some((unit) => unit.reservedOrderId !== order.id)) {
        throw new Error("UNIT_ORDER_MISMATCH");
      }

      const reservedByProductCode = new Map<string, number>();
      for (const unit of reservedUnits) {
        reservedByProductCode.set(
          unit.productCode,
          (reservedByProductCode.get(unit.productCode) || 0) + 1
        );
      }
      if (reservedByProductCode.size !== requiredByProductCode.size) {
        throw new Error("PRODUCT_RESERVATION_MISMATCH");
      }
      for (const [productCode, requiredQty] of requiredByProductCode.entries()) {
        if ((reservedByProductCode.get(productCode) || 0) !== requiredQty) {
          throw new Error("PRODUCT_RESERVATION_MISMATCH");
        }
      }

      const dispatchCode = await getAvailableDispatchCode(tx, order.orderNumber);
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
              reason: "Despacho creado desde pedido con reserva completa y validada por SKU",
              referenceType: "order",
              referenceId: order.id,
              metadataJson: JSON.stringify({
                orderId: order.id,
                orderCode: order.orderNumber,
                orderDisplayCode: order.providerReference || order.orderNumber,
                operationalOrderId: operationalOrder.id,
                operationalOrderCode: operationalOrder.code,
                operationalQuantity,
                requiredByProductCode: Object.fromEntries(requiredByProductCode),
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

      await tx.operationCommercialOrder.update({
        where: { id: operationalOrder.id },
        data: {
          dispatchId: dispatch.id,
          fulfillmentStatus: "dispatch_pending",
          status: "processing",
        },
      });

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
        after: {
          dispatchId: dispatch.id,
          dispatchCode: dispatch.code,
          operationalOrderId: operationalOrder.id,
          operationalQuantity,
          requiredByProductCode: Object.fromEntries(requiredByProductCode),
        },
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
      operationalOrderId: result.operationalOrder.id,
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
        PAYMENT_NOT_APPROVED: "El pedido debe estar pagado antes de crear despacho",
        OPERATIONAL_ORDER_REQUIRED: "El pedido todavía no tiene su proyección operativa; vuelve a sincronizarlo antes de despacho",
        AMBIGUOUS_OPERATIONAL_ORDER: "Hay más de una proyección operativa para el mismo pedido; requiere reconciliación",
        OPERATIONAL_ORDER_NOT_SHIPPABLE: "La proyección operativa fue cancelada, completada o dejó de estar pagada",
        INVALID_OPERATIONAL_QUANTITY: "El pedido no tiene cantidad operativa válida",
        MISSING_PRODUCT_CODE: "Todos los artículos necesitan un código de producto canónico antes de despacho",
        RESERVATION_MISMATCH: "Las unidades reservadas no coinciden con la cantidad operativa",
        PRODUCT_RESERVATION_MISMATCH: "Las unidades reservadas no coinciden por producto/SKU con el pedido",
        UNIT_ORDER_MISMATCH: "Hay unidades reservadas que no pertenecen al pedido",
        DISPATCH_CODE_EXHAUSTED: "No se pudo generar un código único para el nuevo despacho",
      };
      if (messageMap[error.message]) {
        return NextResponse.json({ error: messageMap[error.message] }, { status: 409 });
      }
    }

    console.error("[orders/:id/send-to-dispatch] POST error:", error);
    return NextResponse.json({ error: "No se pudo crear el despacho" }, { status: 500 });
  }
}
