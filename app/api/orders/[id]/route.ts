import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canCustomerCancelManual, canSubmitManualProof } from "@/lib/order-status";
import { Prisma } from "@prisma/client";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const userId = session.user.id;
  const { id } = await params;
  
  const body = await req.json();
  const { paymentProofUrl, status, shippingAddress, shippingCity, shippingNotes } = body;

  const order = await prisma.order.findUnique({ where: { id } });
  if (!order || order.userId !== userId) {
    return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });
  }

  let updateData: Prisma.OrderUpdateInput = {};
  
  if (status === "cancelled") {
    if (!canCustomerCancelManual(order)) {
      return NextResponse.json({ error: "No puedes cancelar esta orden" }, { status: 400 });
    }
    updateData = {
      orderStatus: "cancelled",
      paymentStatus: "cancelled"
    };
  } else {
    const validatedProofUrl = paymentProofUrl
      ? normalizePaymentProofUrl(paymentProofUrl, userId)
      : null;

    if (paymentProofUrl && !validatedProofUrl) {
      return NextResponse.json({ error: "Comprobante invalido" }, { status: 400 });
    }

    updateData = {
      shippingAddress: shippingAddress || order.shippingAddress,
      shippingCity: shippingCity || order.shippingCity,
      shippingNotes: shippingNotes || order.shippingNotes
    };

    if (validatedProofUrl || order.paymentProofUrl) {
      if (!canSubmitManualProof(order)) {
        return NextResponse.json({ error: "La orden no permite actualizar comprobante" }, { status: 400 });
      }
      updateData.paymentProofUrl = validatedProofUrl || order.paymentProofUrl;
      updateData.orderStatus = "processing";
      updateData.paymentStatus = "under_review";
    }
  }

  const updated = await prisma.order.update({
    where: { id },
    data: updateData
  });

  return NextResponse.json({ order: updated });
}

function normalizePaymentProofUrl(value: unknown, userId: string) {
  if (typeof value !== "string" || value.length > 500) return null;

  let url: URL;
  try {
    url = new URL(value, "https://local.prerescue");
  } catch {
    return null;
  }

  if (url.pathname !== "/api/image-proxy") return null;
  if (url.searchParams.get("bucket") !== "payment-proofs") return null;

  const path = url.searchParams.get("path");
  if (!path) return null;

  const userPaymentPrefix = `payments/${userId}/`;
  const legacyUserPaymentPrefix = `payments/${userId}_`;
  const isOwnedPath =
    (path.startsWith(userPaymentPrefix) || path.startsWith(legacyUserPaymentPrefix)) &&
    /^[a-zA-Z0-9][a-zA-Z0-9/_.,=-]{0,240}\.webp$/i.test(path);

  if (!isOwnedPath) return null;

  const normalized = new URL("/api/image-proxy", "https://local.prerescue");
  normalized.searchParams.set("bucket", "payment-proofs");
  normalized.searchParams.set("path", path);
  return `${normalized.pathname}?${normalized.searchParams.toString()}`;
}
