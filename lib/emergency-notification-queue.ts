/**
 * @deprecated Automatic emergency notifications are disabled by business rule.
 * Scans are recorded only; responders must use the public profile manual call
 * and WhatsApp actions.
 */
export async function processPendingEmergencyNotifications() {
  return {
    processed: 0,
    sent: 0,
    failed: 0,
    disabled: true,
    message: "Las notificaciones automáticas están deshabilitadas.",
  };
}
