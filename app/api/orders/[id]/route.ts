import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const userId = (session.user as any).id;
  const { id } = await params;
  
  const body = await req.json();
  const { paymentProofUrl, status, shippingAddress, shippingCity, shippingNotes } = body;

  const order = await prisma.order.findUnique({ where: { id } });
  if (!order || order.userId !== userId) {
    return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });
  }

  let updateData: any = {};
  
  if (status === "cancelled") {
    updateData = { orderStatus: "cancelled" };
  } else {
    updateData = {
      paymentProofUrl: paymentProofUrl || order.paymentProofUrl,
      orderStatus: "processing", // Cambia a "estamos trabajando"
      paymentStatus: "under_review",
      shippingAddress: shippingAddress || order.shippingAddress,
      shippingCity: shippingCity || order.shippingCity,
      shippingNotes: shippingNotes || order.shippingNotes
    };
  }

  const updated = await prisma.order.update({
    where: { id },
    data: updateData
  });

  return NextResponse.json({ order: updated });
}
