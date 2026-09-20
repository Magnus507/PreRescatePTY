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
import { getAnnualRenewalPrice } from "@/domains/accounts/services/renewal-pricing";

const requestSchema = z.object({
  aliasYappy: z.string().trim().min(1).max(24),
});

function createProviderOrderId() {
  return `R${randomBytes(7).toString("hex")}`;
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

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const userId = session.user.id;
  const limiter = await rateLimit("yappy-renewal-session", userId, { limit: 8, windowMs: 60_000 });
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

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { accountId: true, status: true },
  });
  if (!user?.accountId || user.status !== "active") {
    return NextResponse.json({ error: "Cuenta no disponible para renovacion" }, { status: 409 });
  }

  const requestKey = req.headers.get("idempotency-key")?.trim() || randomUUID();
  if (requestKey.length > 128) {
    return NextResponse.json({ error: "Solicitud invalida" }, { status: 400 });
  }
  const idempotencyKey = `renewal:yappy:${userId}:${user.accountId}:${requestKey}`;
  const existing = await prisma.renewalPayment.findUnique({ where: { idempotencyKey } });
  if (existing) {
    const storedSession = decodeStoredSession(existing.checkoutSessionJson);
    if (existing.status === "succeeded") {
      return NextResponse.json({ paid: true, paymentId: existing.id });
    }
    if (existing.status === "pending" && existing.expiresAt && existing.expiresAt > new Date() && storedSession) {
      return NextResponse.json({
        paymentId: existing.id,
        ...storedSession,
        buttonScriptUrl: getYappyButtonScriptUrl(),
      });
    }
    return NextResponse.json({ error: "Este intento ya termino. Inicia uno nuevo" }, { status: 409 });
  }

  // Reuse any still-live pending checkout for this account even when the browser
  // sends a different request id. This prevents a second click/tab from opening
  // another payable Yappy session while one is already active.
  const livePending = await prisma.renewalPayment.findFirst({
    where: {
      accountId: user.accountId,
      provider: "yappy",
      status: "pending",
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });
  if (livePending) {
    const storedSession = decodeStoredSession(livePending.checkoutSessionJson);
    if (storedSession) {
      return NextResponse.json({
        paymentId: livePending.id,
        ...storedSession,
        buttonScriptUrl: getYappyButtonScriptUrl(),
      });
    }
  }

  const amount = getAnnualRenewalPrice();
  const providerOrderId = createProviderOrderId();
  const expiresAt = new Date(Date.now() + 5 * 60_000);
  const payment = await prisma.renewalPayment.create({
    data: {
      accountId: user.accountId,
      provider: "yappy",
      amount,
      currency: "USD",
      status: "created",
      requestId: providerOrderId,
      idempotencyKey,
      expiresAt,
    },
  });

  try {
    const serializedAmount = serializeMoney(amount);
    const checkout = await createYappyCheckout({
      providerOrderId,
      aliasYappy,
      subtotal: serializedAmount,
      total: serializedAmount,
    });

    await prisma.renewalPayment.update({
      where: { id: payment.id },
      data: {
        providerTransactionId: checkout.transactionId,
        status: "pending",
        checkoutSessionJson: encryptSensitiveValue(JSON.stringify(checkout)),
      },
    });

    return NextResponse.json({
      paymentId: payment.id,
      amount: serializedAmount,
      ...checkout,
      buttonScriptUrl: getYappyButtonScriptUrl(),
    });
  } catch (error) {
    const failureCode = error instanceof YappyProviderError ? error.code : null;
    await prisma.renewalPayment.update({
      where: { id: payment.id },
      data: { status: "failed", failureCode: failureCode || "provider_error" },
    });

    if (error instanceof YappyConfigurationError) {
      return NextResponse.json({ error: "Yappy no esta disponible todavia" }, { status: 503 });
    }
    if (error instanceof YappyProviderError) {
      return NextResponse.json(
        { error: "Yappy no pudo iniciar el pago en este momento", code: error.code || "provider_error" },
        { status: 502 }
      );
    }
    return NextResponse.json({ error: "No se pudo iniciar el pago Yappy" }, { status: 502 });
  }
}
