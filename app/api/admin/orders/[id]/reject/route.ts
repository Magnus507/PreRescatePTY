import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AccountStateService } from "@/domains/accounts/services/account-state.service";
import { canAdminRejectManual } from "@/lib/order-status";
import { rateLimit } from "@/lib/rateLimit";
import { requireRole, ORDER_REVIEW_ROLES } from "@/lib/rbac";
import { z } from "zod";
import { logger } from "@/lib/logger";

const RejectSchema = z.object({
  adminReviewNotes: z.string().optional(),
  reason: z.string().optional(),
});

type AdminReviewedOrder = {
  id: string;
  orderNumber: string;
  orderStatus: string;
  paymentStatus: string;
  adminReviewStatus: string | null;
  adminReviewedAt: Date | null;
  adminReviewNotes: string | null;
  updatedAt: Date;
};

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(ORDER_REVIEW_ROLES);
  if (!auth.authorized) return auth.response;
  const session = auth.session;
  const adminId = session.user.id;

  // Rate limit: 20 reject/min per admin
  const limiter = await rateLimit("admin-reject", adminId, {
    limit: 20,
    windowMs: 60_000,
  });
  if (!limiter.allowed) {
    return NextResponse.json(
      { error: "Demasiadas solicitudes. Intenta nuevamente." },
      { status: 429 }
    );
  }
  const { id } = await context.params;
  const body = await req.json();
  const parsed = RejectSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos", details: parsed.error.flatten() }, { status: 400 });
  }
  const notes = parsed.data.adminReviewNotes || parsed.data.reason || null;

  // Buscar orden manual pendiente de revisión
  const order = await prisma.order.findUnique({
    where: { id },
    include: { corporateEmployeeItems: { select: { organizationMemberId: true } } },
  });
  if (!order || order.provider !== "manual") {
    return NextResponse.json({ error: "Orden manual no encontrada" }, { status: 404 });
  }
  if (order.adminReviewStatus === "rejected" || order.paymentStatus === "rejected") {
    return NextResponse.json(
      { error: "Este pedido ya fue rechazado." },
      { status: 400 }
    );
  }

  if (order.adminReviewStatus === "approved" || order.paymentStatus === "paid") {
    return NextResponse.json(
      { error: "Este pedido ya fue aprobado y no puede rechazarse." },
      { status: 400 }
    );
  }

  if (!canAdminRejectManual(order)) {
    return NextResponse.json({ error: "La orden manual no puede rechazarse en su estado actual" }, { status: 400 });
  }

  if (order.orderType === "corporate_employee_purchase") {
    const memberIds = Array.from(new Set(order.corporateEmployeeItems.map((item) => item.organizationMemberId)));

    let result: { updatedOrder: AdminReviewedOrder };
    try {
      result = await prisma.$transaction(async (tx) => {
        const updatedOrder = await tx.order.update({
          where: { id },
          data: {
            paymentStatus: "rejected",
            orderStatus: "cancelled",
            adminReviewStatus: "rejected",
            adminReviewedAt: new Date(),
            adminReviewedById: adminId,
            adminReviewNotes: notes,
          },
        });

        if (memberIds.length > 0) {
          await tx.organizationMember.updateMany({
            where: { id: { in: memberIds } },
            data: { corporateStatus: "approved_unpaid" },
          });
        }

        // Revert linked product requests to approved_pending_payment and clear orderId
        await tx.corporateProductRequest.updateMany({
          where: { orderId: id },
          data: {
            status: "approved_pending_payment",
            orderId: null,
          },
        });

        await tx.auditLog.create({
          data: {
            accountId: null,
            actorUserId: adminId,
            entityType: "Order",
            entityId: order.id,
            action: "corporate_order_rejected",
            newValuesJson: null,
            oldValuesJson: null,
          },
        });

        return { updatedOrder };
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Error al rechazar orden corporativa";
      logger.error("[Admin Reject] Corporate order rejection error:", message);
      return NextResponse.json({ error: "No se pudo rechazar la orden" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      action: "reject",
      orderId: order.id,
      orderNumber: order.orderNumber,
      status: "cancelled",
      paymentStatus: "rejected",
      message: "Pago rechazado correctamente.",
      order: result.updatedOrder,
    });
  }

  // Buscar usuario y accountId
  const user = await prisma.user.findUnique({ where: { id: order.userId ?? undefined } });
  const accountId = user?.accountId || null;

  // Actualizar orden y crear AuditLog
  let result: { updatedOrder: AdminReviewedOrder };
  try {
    result = await prisma.$transaction(async (tx) => {
      // Actualizar orden
      const updatedOrder = await tx.order.update({
        where: { id },
        data: {
          paymentStatus: "rejected",
          orderStatus: "cancelled",
          adminReviewStatus: "rejected",
          adminReviewedAt: new Date(),
          adminReviewedById: adminId,
          adminReviewNotes: notes,
        }
      });
      // Crear AuditLog SOLO con campos válidos
      await tx.auditLog.create({
        data: {
          accountId,
          actorUserId: adminId,
          entityType: "Order",
          entityId: order.id,
          action: "order_rejected",
          newValuesJson: null,
          oldValuesJson: null,
        }
      });
      return { updatedOrder };
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error al rechazar orden";
    logger.error("[Admin Reject] Order rejection error:", message);
    return NextResponse.json({ error: "No se pudo rechazar la orden" }, { status: 500 });
  }

  // Invalidar caché de AccountStateService para el usuario afectado
  if (order.userId) {
    await AccountStateService.invalidateCache(order.userId);
  }

  return NextResponse.json({
    success: true,
    action: "reject",
    orderId: order.id,
    orderNumber: order.orderNumber,
    status: result.updatedOrder.orderStatus,
    paymentStatus: result.updatedOrder.paymentStatus,
    message: "Pago rechazado correctamente.",
    order: result.updatedOrder,
  });
}
