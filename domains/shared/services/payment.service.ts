import Stripe from "stripe";
import { logger } from "@/lib/logger";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_mock_fallback", {
  apiVersion: "2026-03-25.dahlia", // Matches latest stripe package type
});

export class PaymentService {
  /**
   * Create Stripe Checkout Session
   */
  static async createCheckoutSession(userId: string, planName: string, priceAmount: number, successUrl: string, cancelUrl: string, packageId: string) {
    if (!process.env.STRIPE_SECRET_KEY) {
      if (process.env.NODE_ENV === "production") {
        throw new Error("Stripe provider not configured in production");
      }
      logger.warn("PaymentService createCheckoutSession => Mocking due to missing STRIPE_SECRET_KEY");
      return { url: `${successUrl}?mock_session_id=123` };
    }

    try {
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: `Plan ${planName} - PreRescue ID`,
                description: `Suscripción al plan ${planName}`,
              },
              unit_amount: Math.round(priceAmount * 100), // Stripe expects cents
            },
            quantity: 1,
          },
        ],
        mode: "payment", // Adjust to 'subscription' if using recurring Stripe logic
        success_url: successUrl,
        cancel_url: cancelUrl,
        client_reference_id: userId,
        metadata: { packageId }, // ← Required for webhook to know which plan to activate
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

