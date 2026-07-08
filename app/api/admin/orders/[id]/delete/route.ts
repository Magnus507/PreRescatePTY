import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, ORDER_ADMIN_ROLES } from "@/lib/rbac";

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(ORDER_ADMIN_ROLES);
  if (!auth.authorized) return auth.response;

  const { id } = await context.params;
  const body = await req.json().catch(() => ({}));
  const confirmText = String(body?.confirmText || "").trim();
  const reason = typeof body?.reason === "string" ? body.reason : "";

  if (confirmText !== "ELIMINAR") {
    return NextResponse.json({ error: "Confirmación inválida" }, { status: 400 });
  }

  const order = await prisma.order.findUnique({
    where: { id },
    select: {
      id: true,
      orderNumber: true,
      providerReference: true,
      customerName: true,
      customerEmail: true,
      customerPhone: true,
      paymentProofUrl: true,
      manualPaymentReference: true,
      orderStatus: true,
      paymentStatus: true,
    },
  });

  if (!order) {
    return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.order.update({
      where: { id },
      data: {
        orderStatus: "cancelled",
        paymentStatus: "cancelled",
      },
    });

    await tx.auditLog.create({
      data: {
        actorUserId: auth.session.user.id || null,
        entityType: "order",
        entityId: id,
        action: "soft_delete",
        oldValuesJson: JSON.stringify({
          orderNumber: order.orderNumber,
          providerReference: order.providerReference,
          customerName: order.customerName,
        }),
        newValuesJson: JSON.stringify({
          deletedAt: new Date().toISOString(),
          deletedMode: "soft_delete",
          deleteSource: "admin_orders_tab",
          deletedReason: reason.trim() || null,
          deletedBy: auth.session.user.id || auth.session.user.email || null,
        }),
      },
    });
  });

  return NextResponse.json({ success: true, deleted: true, mode: "soft_delete" });
}
