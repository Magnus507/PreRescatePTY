import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canSubmitManualProof } from "@/lib/order-status";
import { z } from "zod";

// MANUAL FLOW P0 HARDENING
const SAFE_PATH_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9/_.,=-]{0,240}\.(?:jpg|jpeg|png|webp)$/i;

function normalizePaymentProofUrl(value: string) {
  let url: URL;
  try {
    url = new URL(value, "https://local.prerescue");
  } catch {
    return null;
  }

  // Allow internal image-proxy URLs generated/used by our own upload/display flow.
  if (url.pathname === "/api/image-proxy") {
    const bucket = url.searchParams.get("bucket");
    const path = url.searchParams.get("path");
    if (bucket !== "payment-proofs" || !path || !SAFE_PATH_PATTERN.test(path)) {
      return null;
    }
    const normalized = new URL("/api/image-proxy", "https://local.prerescue");
    normalized.searchParams.set("bucket", "payment-proofs");
    normalized.searchParams.set("path", path);
    return `${normalized.pathname}?${normalized.searchParams.toString()}`;
  }

  // Allow direct public Supabase storage URL for payment-proofs only.
  const supabaseBase = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseBase) return null;

  let supabaseOrigin: string;
  try {
    supabaseOrigin = new URL(supabaseBase).origin;
  } catch {
    return null;
  }

  if (url.origin !== supabaseOrigin) return null;

  const marker = "/storage/v1/object/public/payment-proofs/";
  const idx = url.pathname.indexOf(marker);
  if (idx === -1) return null;

  const relativePath = decodeURIComponent(url.pathname.slice(idx + marker.length));
  if (!SAFE_PATH_PATTERN.test(relativePath)) return null;

  return `${supabaseOrigin}${marker}${relativePath}`;
}


const PaymentProofSchema = z.object({
  paymentProofUrl: z.string().min(1).optional(),
  manualPaymentReference: z.string().min(2).max(100).optional(),
}).refine(
  (data) => data.paymentProofUrl || data.manualPaymentReference,
  {
    message: "Debes enviar al menos paymentProofUrl o manualPaymentReference",
    path: ["paymentProofUrl", "manualPaymentReference"]
  }
);

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const userId = session.user.id;
  const { id } = await context.params;
  const order = await prisma.order.findUnique({ where: { id } });
  if (!order || order.userId !== userId) {
    return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });
  }
  if (order.provider !== "manual") {
    return NextResponse.json({ error: "Solo órdenes manuales" }, { status: 400 });
  }
  if (!canSubmitManualProof(order)) {
    return NextResponse.json({ error: "La orden no está pendiente de comprobante" }, { status: 400 });
  }

  const body = await req.json();
  if (process.env.NODE_ENV !== "production") {
    console.error("[PAYMENT_PROOF] incoming", {
      orderId: id,
      userId,
      provider: order.provider,
      orderStatus: order.orderStatus,
      paymentStatus: order.paymentStatus,
      adminReviewStatus: order.adminReviewStatus,
      hasPaymentProofUrl: !!body?.paymentProofUrl,
      hasManualPaymentReference: !!body?.manualPaymentReference,
    });
  }
  const parsed = PaymentProofSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos", details: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;

  const normalizedProofUrl = data.paymentProofUrl
    ? normalizePaymentProofUrl(data.paymentProofUrl)
    : null;

  if (data.paymentProofUrl && !normalizedProofUrl) {
    const safeUrlPreview = data.paymentProofUrl.length > 80
      ? data.paymentProofUrl.substring(0, 80) + "..."
      : data.paymentProofUrl;
    const normalizeError = `[PAYMENT_PROOF] normalize failed for order ${id}: url=${safeUrlPreview}`;
    if (process.env.NODE_ENV !== "production") {
      console.error(normalizeError);
    }
    return NextResponse.json(
      { error: "paymentProofUrl inválida. Solo se permiten comprobantes del bucket payment-proofs." },
      { status: 400 }
    );
  }


  const updateData: Record<string, any> = {
    paymentStatus: "under_review",
    orderStatus: "processing",
    adminReviewStatus: "pending",
  };
  if (normalizedProofUrl) updateData.paymentProofUrl = normalizedProofUrl;
  if (data.manualPaymentReference) updateData.manualPaymentReference = data.manualPaymentReference;

  const updated = await prisma.order.update({
    where: { id },
    data: updateData
  });

  return NextResponse.json({ order: updated });
}
