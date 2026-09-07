/**
 * RETIRED AUTOMATIC EMERGENCY DELIVERY COMPATIBILITY MODULE
 *
 * PreRescate no sends SMS, email or WhatsApp automatically. Rescue contact is
 * initiated explicitly by the rescuer from the public profile and WhatsApp is
 * opened client-side with a prefilled message that the rescuer must send.
 *
 * These exports intentionally remain as inert compatibility shims so an old
 * import cannot silently resurrect provider delivery. Historical Notification
 * and Consent rows are preserved in the database for audit purposes; this
 * module never reads, creates, claims, retries, mutates or sends them.
 */

export type EmergencyAlertChannel = "email" | "sms" | "whatsapp";
export type EmergencyNotificationStatus =
  | "pending"
  | "processing"
  | "sent"
  | "partially_sent"
  | "retrying"
  | "failed"
  | "dead_letter"
  | "skipped"
  | "suppressed"
  | "disabled";

export type EmergencyNotificationPayload = {
  scanEventId: string;
  chipId: string;
  shortCode: string;
  profileId: string;
  profileName: string;
  accountId?: string | null;
  publicUrl: string;
  location?: { lat: number; lng: number } | null;
  trigger?: "automatic" | "manual";
};

// Retained only for source compatibility with historical callers/tests.
export const EMERGENCY_NOTIFICATION_COOLDOWN_MS = 5 * 60_000;
export const EMERGENCY_NOTIFICATION_LEASE_MS = 5 * 60_000;
export const EMERGENCY_NOTIFICATION_MAX_ATTEMPTS = 5;
export const EMERGENCY_NOTIFICATION_RETRY_WINDOW_MS = 23 * 60 * 60_000;

/**
 * Historical helper retained for compatibility only. It is not delivered by
 * any server-side provider. New rescue contact copy lives in manual-whatsapp.
 */
export function buildEmergencyNotificationMessage(profileName: string, publicUrl: string) {
  return `Contacto manual de rescate para ${profileName}: ${publicUrl}`;
}

/** Automatic provider delivery is intentionally unavailable for every channel. */
export function isEmergencyChannelConfigured(_channel: EmergencyAlertChannel) {
  return false;
}

/**
 * No-op compatibility shim. In particular, it does not create Notification
 * rows or update ScanEvent.notificationStatus.
 */
export async function queueEmergencyNotificationsFromScan(
  _db: unknown,
  _payload: EmergencyNotificationPayload
) {
  return {
    status: "disabled" as EmergencyNotificationStatus,
    queued: 0,
    skipped: 0,
    disabled: 0,
    suppressed: 0,
    reason: "automatic_delivery_retired" as const,
  };
}

/**
 * No-op compatibility shim. Existing processing leases/rows are deliberately
 * left untouched so historical evidence is never rewritten by retired code.
 */
export async function recoverExpiredEmergencyNotificationLeases(
  _db: unknown,
  _options?: { limit?: number; now?: Date; leaseMs?: number }
) {
  return { recovered: 0, deadLettered: 0 };
}

/**
 * No-op compatibility shim. It never claims a row and therefore can never call
 * Resend, Twilio or any other notification provider.
 */
export async function processPendingEmergencyNotifications(
  _db: unknown,
  _options?: { limit?: number; workerId?: string; now?: Date }
) {
  return {
    claimed: 0,
    sent: 0,
    failed: 0,
    skipped: 0,
    retrying: 0,
    disabled: 0,
    recoveredLeases: 0,
    deadLettered: 0,
  };
}
