import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rateLimit";
import { ORDER_FULFILLMENT_ROLES, requireRole } from "@/lib/rbac";

export async function PATCH(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole(ORDER_FULFILLMENT_ROLES);
  if (!auth.authorized) return auth.response;
  const session = auth.session;

  const adminId = session.user.id;
  const limiter = await rateLimit("admin-corporate-delivery", adminId, {
    limit: 20,
    windowMs: 60_000,
  });
  if (!limiter.allowed) {
    return NextResponse.json(
      { error: "Demasiadas solicitudes. Intenta nuevamente en un minuto." },
      { status: 429 }
    );
  }

  const { id } = await context.params;

  const order = await prisma.order.findUnique({
    where: { id },
    select: {
      id: true,
      orderType: true,
      paymentStatus: true,
      adminReviewStatus: true,
      corporateDeliveryStatus: true,
      estimatedDeliveryDate: true,
    },
  });

  if (!order) {
    return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });
  }

  if (order.orderType !== "corporate_employee_purchase") {
    return NextResponse.json(
      { error: "INVALID_ORDER_TYPE", message: "Este pedido no es corporativo." },
      { status: 409 }
    );
  }

  if (order.paymentStatus !== "paid") {
    return NextResponse.json(
      { error: "PAYMENT_NOT_APPROVED", message: "El pago debe estar aprobado para marcar entrega." },
      { status: 409 }
    );
  }

  if (order.adminReviewStatus !== "approved") {
    return NextResponse.json(
      { error: "ADMIN_REVIEW_NOT_APPROVED", message: "El pedido debe estar aprobado por admin." },
      { status: 409 }
    );
  }

  if (order.corporateDeliveryStatus === "delivered") {
    return NextResponse.json(
      { ok: true, message: "El pedido ya estaba marcado como entregado" },
      { status: 200 }
    );
  }

  const updated = await prisma.order.update({
    where: { id },
    data: {
      corporateDeliveryStatus: "delivered",
      deliveryNote: "Lote entregado a empresa",
      estimatedDeliveryDate: order.estimatedDeliveryDate ?? new Date(),
    },
    select: {
      id: true,
      corporateDeliveryStatus: true,
      deliveryNote: true,
      estimatedDeliveryDate: true,
    },
  });

  return NextResponse.json({ ok: true, order: updated });
}
