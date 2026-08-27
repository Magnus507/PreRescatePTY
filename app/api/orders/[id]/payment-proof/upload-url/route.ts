import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { createClient } from "@supabase/supabase-js";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canSubmitManualProof } from "@/lib/order-status";
import { rateLimit } from "@/lib/rateLimit";

const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

function extensionForMime(mimeType: string) {
  if (mimeType === "image/jpeg") return "jpg";
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/webp") return "webp";
  return null;
}

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const userId = session.user.id;
  const { id } = await context.params;

  const limiter = await rateLimit("payment-proof-upload-url", `${userId}:${id}`, {
    limit: 10,
    windowMs: 60_000 * 15,
  });
  if (!limiter.allowed) {
    return NextResponse.json({ error: "Demasiados intentos de carga. Intenta más tarde." }, { status: 429 });
  }

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

  const body = await req.json().catch(() => null) as { mimeType?: string; size?: number } | null;
  const mimeType = body?.mimeType || "";
  const size = Number(body?.size || 0);
  const extension = extensionForMime(mimeType);

  if (!ALLOWED_IMAGE_TYPES.has(mimeType) || !extension) {
    return NextResponse.json({ error: "Solo se permiten imágenes JPG, PNG o WebP" }, { status: 400 });
  }
  if (!Number.isFinite(size) || size <= 0 || size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: "El comprobante debe pesar como máximo 5MB" }, { status: 400 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    console.error("PAYMENT_PROOF_UPLOAD_CONFIG_MISSING");
    return NextResponse.json({ error: "Almacenamiento no configurado" }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const bucket = supabase.storage.from("payment-proofs");
  const path = `payments/${userId}/${id}/${Date.now()}-${crypto.randomUUID()}.${extension}`;

  const { data, error } = await bucket.createSignedUploadUrl(path);
  if (error || !data?.token) {
    console.error("PAYMENT_PROOF_SIGNED_UPLOAD_ERROR", error);
    return NextResponse.json({ error: "No se pudo preparar la carga del comprobante" }, { status: 500 });
  }

  return NextResponse.json({
    bucket: "payment-proofs",
    path,
    token: data.token,
    maxBytes: MAX_UPLOAD_BYTES,
  });
}
