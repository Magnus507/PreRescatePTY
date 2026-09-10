const FIFTEEN_MINUTES = 15 * 60 * 1000;
const TWENTY_SIX_HOURS = 26 * 60 * 60 * 1000;

type ReadinessInputs = {
  now: number;
  lastNotify: Date | null;
  lastCommerce: Date | null;
  lastExpiry: Date | null;
  oldestNotification: Date | null;
  oldestCommerceEvent: Date | null;
  oldestStorageCleanup: Date | null;
  notificationDeadLetters: number;
  commerceDeadLetters: number;
  storageDeadLetters: number;
  automatedNotificationDeliveryEnabled: boolean;
};

export function buildWorkerReadinessChecks(input: ReadinessInputs) {
  const {
    now,
    lastNotify,
    lastCommerce,
    lastExpiry,
    oldestNotification,
    oldestCommerceEvent,
    oldestStorageCleanup,
    notificationDeadLetters,
    commerceDeadLetters,
    storageDeadLetters,
    automatedNotificationDeliveryEnabled,
  } = input;

  return {
    notificationWorker: Boolean(lastNotify && now - lastNotify.getTime() <= FIFTEEN_MINUTES),
    commerceWorker: Boolean(lastCommerce && now - lastCommerce.getTime() <= FIFTEEN_MINUTES),
    expiryWorker: Boolean(lastExpiry && now - lastExpiry.getTime() <= TWENTY_SIX_HOURS),

    // Rescue delivery is currently manual-only. Historical/pending notification
    // rows must remain visible for audit, but they must not degrade worker
    // readiness while automated notification delivery is intentionally disabled.
    notificationQueueSla:
      !automatedNotificationDeliveryEnabled ||
      !oldestNotification ||
      now - oldestNotification.getTime() <= FIFTEEN_MINUTES,
    notificationDeadLetters:
      !automatedNotificationDeliveryEnabled || notificationDeadLetters === 0,

    commerceQueueSla:
      !oldestCommerceEvent ||
      now - oldestCommerceEvent.getTime() <= FIFTEEN_MINUTES,
    storageCleanupSla:
      !oldestStorageCleanup ||
      now - oldestStorageCleanup.getTime() <= TWENTY_SIX_HOURS,
    commerceDeadLetters: commerceDeadLetters === 0,
    storageDeadLetters: storageDeadLetters === 0,
  };
}
