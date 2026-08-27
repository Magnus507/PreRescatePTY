import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { GENERAL_ADMIN_ROLES, requireRole } from "@/lib/rbac";
import { parseCustomerFulfillmentSummaryFromInternalNote } from "@/lib/orders/store-order-fulfillment";

export const dynamic = "force-dynamic";

function buildProductionCode(orderNumber: string) {
  const safe = orderNumber.replace(/[^A-Za-z0-9_-]/g, "-").slice(0, 68);
  return `PROD-${safe}`;
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole(GENERAL_ADMIN_ROLES);
  if (!auth.authorized) return auth.response;

  const { id } = await params;

  try {
    const order = await prisma.order.findUnique({
      where: { id },
      select: {
        id: true,
        orderNumber: true,
        orderStatus: true,
        paymentStatus: true,
        adminReviewStatus: true,
        adminReviewNotes: true,
        customerName: true,
        items: {
          select: {
            quantity: true,
            productType: true,
            productName: true,
            productCode: true,
            operationalProductName: true,
            operationalProductCode: true,
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });
    }

    if (["cancelled", "completed"].includes(order.orderStatus)) {
      return NextResponse.json(
        { error: "El pedido ya está finalizado y no puede enviarse a producción." },
        { status: 409 }
      );
    }

    const paymentApproved =
      order.paymentStatus === "paid" || order.adminReviewStatus === "approved";
    if (!paymentApproved) {
      return NextResponse.json(
        { error: "Primero debes aprobar el pago antes de enviar el pedido a producción." },
        { status: 409 }
      );
    }

    const fulfillment = parseCustomerFulfillmentSummaryFromInternalNote(order.adminReviewNotes);
    const backorderQty = Math.max(0, Number(fulfillment?.backorderQtyTotal || 0));
    if (!fulfillment?.hasBackorder || backorderQty <= 0) {
      return NextResponse.json(
        { error: "Este pedido no tiene unidades pendientes de producción." },
        { status: 409 }
      );
    }

    const firstItem = order.items[0];
    if (!firstItem) {
      return NextResponse.json({ error: "El pedido no contiene productos." }, { status: 409 });
    }

    const outputType =
      firstItem.operationalProductCode ||
      firstItem.productCode ||
      firstItem.operationalProductName ||
      firstItem.productName ||
      firstItem.productType;
    const productName =
      firstItem.operationalProductName || firstItem.productName || firstItem.productType;
    const code = buildProductionCode(order.orderNumber);

    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.operationProductionOrder.findUnique({
        where: { code },
        select: { id: true, code: true, status: true, plannedQuantity: true },
      });

      if (existing) {
        if (order.orderStatus === "pending") {
          await tx.order.update({
            where: { id: order.id },
            data: { orderStatus: "processing" },
          });
        }
        return { productionOrder: existing, created: false };
      }

      const productionOrder = await tx.operationProductionOrder.create({
        data: {
          code,
          title: `Pedido ${order.orderNumber} · ${productName}`.slice(0, 180),
          status: "planned",
          plannedQuantity: backorderQty,
          producedQuantity: 0,
          outputType: String(outputType).slice(0, 120),
          notes: `Producción por falta de stock para pedido cliente ${order.orderNumber}. Cliente: ${order.customerName || "Sin nombre"}.`,
          events: {
            create: {
              eventType: "CREATED",
              quantity: backorderQty,
              reason: "Backorder de pedido cliente enviado a producción",
              metadataJson: JSON.stringify({
                sourceType: "customer_order",
                orderId: order.id,
                orderNumber: order.orderNumber,
                backorderQty,
                outputType,
              }),
              createdById: auth.session.user.id || null,
            },
          },
        },
        select: { id: true, code: true, status: true, plannedQuantity: true },
      });

      await tx.order.update({
        where: { id: order.id },
        data: { orderStatus: "processing" },
      });

      return { productionOrder, created: true };
    });

    return NextResponse.json({
      ...result,
      message: result.created
        ? `Pedido enviado a producción (${result.productionOrder.code}).`
        : `El pedido ya estaba vinculado a producción (${result.productionOrder.code}).`,
    });
  } catch (error) {
    console.error("[admin/orders/send-to-production] error", error);
    return NextResponse.json(
      { error: "No se pudo enviar el pedido a producción." },
      { status: 500 }
    );
  }
}
