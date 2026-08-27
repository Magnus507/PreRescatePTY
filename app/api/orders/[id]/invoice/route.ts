import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireActiveAccountSession } from "@/lib/rbac";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireActiveAccountSession();
  if (!auth.authorized) return auth.response;

  const { id } = await params;
  const invoice = await prisma.invoice.findUnique({
    where: { orderId: id },
    include: {
      lines: { orderBy: { createdAt: "asc" } },
      order: { select: { userId: true } },
    },
  });

  if (!invoice || invoice.order.userId !== auth.session.user.id) {
    return NextResponse.json({ error: "Factura no encontrada" }, { status: 404 });
  }

  return NextResponse.json({
    invoice: {
      id: invoice.id,
      orderId: invoice.orderId,
      internalNumber: invoice.internalNumber,
      status: invoice.status,
      currency: invoice.currency,
      subtotal: invoice.subtotal,
      discountTotal: invoice.discountTotal,
      taxRate: invoice.taxRate,
      taxTotal: invoice.taxTotal,
      total: invoice.total,
      priceIncludesTax: invoice.priceIncludesTax,
      buyerName: invoice.buyerName,
      buyerEmail: invoice.buyerEmail,
      buyerDocument: invoice.buyerDocument,
      createdAt: invoice.createdAt,
      lines: invoice.lines.map((line) => ({
        id: line.id,
        description: line.description,
        productCode: line.productCode,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        subtotal: line.subtotal,
        discount: line.discount,
        taxRate: line.taxRate,
        taxAmount: line.taxAmount,
        total: line.total,
      })),
    },
  });
}
