/**
 * PreRescate PTY - Notification Service
 * Integrates with Resend for emails and can be expanded for SMS/WhatsApp
 */

export async function sendEmergencyNotification(data: {
  recipient: string;
  type: "email" | "sms" | "whatsapp";
  userName: string;
  location?: { lat: number; lng: number };
  shortCode: string;
}) {
  const { recipient, type, userName, location, shortCode } = data;
  
  if (type === "email") {
    console.log(`[MOCK NOTIF] Sending emergency email to ${recipient} for user ${userName}`);
    // In production:
    // const resend = new Resend(process.env.RESEND_API_KEY);
    // await resend.emails.send({ ... });
  } else if (type === "sms") {
    console.log(`[MOCK NOTIF] Sending emergency SMS to ${recipient}`);
  }

  return { success: true, timestamp: new Date().toISOString() };
}

/**
 * Sends a welcome email or password reset
 */
export async function sendTransactionalEmail(email: string, subject: string, body: string) {
  console.log(`[MOCK NOTIF] Sending transactional email to ${email}: ${subject}`);
  return { success: true };
}
