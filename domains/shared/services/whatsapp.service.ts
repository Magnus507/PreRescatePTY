import twilio from "twilio";
import { logger } from "@/lib/logger";

export class WhatsappService {
  private static getClient() {
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      return twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    }
    return null;
  }

  /**
   * Sends a Whatsapp message via Twilio
   * Note: Twilio WhatsApp requires the 'whatsapp:' prefix for numbers.
   */
  static async send(to: string, message: string): Promise<{
    success: boolean;
    message?: string;
    error?: string;
    code?: string;
  }> {
    const client = this.getClient();
    const from = process.env.TWILIO_WHATSAPP_NUMBER;

    if (!client || !from) {
      const error = "WhatsApp provider not configured (missing TWILIO_ACCOUNT_SID, AUTH_TOKEN or WHATSAPP_NUMBER)";
      logger.error(`[WhatsappService] ${error}`);
      return { 
        success: false, 
        error,
        code: "provider_missing" 
      };
    }

    try {
      // Ensure the 'to' number has the whatsapp: prefix if not already present
      const formattedTo = to.startsWith("whatsapp:") ? to : `whatsapp:${to}`;
      // Ensure the 'from' number has the whatsapp: prefix
      const formattedFrom = from.startsWith("whatsapp:") ? from : `whatsapp:${from}`;

      const response = await client.messages.create({
        body: message,
        from: formattedFrom,
        to: formattedTo,
      });

      return { success: true, message: response.sid };
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      logger.error("[WhatsappService] Twilio Error:", errorMessage);
      return { 
        success: false, 
        error: errorMessage,
        code: "provider_error"
      };
    }
  }
}
