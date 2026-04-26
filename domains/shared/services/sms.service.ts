import twilio from "twilio";
import { logger } from "@/lib/logger";

export class SmsService {
  private static getClient() {
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      return twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    }
    return null;
  }

  /**
   * Sends an SMS via Twilio
   */
  static async send(to: string, message: string) {
    const client = this.getClient();
    const from = process.env.TWILIO_PHONE_NUMBER;

    if (!client || !from) {
      const error = "SMS provider not configured (missing TWILIO_ACCOUNT_SID, AUTH_TOKEN or PHONE_NUMBER)";
      logger.error(`[SmsService] ${error}`);
      return { 
        success: false, 
        error,
        code: "provider_missing"
      };
    }

    try {
      const response = await client.messages.create({
        body: message,
        from: from,
        to,
      });
      return { success: true, data: response };
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      logger.error("[SmsService] Twilio Error:", errorMessage);
      return { 
        success: false, 
        error: errorMessage,
        code: "provider_error"
      };
    }
  }
}
