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

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://prerescatepty.com";

export interface EmergencyNotificationData {
  recipient: string;
  type: "email" | "sms" | "whatsapp";
  profileName: string;
  location?: { lat: number; lng: number };
  shortCode: string;
  notificationId: string;
}

export async function sendEmergencyNotification(
  data: EmergencyNotificationData
): Promise<{ success: boolean; providerResponse?: string }> {
  const { recipient, type, profileName, location, shortCode } = data;
  const profileUrl = `${SITE_URL}/e/${shortCode}`;

  const locationMsg = location
    ? `\nUbicación GPS: https://maps.google.com/?q=${location.lat},${location.lng}`
    : "";

  if (type === "email") {
    const html = `
      <div style="font-family:sans-serif;max-width:600px;margin:auto;padding:24px;border:1px solid #e5e7eb;border-radius:12px">
        <h2 style="color:#dc2626">🚨 Alerta de Emergencia — PreRescue ID PTY</h2>
        <p>El chip de <strong>${profileName}</strong> fue escaneado. Puede estar en una situación de emergencia.</p>
        ${location ? `<p><strong>Ubicación GPS:</strong> <a href="https://maps.google.com/?q=${location.lat},${location.lng}">${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}</a></p>` : ""}
        <a href="${profileUrl}" style="display:inline-block;margin-top:16px;padding:12px 24px;background:#dc2626;color:#fff;border-radius:8px;text-decoration:none;font-weight:bold">
          Ver Perfil Médico
        </a>
      </div>
    `;
    const res = await EmailService.send(recipient, `🚨 Alerta de Emergencia — ${profileName}`, html);
    // res.data is from Resend: { id: string }
    const resData = res.data as { id: string } | null;
    const providerResponse = res.success ? resData?.id : res.error;
    return { success: res.success, providerResponse };
  }

  if (type === "sms") {
    const msg = `🚨 Alerta: El chip de ${profileName} fue escaneado. Ver perfil: ${profileUrl}${locationMsg}`;
    const res = await SmsService.send(recipient, msg);
    return { success: res.success, providerResponse: res.data?.sid || res.error };
  }

  if (type === "whatsapp") {
    const msg = `🚨 Alerta: El chip de ${profileName} fue escaneado.\nVer perfil: ${profileUrl}${locationMsg}`;
    const res = await WhatsappService.send(recipient, msg);
    return { success: res.success, providerResponse: res.message || res.error };
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
