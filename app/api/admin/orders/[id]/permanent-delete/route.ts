import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, SUPERADMIN_ROLES } from "@/lib/rbac";

function isTestLikeOrder(order: {
  orderNumber: string;
  providerReference: string | null;
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
}) {
  const haystack = [
    order.orderNumber,
    order.providerReference,
    order.customerName,
    order.customerEmail,
    order.customerPhone,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return /test|prueba|demo|seed|sandbox|mock|fake/.test(haystack);
}

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(SUPERADMIN_ROLES);
  if (!auth.authorized) return auth.response;

  const { id } = await context.params;
  const body = await req.json().catch(() => ({}));
  const confirmText = String(body?.confirmText || "").trim();
  const reason = String(body?.reason || "").trim();

  if (confirmText !== "ELIMINAR PERMANENTEMENTE") {
    return NextResponse.json({ error: "Confirmación inválida" }, { status: 400 });
  }

  if (!reason) {
    return NextResponse.json({ error: "El motivo es requerido" }, { status: 400 });
  }

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      items: { select: { id: true } },
      chipClaimTokens: { select: { id: true } },
      corporateEmployeeItems: { select: { id: true } },
      productRequests: { select: { id: true } },
    },
  });

  if (!order) {
    return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });
  }

  if (order.orderStatus !== "cancelled" || order.paymentStatus !== "cancelled") {
    return NextResponse.json(
      { error: "El pedido debe eliminarse primero de forma segura antes del borrado permanente." },
      { status: 409 }
    );
  }

  if (!isTestLikeOrder(order)) {
    return NextResponse.json(
      {
        error:
          "Este pedido tiene trazabilidad operativa y no puede eliminarse permanentemente. Use Eliminar pedido para ocultarlo de la vista.",
      },
      { status: 409 }
    );
  }

  if (
    order.chipClaimTokens.length > 0 ||
    order.corporateEmployeeItems.length > 0 ||
    order.productRequests.length > 0
  ) {
    return NextResponse.json(
      { error: "El pedido tiene trazabilidad asociada y no puede eliminarse permanentemente." },
      { status: 409 }
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.auditLog.create({
      data: {
        actorUserId: auth.session.user.id || null,
        entityType: "order",
        entityId: order.id,
        action: "permanent_delete",
        oldValuesJson: JSON.stringify({
          orderNumber: order.orderNumber,
          providerReference: order.providerReference,
        }),
        newValuesJson: JSON.stringify({
          reason,
          orderStatus: order.orderStatus,
          paymentStatus: order.paymentStatus,
          mode: "permanent_delete",
        }),
      },
    });

    await tx.orderItem.deleteMany({ where: { orderId: id } });
    await tx.order.delete({ where: { id } });
  });

  return NextResponse.json({ success: true, deleted: true, mode: "permanent_delete" });
}
