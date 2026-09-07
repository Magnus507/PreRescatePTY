import { beforeEach, describe, expect, it, vi } from "vitest";
import { mockPrisma } from "../helpers/mock-prisma";
import { resetAllMocks } from "../helpers/reset-mocks";

const mockSendEmergencyNotification = vi.hoisted(() => vi.fn());

vi.mock("@/lib/notifications", () => ({
  sendEmergencyNotification: mockSendEmergencyNotification,
}));

import {
  isEmergencyChannelConfigured,
  processPendingEmergencyNotifications,
  queueEmergencyNotificationsFromScan,
  recoverExpiredEmergencyNotificationLeases,
} from "@/lib/emergency-alerts";

const payload = {
  scanEventId: "scan-1",
  chipId: "chip-1",
  shortCode: "SC-123",
  profileId: "profile-1",
  profileName: "Ana López",
  publicUrl: "/e/SC-123",
  accountId: "account-1",
};

describe("retired emergency alert engine", () => {
  beforeEach(() => {
    resetAllMocks();
    mockSendEmergencyNotification.mockReset();
  });

  it.each(["email", "sms", "whatsapp"] as const)(
    "never reports the %s automatic provider as configured",
    (channel) => {
      process.env.RESEND_API_KEY = "should-not-matter";
      process.env.TWILIO_ACCOUNT_SID = "should-not-matter";
      process.env.TWILIO_AUTH_TOKEN = "should-not-matter";
      process.env.TWILIO_PHONE_NUMBER = "+15070000000";
      process.env.TWILIO_WHATSAPP_NUMBER = "whatsapp:+15070000000";

      expect(isEmergencyChannelConfigured(channel)).toBe(false);
    }
  );

  it("does not query, enqueue or mutate anything when an old caller asks to queue delivery", async () => {
    const result = await queueEmergencyNotificationsFromScan(mockPrisma, payload);

    expect(result).toEqual({
      status: "disabled",
      queued: 0,
      skipped: 0,
      disabled: 0,
      suppressed: 0,
      reason: "automatic_delivery_retired",
    });
    expect(mockPrisma.scanEvent.findUnique).not.toHaveBeenCalled();
    expect(mockPrisma.scanEvent.update).not.toHaveBeenCalled();
    expect(mockPrisma.notification.findFirst).not.toHaveBeenCalled();
    expect(mockPrisma.notification.create).not.toHaveBeenCalled();
    expect(mockPrisma.notification.updateMany).not.toHaveBeenCalled();
    expect(mockPrisma.consent.findFirst).not.toHaveBeenCalled();
    expect(mockSendEmergencyNotification).not.toHaveBeenCalled();
  });

  it("does not recover or rewrite historical processing leases", async () => {
    const result = await recoverExpiredEmergencyNotificationLeases(mockPrisma, {
      now: new Date("2026-09-07T00:00:00Z"),
    });

    expect(result).toEqual({ recovered: 0, deadLettered: 0 });
    expect(mockPrisma.notification.findMany).not.toHaveBeenCalled();
    expect(mockPrisma.notification.updateMany).not.toHaveBeenCalled();
  });

  it("does not claim, retry, mutate or send historical pending notifications", async () => {
    const result = await processPendingEmergencyNotifications(mockPrisma, {
      limit: 100,
      workerId: "retired-worker",
      now: new Date("2026-09-07T00:00:00Z"),
    });

    expect(result).toEqual({
      claimed: 0,
      sent: 0,
      failed: 0,
      skipped: 0,
      retrying: 0,
      disabled: 0,
      recoveredLeases: 0,
      deadLettered: 0,
    });
    expect(mockPrisma.notification.findMany).not.toHaveBeenCalled();
    expect(mockPrisma.notification.updateMany).not.toHaveBeenCalled();
    expect(mockPrisma.notification.update).not.toHaveBeenCalled();
    expect(mockPrisma.scanEvent.findUnique).not.toHaveBeenCalled();
    expect(mockSendEmergencyNotification).not.toHaveBeenCalled();
  });
});
