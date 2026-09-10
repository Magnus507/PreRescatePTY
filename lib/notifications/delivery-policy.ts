export const RESCUE_NOTIFICATION_DELIVERY_POLICY = {
  mode: "manual_whatsapp",
  automatedDeliveryEnabled: false,
} as const;

export type RescueNotificationDeliveryMode =
  (typeof RESCUE_NOTIFICATION_DELIVERY_POLICY)["mode"];
