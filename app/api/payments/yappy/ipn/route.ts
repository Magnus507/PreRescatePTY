import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { enqueueStoredCommerceOrderSyncOutbox } from "@/lib/operations/commerce-order-sync-outbox";
import { InvoiceService } from "@/domains/invoices/services/invoice.service";
import { verifyYappyIpnSignature, YappyConfigurationError } from "@/lib/payments/yappy";
import { prisma } from "@/lib/prisma";
import { grantForConfirmedRenewalPayment } from "@/domains/accounts/services/service-entitlement.service";
import { AccountStateService } from "@/domains/accounts/services/account-state.service";

const ipnSchema = z.object({
  orderId: z.string().regex(/^[A-Za-z0-9]{1,15}$/),
  status: z.enum(["E", "R", "C", "X"]),
  hash: z.string().regex(/^[A-Fa-f0-9]{64}$/),
  domain: z.string().url().max(255),
});

const attemptStatus = {
  E: "succeeded",
  R: "rejected",
  C: "cancelled",
  X: "expired",
} as const;

export async function GET(req: NextRequest) {
  const parsed = ipnSchema.safeParse(Object.fromEntries(req.nextUrl.searchParams.entries()));
  if (!parsed.success) {
    return NextResponse.json({ success: false }, { status: 400 });
  }

  let signatureValid = false;
  try {
    signatureValid = verifyYappyIpnSignature(parsed.data);
  } catch (error) {
    if (error instanceof YappyConfigurationError) {
      return NextResponse.json({ success: false }, { status: 503 });
    }
    throw error;
  }
  if (!signatureValid) {
    return NextResponse.json({ success: false }, { status: 401 });
  }

  const attempt = await prisma.paymentAttempt.findUnique({
    where: { providerOrderId: parsed.data.orderId },
    select: {
      id: true,
      orderId: true,
      order: { select: { packageId: true } },
    },
  });
  const renewalPayment = attempt
    ? null
    : await prisma.renewalPayment.findUnique({
        where: { requestId: parsed.data.orderId },
        select: {
          id: true,
          accountId: true,
          status: true,
        },
      });

  if (!attempt && !renewalPayment) {
    return NextResponse.json({ success: false }, { status: 404 });
  }

  const providerEventId = createHash("sha256")
    .update(`yappy:${parsed.data.orderId}:${parsed.data.status}:${parsed.data.domain}:${parsed.data.hash}`)
    .digest("hex");

  if (renewalPayment) {
    const existingRenewalEvent = await prisma.renewalPaymentEvent.findUnique({
      where: { idempotencyKey: providerEventId },
    });
    if (existingRenewalEvent) {
      return NextResponse.json({ success: true });
    }

    try {
      await prisma.$transaction(async (tx) => {
        await tx.renewalPaymentEvent.create({
          data: {
            paymentId: renewalPayment.id,
            eventType: `yappy.${attemptStatus[parsed.data.status]}`,
            payloadHash: providerEventId,
            normalizedPayloadJson: {
              orderId: parsed.data.orderId,
              status: parsed.data.status,
              domain: parsed.data.domain,
            },
            signatureVerified: true,
            idempotencyKey: providerEventId,
          },
        });

        const currentPayment = await tx.renewalPayment.findUnique({
          where: { id: renewalPayment.id },
          select: { status: true, accountId: true },
        });
        if (!currentPayment) throw new Error("RENEWAL_PAYMENT_NOT_FOUND");

        const shouldKeepSuccess = currentPayment.status === "succeeded" && parsed.data.status !== "E";
        if (shouldKeepSuccess) return;

        await tx.renewalPayment.update({
          where: { id: renewalPayment.id },
          data: {
            status: attemptStatus[parsed.data.status],
            confirmedAt: parsed.data.status === "E" ? new Date() : null,
          },
        });

        if (parsed.data.status === "E") {
          await grantForConfirmedRenewalPayment(tx, {
            accountId: currentPayment.accountId,
            paymentId: renewalPayment.id,
          });
        }
      });
    } catch (error) {
      const duplicateEvent = await prisma.renewalPaymentEvent.findUnique({
        where: { idempotencyKey: providerEventId },
      });
      if (!duplicateEvent) throw error;
    }

    if (parsed.data.status === "E") {
      const users = await prisma.user.findMany({
        where: { accountId: renewalPayment.accountId },
        select: { id: true },
      });
      await Promise.all(users.map((user) => AccountStateService.invalidateCache(user.id)));
    }

    return NextResponse.json({ success: true });
  }
  const existingEvent = await prisma.paymentEvent.findUnique({ where: { providerEventId } });
  if (existingEvent) {
    return NextResponse.json({ success: true });
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.paymentEvent.create({
        data: {
          paymentAttemptId: attempt.id,
          providerEventId,
          eventType: `yappy.${attemptStatus[parsed.data.status]}`,
          payloadJson: JSON.stringify({
            orderId: parsed.data.orderId,
            status: parsed.data.status,
            domain: parsed.data.domain,
          }),
        },
      });

      const currentAttempt = await tx.paymentAttempt.findUnique({
        where: { id: attempt.id },
        select: { status: true },
      });
      if (!currentAttempt) throw new Error("PAYMENT_ATTEMPT_NOT_FOUND");

      const shouldKeepSuccess = currentAttempt.status === "succeeded" && parsed.data.status !== "E";
      if (shouldKeepSuccess) return;

      await tx.paymentAttempt.update({
        where: { id: attempt.id },
        data: {
          status: attemptStatus[parsed.data.status],
          confirmedAt: parsed.data.status === "E" ? new Date() : null,
        },
      });

      if (parsed.data.status === "E") {
        await tx.order.update({
          where: { id: attempt.orderId },
          data: {
            provider: "yappy",
            paymentMethod: "yappy",
            paymentStatus: "paid",
            orderStatus: "processing",
          },
        });
        await InvoiceService.ensurePendingForPaidOrder(tx, {
          orderId: attempt.orderId,
          sourcePaymentAttemptId: attempt.id,
        });
        const existingOperationalOrder = await tx.operationCommercialOrder.findFirst({
          where: {
            sourceId: attempt.orderId,
            sourceType: { in: ["checkout", "customer_request"] },
          },
          select: { sourceType: true },
        });
        const sourceType = existingOperationalOrder?.sourceType === "customer_request"
          ? "customer_request"
          : existingOperationalOrder?.sourceType === "checkout"
            ? "checkout"
            : attempt.order.packageId
              ? "customer_request"
              : "checkout";
        await enqueueStoredCommerceOrderSyncOutbox(tx, {
          orderId: attempt.orderId,
          sourceType,
          deduplicationSuffix: `payment-${providerEventId}`,
        });
      }
    });
  } catch (error) {
    const duplicateEvent = await prisma.paymentEvent.findUnique({ where: { providerEventId } });
    if (!duplicateEvent) throw error;
  }

  return NextResponse.json({ success: true });
}
