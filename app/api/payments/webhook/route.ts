import { NextRequest, NextResponse } from "next/server";
import { PaymentService } from "@/domains/shared/services/payment.service";
import { prisma } from "@/lib/prisma";
import { generateOrderNumber } from "@/lib/order-number";
import Stripe from "stripe";
import { Prisma } from "@prisma/client";
import { ACCOUNT_TYPES } from "@/domains/shared/constants";
import { logger } from "@/lib/logger";

export async function POST(req: NextRequest) {
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "No signature" }, { status: 400 });
  }

  try {
    const bodyText = await req.text();
    const event = await PaymentService.handleWebhook(bodyText, signature);

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.client_reference_id;
      const packageId = session.metadata?.packageId;

      if (!userId || !packageId) {
        logger.warn("[Webhook] Missing userId or packageId in session metadata", session.id);
        return NextResponse.json({ received: true, warning: "Missing metadata" });
      }

      // ── Financial snapshot validation ────────────────────────────────
      const expectedAmountCentsStr = session.metadata?.expected_amount_cents;
      const expectedCurrency = session.metadata?.expected_currency;
      const amountTotal = session.amount_total;
      const sessionCurrency = session.currency;

      const expectedAmountCents = expectedAmountCentsStr
        ? Number(expectedAmountCentsStr)
        : NaN;

      const isAmountValid =
        expectedAmountCentsStr &&
        /^\d+$/.test(expectedAmountCentsStr) &&
        Number.isFinite(expectedAmountCents) &&
        expectedAmountCents >= 0 &&
        typeof amountTotal === 'number' &&
        amountTotal === expectedAmountCents;

      const isCurrencyValid =
        expectedCurrency &&
        sessionCurrency &&
        expectedCurrency.toLowerCase() === sessionCurrency.toLowerCase();

      if (!isAmountValid || !isCurrencyValid) {
        logger.error("[Webhook] Financial validation failed", {
          sessionId: session.id,
          userId,
          packageId,
          expectedAmountCents: expectedAmountCentsStr,
          receivedAmountCents: amountTotal,
          expectedCurrency,
          receivedCurrency: sessionCurrency,
        });
        return NextResponse.json({ received: true, warning: "Financial validation failed" });
      }

      // 1. Validate the user and package exist
      const [user, pkg] = await Promise.all([
        prisma.user.findUnique({ where: { id: userId }, select: { id: true, accountId: true } }),
        prisma.package.findUnique({ where: { id: packageId } }),
      ]);

      if (
        !user?.accountId ||
        !pkg ||
        !pkg.isActive ||
        ![ACCOUNT_TYPES.PERSONAL, ACCOUNT_TYPES.COMPANY].includes(pkg.accountType as "personal" | "company")
      ) {
        logger.error("[Webhook] User or Package not found for payment", { userId, packageId });
        return NextResponse.json({ received: true, error: "User or Package invalid" });
      }

      const providerReference =
        typeof session.payment_intent === "string" ? session.payment_intent : session.id;

      await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        const existingOrder = await tx.order.findFirst({
          where: {
            provider: "stripe",
            providerReference,
          },
          select: { id: true },
        });

        if (existingOrder) return;

        await tx.account.update({
          where: { id: user.accountId ?? undefined },
          data: {
            packageId: pkg.id,
            accountType: pkg.accountType,
            maxChipsAllocated: pkg.maxChips,
            maxProfilesAllocated: pkg.maxProfiles,
            status: "active",
          },
        });

        const orderNumber = await generateOrderNumber("stripe");

        await tx.order.create({
          data: {
            orderNumber,
            userId,
            amount: (session.amount_total ?? 0) / 100, // Stripe uses cents
            currency: session.currency ?? "usd",
            paymentMethod: "stripe",
            paymentStatus: "paid",
            orderStatus: "completed",
            provider: "stripe",
            providerReference,
          },
        });
      });

      logger.info(`[Webhook] ✅ Package '${pkg.name}' activated for user ${userId} on account ${user.accountId}`);
    }

    return NextResponse.json({ received: true });
  } catch (err: unknown) {
    const error = err as Error;
    logger.error("[Webhook] Error", error.message);
    return NextResponse.json({ error: "Error de verificación de webhook" }, { status: 400 });
  }
}
