import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canSubmitManualProof } from "@/lib/order-status";
import { normalizePaymentProofUrl } from "@/lib/payment-proof";
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

function isSafeOwnedPath(path: string, userId: string, orderId: string) {
  const prefix = `payments/${userId}/${orderId}/`;
  return (
    path.startsWith(prefix) &&
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

function buildProofProxyUrl(path: string) {
  const params = new URLSearchParams({ bucket: "payment-proofs", path });
  return `/api/image-proxy?${params.toString()}`;
}

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

  const body = await req.json().catch(() => null);
  const parsed = PaymentProofSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos", details: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;

  let normalizedProofUrl: string | null = null;

  if (data.paymentProofPath) {
    if (!isSafeOwnedPath(data.paymentProofPath, userId, id)) {
      return NextResponse.json(
        { error: "El comprobante no pertenece a este pedido." },
        { status: 400 }
      );
    }
    normalizedProofUrl = buildProofProxyUrl(data.paymentProofPath);
  } else if (data.paymentProofUrl) {
    // Compatibility path for clients loaded before paymentProofPath was introduced.
    const normalizedLegacyUrl = normalizePaymentProofUrl(data.paymentProofUrl);
    if (!normalizedLegacyUrl) {
      return NextResponse.json(
        { error: "paymentProofUrl inválida. Solo se permiten comprobantes del bucket payment-proofs." },
        { status: 400 }
      );
    }

    const legacyPath = extractProxyPath(normalizedLegacyUrl);
    if (legacyPath) {
      const exactOwnedPath = isSafeOwnedPath(legacyPath, userId, id);
      const oldClientOwnedPath =
        legacyPath.startsWith(`payments/${userId}/`) &&
        !legacyPath.includes("..") &&
        SAFE_PATH_PATTERN.test(legacyPath);

      if (!exactOwnedPath && !oldClientOwnedPath) {
        return NextResponse.json(
          { error: "El comprobante no pertenece al usuario autenticado." },
          { status: 400 }
        );
      }
      normalizedProofUrl = buildProofProxyUrl(legacyPath);
    } else {
      // Absolute legacy Supabase URLs remain accepted only during the transition.
      normalizedProofUrl = normalizedLegacyUrl;
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
  if (normalizedProofUrl) updateData.paymentProofUrl = normalizedProofUrl;
  if (data.manualPaymentReference) updateData.manualPaymentReference = data.manualPaymentReference;

  const updated = await prisma.order.update({
    where: { id },
    data: updateData,
  });

  return NextResponse.json({ order: updated });
}
