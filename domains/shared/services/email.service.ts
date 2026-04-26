import { Resend } from "resend";
import { logger } from "@/lib/logger";

let resend: Resend | null = null;
if (process.env.RESEND_API_KEY) {
  resend = new Resend(process.env.RESEND_API_KEY);
}

export class EmailService {
  /**
   * Sends an email via Resend
   */
  static async send(to: string, subject: string, html: string, from?: string): Promise<{
    success: boolean;
    data?: unknown;
    error?: string;
    code?: string;
  }> {
    if (!resend) {
      const error = "Email provider not configured (missing RESEND_API_KEY)";
      logger.error(`[EmailService] ${error}`);
      return { 
        success: false, 
        error,
        code: "provider_missing"
      };
    }

    try {
      const result = await resend.emails.send({
        from: from || process.env.RESEND_FROM_EMAIL || "PreRescate PTY <soporte@prerescatepty.com>",
        to,
        subject,
        html,
      });

      if (result.error) {
        logger.error("[EmailService] provider returned error:", result.error.message);
        return { success: false, error: result.error.message };
      }

      return { success: true, data: result.data };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error("[EmailService] error:", errorMessage);
      return { success: false, error: errorMessage };
    }
  }
}
