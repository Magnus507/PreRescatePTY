import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { GENERAL_ADMIN_ROLES, requireRole } from "@/lib/rbac";
import { getFirstValidationMessage } from "../../commercial-orders.helpers";
import { z } from "zod";
import { getAuditRequestId, writeAuditLog } from "@/lib/audit";

export const dynamic = "force-dynamic";

const CreateDispatchFromOrderSchema = z.object({
  code: z.string().trim().min(1).max(80),
  carrierName: z.string().trim().max(160).optional().nullable(),
  trackingReference: z.string().trim().max(160).optional().nullable(),
  scheduledAt: z.coerce.date().optional().nullable(),
  notes: z.string().trim().max(2000).optional().nullable(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole(GENERAL_ADMIN_ROLES);
  if (!auth.authorized) return auth.response;

  const { id: commercialOrderId } = await params;
  const requestId = getAuditRequestId(req);
  const body = await req.json().catch(() => ({}));
  const parsed = CreateDispatchFromOrderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: getFirstValidationMessage(parsed.error) }, { status: 400 });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      await tx.operationCommercialOrder.updateMany({ where: { id: commercialOrderId }, data: { updatedAt: new Date() } });
      const order = await tx.operationCommercialOrder.findUnique({
        where: { id: commercialOrderId },
        include: {
          items: true,
          dispatch: true,
        },
      });

      if (!order) return null;
      if (order.dispatch) throw new Error("ORDER_ALREADY_HAS_DISPATCH");
      if (order.status === "cancelled") throw new Error("ORDER_CANCELLED");
      if (order.customerType === "internal") throw new Error("INTERNAL_ORDER_NO_DISPATCH");
      if (order.paymentStatus !== "paid") throw new Error("ORDER_NOT_PAID");

      const customerOrder = order.sourceId
        ? await tx.order.findUnique({
            where: { id: order.sourceId },
            select: {
              id: true,
              orderNumber: true,
              providerReference: true,
              customerName: true,
              customerEmail: true,
              customerPhone: true,
              shippingAddress: true,
              shippingCity: true,
              shippingNotes: true,
            },
          })
        : null;

      const requiredByProductCode = new Map<string, number>();
      for (const item of order.items) {
        const productCode = item.productCode?.trim();
        if (!productCode) throw new Error("MISSING_PRODUCT_CODE");
        requiredByProductCode.set(
          productCode,
          (requiredByProductCode.get(productCode) || 0) + item.quantity
        );
      }

      if (requiredByProductCode.size === 0) {
        throw new Error("MISSING_PRODUCT_CODE");
      }

      const reservationOrderId = order.sourceId || commercialOrderId;
      const reservedUnits = await tx.operationFinishedGoodUnit.findMany({
        where: {
          reservedOrderId: reservationOrderId,
          status: "reserved",
          qaStatus: "passed",
          activationStatus: "not_activated",
          dispatchItems: { none: {} },
        },
        orderBy: [{ createdAt: "asc" }, { internalLabel: "asc" }],
      });

      if (reservedUnits.length === 0) throw new Error("NO_RESERVED_UNITS");

      const reservedByProductCode = new Map<string, number>();
      for (const unit of reservedUnits) {
        reservedByProductCode.set(
          unit.productCode,
          (reservedByProductCode.get(unit.productCode) || 0) + 1
        );
      }

      const requiredQuantity = Array.from(requiredByProductCode.values()).reduce(
        (sum, qty) => sum + qty,
        0
      );
      if (reservedUnits.length < requiredQuantity) throw new Error("INSUFFICIENT_RESERVED_UNITS");
      if (reservedUnits.length > requiredQuantity) throw new Error("EXCESS_RESERVED_UNITS");

      for (const [productCode, requiredQty] of requiredByProductCode.entries()) {
        if ((reservedByProductCode.get(productCode) || 0) !== requiredQty) {
          throw new Error("PRODUCT_RESERVATION_MISMATCH");
        }
      }
      for (const productCode of reservedByProductCode.keys()) {
        if (!requiredByProductCode.has(productCode)) {
          throw new Error("PRODUCT_RESERVATION_MISMATCH");
        }
      }

      const primaryOrderCode =
        customerOrder?.providerReference?.trim()?.startsWith("PR-")
          ? customerOrder.providerReference.trim()
          : customerOrder?.orderNumber || order.code;
      const destinationName = customerOrder?.customerName || order.customerName || null;
      const destinationAddress = customerOrder?.shippingAddress || null;
      const dispatchNotes = parsed.data.notes || customerOrder?.shippingNotes || order.notes || null;

      const dispatch = await tx.operationDispatch.create({
        data: {
          code: parsed.data.code,
          status: "pending_pick",
          destinationType: "customer",
          destinationName,
          destinationReference: primaryOrderCode,
          destinationAddress,
          notes: dispatchNotes,
          carrierName: parsed.data.carrierName || null,
          trackingReference: parsed.data.trackingReference || null,
          scheduledAt: parsed.data.scheduledAt || null,
          items: {
            create: reservedUnits.map((unit) => ({
              unitId: unit.id,
              internalLabel: unit.internalLabel,
              productCode: unit.productCode,
              productName: unit.productName,
              quantity: 1,
              unit: "unit",
              status: "pending_pick",
              notes: `Pedido ${primaryOrderCode}`,
            })),
          },
          events: {
            create: {
              eventType: "DISPATCH_CREATED",
              reason: "Despacho creado desde pedido reservado",
              referenceType: customerOrder ? "order" : "commercial_order",
              referenceId: customerOrder?.id || commercialOrderId,
              metadataJson: JSON.stringify({
                commercialOrderId,
                customerOrderId: customerOrder?.id || null,
                orderCode: primaryOrderCode,
                reservationOrderId,
                reservedUnitIds: reservedUnits.map((unit) => unit.id),
                customerName: destinationName,
                customerEmail: customerOrder?.customerEmail || null,
                customerPhone: customerOrder?.customerPhone || null,
                shippingAddress: customerOrder?.shippingAddress || null,
                shippingCity: customerOrder?.shippingCity || null,
                shippingNotes: customerOrder?.shippingNotes || null,
              }),
              createdById: auth.session.user.id || null,
            },
          },
        },
        include: {
          items: true,
          events: true,
        },
      });

      await tx.operationCommercialOrder.update({
        where: { id: commercialOrderId },
        data: {
          dispatchId: dispatch.id,
          fulfillmentStatus: "reserved",
          status: "dispatch_created",
        },
      });

      await tx.operationFinishedGoodUnitEvent.createMany({
        data: reservedUnits.map((unit) => ({
          unitId: unit.id,
          eventType: "UNIT_ASSIGNED_TO_DISPATCH",
          reason: `Asignada a despacho ${dispatch.code}`,
          referenceType: "dispatch",
          referenceId: dispatch.id,
          metadataJson: JSON.stringify({
            commercialOrderId,
            customerOrderId: customerOrder?.id || null,
            reservationOrderId,
            dispatchId: dispatch.id,
            dispatchCode: dispatch.code,
          }),
        })),
      });

      await writeAuditLog(tx, {
        accountId: auth.session.user.accountId || null,
        actorUserId: auth.session.user.id || null,
        entityType: "operation_commercial_order",
        entityId: order.id,
        action: "commercial_order.dispatch_created",
        requestId,
        before: {
          status: order.status,
          fulfillmentStatus: order.fulfillmentStatus,
          dispatchId: order.dispatchId,
          paymentStatus: order.paymentStatus,
        },
        after: {
          dispatchId: dispatch.id,
          dispatchCode: dispatch.code,
          reservedUnitIds: reservedUnits.map((unit) => unit.id),
          scheduledAt: parsed.data.scheduledAt || null,
          carrierName: parsed.data.carrierName || null,
          trackingReference: parsed.data.trackingReference || null,
        },
      });

      return {
        dispatch,
        reservedUnitIds: reservedUnits.map((unit) => unit.id),
      };
    });

    if (!result) {
      return NextResponse.json({ error: "Pedido comercial no encontrado" }, { status: 404 });
    }

    return NextResponse.json(
      { dispatch: result.dispatch, reservedUnitIds: result.reservedUnitIds },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof Error && error.message === "ORDER_ALREADY_HAS_DISPATCH") {
      return NextResponse.json({ error: "El pedido ya tiene un despacho asociado" }, { status: 409 });
    }
    if (error instanceof Error && error.message === "ORDER_CANCELLED") {
      return NextResponse.json({ error: "El pedido cancelado no puede crear despacho" }, { status: 400 });
    }
    if (error instanceof Error && error.message === "INTERNAL_ORDER_NO_DISPATCH") {
      return NextResponse.json(
        { error: "Los pedidos internos terminan en inventario después de QA." },
        { status: 400 }
      );
    }
    if (error instanceof Error && error.message === "ORDER_NOT_PAID") {
      return NextResponse.json(
        { error: "El pedido debe tener el pago aprobado antes de crear despacho." },
        { status: 409 }
      );
    }
    if (error instanceof Error && error.message === "MISSING_PRODUCT_CODE") {
      return NextResponse.json(
        { error: "Todos los artículos deben tener un productCode canónico antes del despacho." },
        { status: 400 }
      );
    }
    if (error instanceof Error && error.message === "NO_RESERVED_UNITS") {
      return NextResponse.json({ error: "El pedido no tiene unidades reservadas" }, { status: 400 });
    }
    if (error instanceof Error && error.message === "INSUFFICIENT_RESERVED_UNITS") {
      return NextResponse.json({ error: "No hay unidades QA aprobadas suficientes para crear el despacho" }, { status: 400 });
    }
    if (error instanceof Error && error.message === "EXCESS_RESERVED_UNITS") {
      return NextResponse.json(
        { error: "Hay más unidades reservadas que las solicitadas. Revisa la reserva." },
        { status: 409 }
      );
    }
    if (error instanceof Error && error.message === "PRODUCT_RESERVATION_MISMATCH") {
      return NextResponse.json(
        { error: "Las unidades reservadas no coinciden con los productos y cantidades del pedido." },
        { status: 409 }
      );
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "Ya existe un despacho con ese código" }, { status: 409 });
    }

    console.error("[operations/commercial-orders/:id/create-dispatch] POST error:", error);
    return NextResponse.json({ error: "Error al crear despacho desde pedido" }, { status: 500 });
  }
}
