import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { createClient } from "@supabase/supabase-js";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canSubmitManualProof } from "@/lib/order-status";
import { normalizePaymentProofUrl } from "@/lib/payment-proof";
import { rateLimit } from "@/lib/rateLimit";
import { z } from "zod";

const PaymentProofSchema = z.object({
  paymentProofPath: z.string().trim().min(1).max(300).optional(),
  // Transitional compatibility for browser bundles loaded before the signed-path flow.
  paymentProofUrl: z.string().trim().min(1).max(500).optional(),
  manualPaymentReference: z.string().trim().min(2).max(100).optional(),
}).refine(
  (data) => data.paymentProofPath || data.paymentProofUrl || data.manualPaymentReference,
  {
    message: "Debes enviar al menos un comprobante o una referencia de pago",
    path: ["paymentProofPath", "manualPaymentReference"],
  }
);

const SAFE_PATH_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9/_.,=-]{0,280}\.(?:jpg|jpeg|png|webp)$/i;
const LOCAL_BASE = "https://local.prerescue";
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

function isSafeOwnedPath(path: string, userId: string, orderId: string) {
  const prefix = `payments/${userId}/${orderId}/`;
  return (
    path.startsWith(prefix) &&
    !path.includes("..") &&
    !path.includes("\\") &&
    SAFE_PATH_PATTERN.test(path)
  );
}

function isSafeLegacyOwnedPath(path: string, userId: string) {
  return (
    (path.startsWith(`payments/${userId}/`) || path.startsWith(`payments/${userId}_`)) &&
    !path.includes("..") &&
    !path.includes("\\") &&
    SAFE_PATH_PATTERN.test(path)
  );
}

function extractProxyPath(value: string): string | null {
  try {
    const url = new URL(value, LOCAL_BASE);
    if (url.pathname !== "/api/image-proxy") return null;
    if (url.searchParams.get("bucket") !== "payment-proofs") return null;
    return url.searchParams.get("path");
  } catch {
    return null;
  }
}

function extractLegacySupabasePath(value: string): string | null {
  try {
    const url = new URL(value);
    const marker = "/storage/v1/object/public/payment-proofs/";
    const idx = url.pathname.indexOf(marker);
    if (idx === -1) return null;
    return decodeURIComponent(url.pathname.slice(idx + marker.length));
  } catch {
    return null;
  }
}

function buildProofProxyUrl(path: string) {
  const params = new URLSearchParams({ bucket: "payment-proofs", path });
  return `/api/image-proxy?${params.toString()}`;
}

function detectImageMagicBytes(buffer: Buffer): "image/jpeg" | "image/png" | "image/webp" | null {
  if (buffer.length < 12) return null;

  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }

  const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (buffer.subarray(0, 8).equals(pngSignature)) {
    return "image/png";
  }

  if (
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return "image/webp";
  }

  return null;
}

async function verifyStoredPaymentProof(path: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    console.error("PAYMENT_PROOF_VERIFY_CONFIG_MISSING");
    return { ok: false as const, status: 500, error: "Almacenamiento no configurado" };
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase.storage.from("payment-proofs").download(path);
  if (error || !data) {
    console.error("PAYMENT_PROOF_VERIFY_DOWNLOAD_ERROR", { path, error });
    return { ok: false as const, status: 400, error: "El comprobante no se encontró en el almacenamiento. Vuelve a subirlo." };
  }

  if (data.size <= 0 || data.size > MAX_UPLOAD_BYTES) {
    return { ok: false as const, status: 400, error: "El comprobante debe pesar como máximo 5MB" };
  }

  const buffer = Buffer.from(await data.arrayBuffer());
  if (!detectImageMagicBytes(buffer)) {
    return { ok: false as const, status: 400, error: "El archivo subido no es una imagen JPG, PNG o WebP válida." };
  }

  return { ok: true as const };
}

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const userId = session.user.id;
  const { id } = await context.params;

  const limiter = await rateLimit("payment-proof-register", `${userId}:${id}`, {
    limit: 12,
    windowMs: 60_000 * 15,
  });
  if (!limiter.allowed) {
    return NextResponse.json({ error: "Demasiados intentos. Intenta más tarde." }, { status: 429 });
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

  const body = await req.json().catch(() => null);
  const parsed = PaymentProofSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos", details: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;

  let proofPath: string | null = null;

  if (data.paymentProofPath) {
    if (!isSafeOwnedPath(data.paymentProofPath, userId, id)) {
      return NextResponse.json(
        { error: "El comprobante no pertenece a este pedido." },
        { status: 400 }
      );
    }
    proofPath = data.paymentProofPath;
  } else if (data.paymentProofUrl) {
    // Compatibility path for clients loaded before paymentProofPath was introduced.
    const normalizedLegacyUrl = normalizePaymentProofUrl(data.paymentProofUrl);
    if (!normalizedLegacyUrl) {
      return NextResponse.json(
        { error: "paymentProofUrl inválida. Solo se permiten comprobantes del bucket payment-proofs." },
        { status: 400 }
      );
    }

    const legacyPath =
      extractProxyPath(normalizedLegacyUrl) ||
      extractLegacySupabasePath(normalizedLegacyUrl);

    if (!legacyPath || (!isSafeOwnedPath(legacyPath, userId, id) && !isSafeLegacyOwnedPath(legacyPath, userId))) {
      return NextResponse.json(
        { error: "El comprobante no pertenece al usuario autenticado." },
        { status: 400 }
      );
    }
    proofPath = legacyPath;
  }

  if (proofPath) {
    const verified = await verifyStoredPaymentProof(proofPath);
    if (!verified.ok) {
      return NextResponse.json({ error: verified.error }, { status: verified.status });
    }
  }

  const updateData: {
    paymentStatus: "under_review";
    orderStatus: "processing";
    adminReviewStatus: "pending";
    paymentProofUrl?: string;
    manualPaymentReference?: string;
  } = {
    paymentStatus: "under_review",
    orderStatus: "processing",
    adminReviewStatus: "pending",
  };
  if (proofPath) updateData.paymentProofUrl = buildProofProxyUrl(proofPath);
  if (data.manualPaymentReference) updateData.manualPaymentReference = data.manualPaymentReference;

  const changed = await prisma.order.updateMany({
    where: { id, userId, paymentStatus: order.paymentStatus, orderStatus: order.orderStatus, adminReviewStatus: order.adminReviewStatus, updatedAt: order.updatedAt },
    data: updateData,
  });

  if (changed.count !== 1) return NextResponse.json({ error: "El pedido cambió. Recarga e intenta de nuevo." }, { status: 409 });
  const updated = await prisma.order.findUnique({ where: { id } });
  return NextResponse.json({ order: updated });
}
