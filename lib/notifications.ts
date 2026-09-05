/**
 * PreRescue ID PTY — Notification Service
 *
 * Uses Resend for email if RESEND_API_KEY is set in env.
 * Falls back to console.log in development.
 *
 * To enable real emails:
 *   1. Add RESEND_API_KEY to your .env.local / Vercel environment
 *   2. Add RESEND_FROM_EMAIL (e.g. "PreRescue ID PTY <alertas@PreRescue IDpty.com>")
 *   3. Verify your domain in resend.com
 */

import { EmailService } from "@/domains/shared/services/email.service";
import { SmsService } from "@/domains/shared/services/sms.service";
import { WhatsappService } from "@/domains/shared/services/whatsapp.service";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.prerescatepty.com";

export interface EmergencyNotificationData {
  recipient: string;
  type: "email" | "sms" | "whatsapp";
  profileName: string;
  shortCode: string;
  notificationId: string;
  idempotencyKey: string;
}

export async function sendEmergencyNotification(
  data: EmergencyNotificationData
): Promise<{ success: boolean; providerResponse?: string; retrySafe?: boolean }> {
  const { recipient, type, profileName, shortCode, idempotencyKey } = data;
  const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);
  const profileUrl = `${SITE_URL}/e/${encodeURIComponent(shortCode)}`;
  const minimalMessage = `Se registró un escaneo de emergencia asociado a ${profileName}. Revisa el enlace seguro para más información: ${profileUrl}`;

  if (type === "email") {
    const html = `
      <div style="font-family:sans-serif;max-width:600px;margin:auto;padding:24px;border:1px solid #e5e7eb;border-radius:12px">
        <h2 style="color:#dc2626">🚨 Alerta de Emergencia — PreRescue ID PTY</h2>
        <p>${escapeHtml(minimalMessage)}</p>
        <a href="${escapeHtml(profileUrl)}" style="display:inline-block;margin-top:16px;padding:12px 24px;background:#dc2626;color:#fff;border-radius:8px;text-decoration:none;font-weight:bold">
          Ver Perfil Médico
        </a>
      </div>
    `;
    const res = await EmailService.send(
      recipient,
      `🚨 Alerta de Emergencia — ${profileName}`,
      html,
      undefined,
      { idempotencyKey }
    );
    // res.data is from Resend: { id: string }
    const resData = res.data as { id: string } | null;
    const providerResponse = res.success ? resData?.id : res.error;
    return { success: res.success, providerResponse };
  }

  if (type === "sms") {
    const msg = `🚨 Alerta de emergencia: ${profileName}. ${profileUrl}`;
    const res = await SmsService.send(recipient, msg);
    return { success: res.success, providerResponse: res.data?.sid || res.error, retrySafe: res.retrySafe };
  }

  if (type === "whatsapp") {
    const msg = `🚨 Alerta de emergencia: ${profileName}. ${profileUrl}`;
    const res = await WhatsappService.send(recipient, msg);
    return { success: res.success, providerResponse: res.message || res.error, retrySafe: res.retrySafe };
  }

  return { success: false, providerResponse: "unknown_type" };
}

export async function sendTransactionalEmail(
  email: string,
  subject: string,
  html: string
): Promise<{ success: boolean }> {
  const res = await EmailService.send(email, subject, html);
  return { success: res.success };
}
