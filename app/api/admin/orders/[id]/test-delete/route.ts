import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, ORDER_ADMIN_ROLES } from "@/lib/rbac";

function isSafeTestOrder(order: {
  orderStatus: string;
  paymentStatus: string;
  paymentProofUrl: string | null;
  manualPaymentReference: string | null;
  providerReference: string | null;
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  orderNumber: string;
  items: Array<{ productType: string; quantity: number }>;
}) {
  const haystack = [
    order.orderNumber,
    order.customerName,
    order.customerEmail,
    order.customerPhone,
    order.providerReference,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const markedAsTest = /test|prueba|demo|seed|sandbox|mock|fake/.test(haystack);
  const noAdvancedTrace =
    !order.paymentProofUrl &&
    !order.manualPaymentReference &&
    order.items.length > 0 &&
    order.items.every((item) => item.quantity > 0);

  return markedAsTest && noAdvancedTrace && order.orderStatus === "pending" && order.paymentStatus === "pending";
}

export async function DELETE(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(ORDER_ADMIN_ROLES);
  if (!auth.authorized) return auth.response;

  const { id } = await context.params;
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      items: {
        select: { productType: true, quantity: true },
      },
      chipClaimTokens: {
        select: { id: true },
      },
      corporateEmployeeItems: {
        select: { id: true },
      },
      productRequests: {
        select: { id: true },
      },
    },
  });

  if (!order) {
    return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });
  }

  if (!isSafeTestOrder(order)) {
    return NextResponse.json(
      { error: "Solo se pueden eliminar pedidos de prueba sin trazabilidad avanzada." },
      { status: 400 }
    );
  }

  if (
    order.chipClaimTokens.length > 0 ||
    order.corporateEmployeeItems.length > 0 ||
    order.productRequests.length > 0
  ) {
    return NextResponse.json(
      { error: "El pedido tiene trazabilidad asociada y no puede eliminarse." },
      { status: 400 }
    );
  }

  await prisma.orderItem.deleteMany({ where: { orderId: id } });
  await prisma.order.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
