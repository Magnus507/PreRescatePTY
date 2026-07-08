import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, ORDER_ADMIN_ROLES } from "@/lib/rbac";
import { releaseEligibleOrderReservations } from "@/lib/operations/release-order-reservations";

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

  const reservationResult = await releaseEligibleOrderReservations(prisma, {
    orderId: id,
    actorId: auth.session.user.id || null,
    reason: reason.trim() || `Pedido cancelado por ${auth.session.user.email || auth.session.user.id || "admin"}`,
    dryRun: true,
  });

  if (reservationResult.blockedCount > 0) {
    return NextResponse.json(
      {
        error: "Este pedido ya avanzó a despacho/entrega/activación y requiere revisión manual.",
        blockedReservationsCount: reservationResult.blockedCount,
        blockedUnits: reservationResult.blockedUnits,
      },
      { status: 409 }
    );
  }

  await prisma.$transaction(async (tx) => {
    await releaseEligibleOrderReservations(tx, {
      orderId: id,
      actorId: auth.session.user.id || null,
      reason: reason.trim() || `Pedido cancelado por ${auth.session.user.email || auth.session.user.id || "admin"}`,
      dryRun: false,
    });

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
          releasedReservationsCount: reservationResult.releasedCount,
        }),
      },
    });
  });

  return NextResponse.json({
    success: true,
    deleted: true,
    mode: "soft_delete",
    orderId: id,
    orderNumber: order.orderNumber,
    cancelled: true,
    releasedReservationsCount: reservationResult.releasedCount,
    blockedReservationsCount: reservationResult.blockedCount,
    releasedUnits: reservationResult.releasedUnits,
    blockedUnits: reservationResult.blockedUnits,
    message: reservationResult.releasedCount > 0
      ? "Pedido cancelado y reservas elegibles liberadas."
      : "Pedido cancelado sin reservas para liberar.",
  });
}
