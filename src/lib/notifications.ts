/**
 * PreRescate PTY — Notification Service
 *
 * Uses Resend for email if RESEND_API_KEY is set in env.
 * Falls back to console.log in development.
 *
 * To enable real emails:
 *   1. Add RESEND_API_KEY to your .env.local / Vercel environment
 *   2. Add RESEND_FROM_EMAIL (e.g. "PreRescate PTY <alertas@prerescatepty.com>")
 *   3. Verify your domain in resend.com
 */

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "PreRescate PTY <noreply@prerescatepty.com>";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://prerescatepty.com";

export interface EmergencyNotificationData {
  recipient: string;
  type: "email" | "sms" | "whatsapp";
  profileName: string;
  location?: { lat: number; lng: number };
  shortCode: string;
  notificationId: string;
}

/**
 * Sends an emergency notification via the configured channel.
 * Returns { success, providerResponse }.
 */
export async function sendEmergencyNotification(
  data: EmergencyNotificationData
): Promise<{ success: boolean; providerResponse?: string }> {
  const { recipient, type, profileName, location, shortCode, notificationId } = data;

  if (type === "email") {
    return sendEmergencyEmail({ recipient, profileName, location, shortCode, notificationId });
  }

  // SMS / WhatsApp — stub (integrate Twilio here when ready)
  console.log(`[notify] ${type.toUpperCase()} to ${recipient} for ${profileName} — not yet integrated`);
  return { success: false, providerResponse: "channel_not_configured" };
}

async function sendEmergencyEmail(data: {
  recipient: string;
  profileName: string;
  location?: { lat: number; lng: number };
  shortCode: string;
  notificationId: string;
}): Promise<{ success: boolean; providerResponse?: string }> {
  const { recipient, profileName, location, shortCode } = data;

  const profileUrl = `${SITE_URL}/e/${shortCode}`;
  const locationHtml = location
    ? `<p><strong>Ubicación GPS:</strong> <a href="https://maps.google.com/?q=${location.lat},${location.lng}">${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}</a></p>`
    : "";

  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:auto;padding:24px;border:1px solid #e5e7eb;border-radius:12px">
      <h2 style="color:#dc2626">🚨 Alerta de Emergencia — PreRescate PTY</h2>
      <p>El chip de <strong>${profileName}</strong> fue escaneado. Puede estar en una situación de emergencia.</p>
      ${locationHtml}
      <a href="${profileUrl}" style="display:inline-block;margin-top:16px;padding:12px 24px;background:#dc2626;color:#fff;border-radius:8px;text-decoration:none;font-weight:bold">
        Ver Perfil Médico
      </a>
      <hr style="margin:24px 0;border-color:#e5e7eb" />
      <p style="font-size:12px;color:#6b7280">PreRescate PTY — Sistema de identificación médica de emergencia.<br>
      Si esto fue un error, ignora este mensaje.</p>
    </div>
  `;

  if (!RESEND_API_KEY) {
    console.log(`[notify/email] RESEND_API_KEY not set. Would send to: ${recipient}`);
    console.log(`[notify/email] Subject: 🚨 Alerta de Emergencia — ${profileName}`);
    return { success: false, providerResponse: "resend_not_configured" };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: recipient,
        subject: `🚨 Alerta de Emergencia — ${profileName}`,
        html,
      }),
    });

    const json = await res.json() as { id?: string; error?: string };

    if (!res.ok) {
      console.error("[notify/email] Resend error:", json);
      return { success: false, providerResponse: JSON.stringify(json) };
    }

    return { success: true, providerResponse: json.id };
  } catch (err) {
    console.error("[notify/email] Fetch error:", err);
    return { success: false, providerResponse: String(err) };
  }
}

/**
 * Sends a transactional email (welcome, password reset, etc.).
 */
export async function sendTransactionalEmail(
  email: string,
  subject: string,
  html: string
): Promise<{ success: boolean }> {
  if (!RESEND_API_KEY) {
    console.log(`[notify/transactional] Would send "${subject}" to ${email}`);
    return { success: false };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: FROM_EMAIL, to: email, subject, html }),
    });
    return { success: res.ok };
  } catch {
    return { success: false };
  }
}
