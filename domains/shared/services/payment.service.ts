import Stripe from "stripe";
import { logger } from "@/lib/logger";

function getStripeClient() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("Missing STRIPE_SECRET_KEY");
  }

  return new Stripe(secretKey, {
    apiVersion: "2026-03-25.dahlia", // Matches latest stripe package type
  });
}

export class PaymentService {
  /**
   * Create Stripe Checkout Session
   * Captures immutable financial snapshot in Stripe metadata:
   * - expected_amount_cents: integer cents derived from DB price
   * - expected_currency: lowercase currency string
   * - package_version: package updatedAt for price-change detection
   */
  static async createCheckoutSession(
    userId: string,
    planName: string,
    priceAmount: number,
    successUrl: string,
    cancelUrl: string,
    packageId: string,
    packageVersion?: string
  ) {
    const stripe = getStripeClient();
    const expectedAmountCents = Math.round(priceAmount * 100);
    const expectedCurrency = "usd";

    try {
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: expectedCurrency,
              product_data: {
                name: `Plan ${planName} - PreRescue ID`,
                description: `Suscripción al plan ${planName}`,
              },
              unit_amount: expectedAmountCents,
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        success_url: successUrl,
        cancel_url: cancelUrl,
        client_reference_id: userId,
        metadata: {
          packageId,
          expected_amount_cents: String(expectedAmountCents),
          expected_currency: expectedCurrency,
          package_version: packageVersion || new Date().toISOString(),
        },
      });

      return { url: session.url };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error("Stripe Checkout Error:", errorMessage);
      throw new Error("No se pudo crear la sesión de pago.");
    }
  }

  /**
   * Handling Stripe Webhooks
   */
  static async handleWebhook(body: string, signature: string) {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      throw new Error("Missing STRIPE_WEBHOOK_SECRET");
    }

    try {
      const stripe = getStripeClient();
      const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
      logger.info("Stripe Event Success:", event.type);
      return event;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      logger.error("Webhook signature verification failed:", errorMessage);
      throw new Error(`Error de verificación de webhook: ${errorMessage}`);
    }
  }
}
