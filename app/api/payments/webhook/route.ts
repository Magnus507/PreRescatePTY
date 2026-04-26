import { NextRequest, NextResponse } from "next/server";
import { PaymentService } from "@/domains/shared/services/payment.service";
import { prisma } from "@/lib/prisma";
import Stripe from "stripe";

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
        console.warn("[Webhook] Missing userId or packageId in session metadata:", session.id);
        return NextResponse.json({ received: true, warning: "Missing metadata" });
      }

      // 1. Validate the user and package exist
      const [user, pkg] = await Promise.all([
        prisma.user.findUnique({ where: { id: userId }, select: { id: true, accountId: true } }),
        prisma.package.findUnique({ where: { id: packageId } }),
      ]);

      if (!user?.accountId || !pkg) {
        console.error("[Webhook] User or Package not found for payment:", { userId, packageId });
        return NextResponse.json({ received: true, error: "User or Package not found" });
      }

      // 2. Perform updates in a single transaction
      await prisma.$transaction([
        // Update the account: assign the purchased package
        prisma.account.update({
          where: { id: user.accountId },
          data: {
            packageId: pkg.id,
            accountType: pkg.accountType,
            maxChipsAllocated: pkg.maxChips,
            maxProfilesAllocated: pkg.maxProfiles,
            status: "active",
          },
        }),
        // Record the order in the DB for audit trail
        prisma.order.create({
          data: {
            userId,
            amount: (session.amount_total ?? 0) / 100, // Stripe uses cents
            currency: session.currency ?? "usd",
            paymentStatus: "paid",
            provider: "stripe",
            providerReference: (session.payment_intent as string) ?? session.id,
          },
        }),
      ]);

      console.log(`[Webhook] ✅ Package '${pkg.name}' activated for user ${userId} on account ${user.accountId}`);
    }

    return NextResponse.json({ received: true });
  } catch (err: unknown) {
    const error = err as Error;
    console.error("[Webhook] Error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
