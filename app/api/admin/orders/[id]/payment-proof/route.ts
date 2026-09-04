import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, ORDER_REVIEW_ROLES } from "@/lib/rbac";

export async function DELETE(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(ORDER_REVIEW_ROLES);
  if (!auth.authorized) return auth.response;

  const { id } = await context.params;
  const order = await prisma.order.findUnique({ where: { id } });
  if (!order) {
    return NextResponse.json({ error: "Orden no encontrada" }, { status: 404 });
  }

  const updated = await prisma.order.update({
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

  return NextResponse.json({ order: updated });
}
