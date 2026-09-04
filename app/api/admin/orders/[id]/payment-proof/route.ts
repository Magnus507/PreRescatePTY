import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, ORDER_REVIEW_ROLES } from "@/lib/rbac";
import { getAuditRequestId, writeAuditLog } from "@/lib/audit";

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(ORDER_REVIEW_ROLES);
  if (!auth.authorized) return auth.response;

  const { id } = await context.params;
  try {
    const updated = await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { id } });
      if (!order) throw Object.assign(new Error("ORDER_NOT_FOUND"), { code: "P2025" });

      const changed = await tx.order.update({
        where: { id },
        data: {
          paymentProofUrl: null,
          manualPaymentReference: null,
          paymentStatus: "pending",
          adminReviewStatus: "pending",
          adminReviewNotes: null,
          orderStatus: "pending",
          adminReviewedAt: null,
          adminReviewedById: null,
        },
      });
      await writeAuditLog(tx, {
        accountId: auth.session.user.accountId,
        actorUserId: auth.session.user.id,
        entityType: "Order",
        entityId: id,
        action: "payment_proof_removed",
        requestId: getAuditRequestId(req),
        before: {
          proofAttached: Boolean(order.paymentProofUrl),
          manualReferenceAttached: Boolean(order.manualPaymentReference),
          paymentStatus: order.paymentStatus,
          adminReviewStatus: order.adminReviewStatus,
          orderStatus: order.orderStatus,
        },
        after: {
          proofAttached: false,
          manualReferenceAttached: false,
          paymentStatus: changed.paymentStatus,
          adminReviewStatus: changed.adminReviewStatus,
          orderStatus: changed.orderStatus,
        },
      });
      return changed;
    });
    return NextResponse.json({ order: updated });
  } catch (error) {
    if ((error as { code?: string }).code === "P2025") {
      return NextResponse.json({ error: "Orden no encontrada" }, { status: 404 });
    }
    console.error("[admin/orders/:id/payment-proof] Delete failed", error);
    return NextResponse.json({ error: "No se pudo retirar el comprobante." }, { status: 500 });
  }
}
