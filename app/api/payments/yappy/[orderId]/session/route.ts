import { randomBytes, randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { encryptSensitiveValue, decryptSensitiveValue } from "@/lib/encryption";
import { serializeMoney } from "@/lib/money";
import {
  createYappyCheckout,
  getYappyButtonScriptUrl,
  normalizeYappyAlias,
  YappyConfigurationError,
  YappyProviderError,
} from "@/lib/payments/yappy";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rateLimit";

const requestSchema = z.object({
  aliasYappy: z.string().trim().min(1).max(24),
});

function createProviderOrderId() {
  return `P${randomBytes(7).toString("hex")}`;
}

function decodeStoredSession(value: string | null) {
  if (!value) return null;
  try {
    return JSON.parse(decryptSensitiveValue(value).plaintext) as {
      transactionId: string;
      documentName: string;
      token: string;
    };
  } catch {
    return null;
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { orderId } = await params;
  const userId = session.user.id;
  if (!orderId || orderId.length > 64) {
    return NextResponse.json({ error: "Pedido invalido" }, { status: 400 });
  }

  const limiter = await rateLimit("yappy-session", userId, { limit: 8, windowMs: 60_000 });
  if (!limiter.allowed) {
    return NextResponse.json({ error: "Espera un minuto antes de intentar nuevamente" }, { status: 429 });
  }

  const parsed = requestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Numero Yappy invalido" }, { status: 400 });
  }
  const aliasYappy = normalizeYappyAlias(parsed.data.aliasYappy);
  if (!aliasYappy) {
    return NextResponse.json({ error: "Ingresa un numero Yappy de 8 digitos" }, { status: 400 });
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      userId: true,
      amount: true,
      currency: true,
      paymentStatus: true,
      orderStatus: true,
      paymentMethod: true,
      customerPhone: true,
    },
  });

  if (!order || order.userId !== userId) {
    return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });
  }
  if (order.paymentStatus === "paid") {
    return NextResponse.json({ paid: true });
  }
  if (order.paymentStatus !== "pending" || order.orderStatus === "cancelled") {
    return NextResponse.json({ error: "Este pedido no admite un pago Yappy" }, { status: 409 });
  }
  if (order.paymentMethod !== "yappy") {
    return NextResponse.json({ error: "El metodo de pago del pedido no es Yappy" }, { status: 409 });
  }
  if (order.currency.toUpperCase() !== "USD") {
    return NextResponse.json({ error: "Moneda no admitida por Yappy" }, { status: 409 });
  }

  const requestKey = req.headers.get("idempotency-key")?.trim() || randomUUID();
  if (requestKey.length > 128) {
    return NextResponse.json({ error: "Solicitud invalida" }, { status: 400 });
  }
  const idempotencyKey = `yappy:${userId}:${order.id}:${requestKey}`;
  const existingAttempt = await prisma.paymentAttempt.findUnique({ where: { idempotencyKey } });
  if (existingAttempt) {
    const storedSession = decodeStoredSession(existingAttempt.checkoutSessionJson);
    if (existingAttempt.status === "pending" && existingAttempt.expiresAt > new Date() && storedSession) {
      return NextResponse.json({
        attemptId: existingAttempt.id,
        ...storedSession,
        buttonScriptUrl: getYappyButtonScriptUrl(),
      });
    }
    return NextResponse.json({ error: "Este intento ya termino. Inicia uno nuevo" }, { status: 409 });
  }

  const providerOrderId = createProviderOrderId();
  const amount = serializeMoney(order.amount);
  const expiresAt = new Date(Date.now() + 5 * 60_000);
  const attempt = await prisma.paymentAttempt.create({
    data: {
      orderId: order.id,
      provider: "yappy",
      providerOrderId,
      status: "created",
      amount: order.amount,
      currency: order.currency.toUpperCase(),
      idempotencyKey,
      expiresAt,
    },
  });

  try {
    const checkout = await createYappyCheckout({
      providerOrderId,
      aliasYappy,
      subtotal: amount,
      total: amount,
    });
    await prisma.$transaction([
      prisma.paymentAttempt.update({
        where: { id: attempt.id },
        data: {
          providerTransactionId: checkout.transactionId,
          status: "pending",
          checkoutSessionJson: encryptSensitiveValue(JSON.stringify(checkout)),
        },
      }),
      prisma.order.update({
        where: { id: order.id },
        data: {
          provider: "yappy",
          customerPhone: aliasYappy,
        },
      }),
    ]);

    return NextResponse.json({
      attemptId: attempt.id,
      ...checkout,
      buttonScriptUrl: getYappyButtonScriptUrl(),
    });
  } catch (error) {
    const failureCode = error instanceof YappyProviderError ? error.code : null;
    await prisma.paymentAttempt.update({
      where: { id: attempt.id },
      data: { status: "failed", failureCode: failureCode || "provider_error" },
    });

    if (error instanceof YappyConfigurationError) {
      return NextResponse.json({ error: "Yappy no esta disponible todavia" }, { status: 503 });
    }
    if (error instanceof YappyProviderError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: 502 });
    }
    return NextResponse.json({ error: "No se pudo iniciar el pago Yappy" }, { status: 502 });
  }
}
