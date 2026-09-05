import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { canCustomerCancelManual } from "@/lib/order-status";
import { POST as submitPaymentProof } from "./payment-proof/route";
import { enqueueStoredCommerceOrderSyncOutbox } from "@/lib/operations/commerce-order-sync-outbox";

const schema = z.object({
  status: z.literal("cancelled").optional(),
  paymentProofUrl: z.string().min(1).max(500).optional(),
  shippingAddress: z.string().trim().max(500).optional(),
  shippingCity: z.string().trim().max(100).optional(),
  shippingNotes: z.string().trim().max(1000).optional(),
}).strict();

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  const body = parsed.data;
  if (body.paymentProofUrl && !body.status) {
    // Legacy clients must pass the same file/ownership checks as the current form.
    return submitPaymentProof(new NextRequest(req.url, {
      method: "POST", headers: req.headers, body: JSON.stringify({ paymentProofUrl: body.paymentProofUrl }),
    }), context);
  }
  const { id } = await context.params;
  const order = await prisma.order.findUnique({ where: { id } });
  if (!order || order.userId !== session.user.id) return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });
  const cancelling = body.status === "cancelled";
  if ((cancelling && !canCustomerCancelManual(order)) || (!cancelling && ["shipped", "completed", "cancelled"].includes(order.orderStatus))) {
    return NextResponse.json({ error: "El pedido ya no permite este cambio" }, { status: 409 });
  }
  try {
    const updated = await prisma.$transaction(async (tx) => {
      const changed = await tx.order.updateMany({
        where: { id, userId: session.user.id, orderStatus: order.orderStatus, paymentStatus: order.paymentStatus, adminReviewStatus: order.adminReviewStatus, updatedAt: order.updatedAt },
        data: cancelling ? { orderStatus: "cancelled", paymentStatus: "cancelled" } : {
          shippingAddress: body.shippingAddress, shippingCity: body.shippingCity, shippingNotes: body.shippingNotes,
        },
      });
      if (changed.count !== 1) return null;
      if (cancelling) await enqueueStoredCommerceOrderSyncOutbox(tx, { orderId: id, sourceType: "checkout", deduplicationSuffix: "customer-cancelled" });
      return tx.order.findUnique({ where: { id } });
    });
    if (!updated) return NextResponse.json({ error: "El pedido cambió. Recarga e intenta de nuevo." }, { status: 409 });
    return NextResponse.json({ order: updated });
  } catch {
    return NextResponse.json({ error: "No se pudo actualizar el pedido" }, { status: 500 });
  }
}
