import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { GENERAL_ADMIN_ROLES, requireRole } from "@/lib/rbac";
import { parseCustomerFulfillmentSummaryFromInternalNote } from "@/lib/orders/store-order-fulfillment";
import { ensureCustomerBackorderProduction } from "@/lib/operations/customer-order-production";
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
            productType: true,
            productName: true,
            productCode: true,
            operationalProductName: true,
            operationalProductCode: true,
            operationalFinishedGoodId: true,
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

    const finishedGood = firstItem.operationalFinishedGoodId
      ? await prisma.operationFinishedGood.findUnique({
          where: { id: firstItem.operationalFinishedGoodId },
          select: { code: true, name: true, productType: true },
        })
      : null;

    const outputType = finishedGood?.productType || firstItem.productType;
    const productCode =
      finishedGood?.code ||
      firstItem.operationalProductCode ||
      firstItem.productCode ||
      null;
    const productName =
      finishedGood?.name ||
      firstItem.operationalProductName ||
      firstItem.productName ||
      firstItem.productType;

    const result = await prisma.$transaction(async (tx) => {
      const production = await ensureCustomerBackorderProduction(tx, {
        orderId: order.id,
        orderNumber: order.orderNumber,
        customerName: order.customerName,
        backorderQty,
        outputType,
        productCode,
        productName,
        createdById: auth.session.user.id || null,
      });

      if (!production) return null;

      if (order.orderStatus === "pending") {
        await tx.order.update({
          where: { id: order.id },
          data: { orderStatus: "processing" },
        });
      }

      await writeAuditLog(tx, {
        actorUserId: auth.session.user.id || null,
        entityType: "order",
        entityId: order.id,
        action: "order.sent_to_production",
        requestId,
        before: { orderStatus: order.orderStatus, paymentStatus: order.paymentStatus, backorderQty },
        after: { productionOrderId: production.productionOrder.id, productionOrderCode: production.productionOrder.code, created: production.created },
      });

      return production;
    });

    if (!result) {
      return NextResponse.json(
        { error: "No hay cantidad pendiente para producción." },
        { status: 409 }
      );
    }

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
