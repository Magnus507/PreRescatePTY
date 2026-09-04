import { beforeEach, describe, expect, it, vi } from "vitest";
import { mockPrisma } from "../helpers/mock-prisma";
import { resetAllMocks } from "../helpers/reset-mocks";

const mockSendEmergencyNotification = vi.hoisted(() => vi.fn());

vi.mock("@/lib/notifications", () => ({
  sendEmergencyNotification: mockSendEmergencyNotification,
}));

import {
  processPendingEmergencyNotifications,
  queueEmergencyNotificationsFromScan,
  recoverExpiredEmergencyNotificationLeases,
} from "@/lib/emergency-alerts";

function baseProfile(overrides: Record<string, unknown> = {}) {
  return {
    id: "profile-1",
    firstName: "Ana",
    lastName: "López",
    displayNamePublic: "Ana López",
    profileVisibilityStatus: "active",
    contacts: [
      {
        id: "pc-1",
        active: true,
        priorityOrder: 1,
        notifyEmail: true,
        notifySms: false,
        notifyWhatsapp: false,
        contact: {
          fullName: "María",
          phone: "+507 6000-0000",
          email: "maria@example.com",
        },
      },
    ],
    ...overrides,
  };
}

function baseScan(overrides: Record<string, unknown> = {}) {
  return {
    id: "scan-1",
    chipId: "chip-1",
    profileId: "profile-1",
    accountId: "account-1",
    scannedAt: new Date(),
    notificationStatus: "pending",
    chip: {
      shortCode: "SC-123",
      assignedProfile: baseProfile(),
    },
    ...overrides,
  };
}

describe("emergency alerts helpers", () => {
  beforeEach(() => {
    resetAllMocks();
    mockSendEmergencyNotification.mockReset();
    delete process.env.RESEND_API_KEY;
    delete process.env.RESEND_FROM_EMAIL;
    delete process.env.TWILIO_ACCOUNT_SID;
    delete process.env.TWILIO_AUTH_TOKEN;
    delete process.env.TWILIO_PHONE_NUMBER;
    delete process.env.TWILIO_WHATSAPP_NUMBER;
    delete process.env.TWILIO_WHATSAPP_FROM;
  });

  it("queues pending notifications when consent exists and providers are configured", async () => {
    process.env.RESEND_API_KEY = "resend-test";
    mockPrisma.scanEvent.findUnique.mockResolvedValue(baseScan() as never);
    mockPrisma.consent.findFirst.mockResolvedValue({ id: "consent-1" } as never);
    mockPrisma.notification.findFirst.mockResolvedValue(null as never);
    mockPrisma.notification.create.mockResolvedValue({
      id: "notification-1",
      eventId: "scan-1",
      channel: "email",
      recipient: "maria@example.com",
      status: "pending",
      providerResponse: null,
      sentAt: null,
      createdAt: new Date(),
    } as never);
    mockPrisma.scanEvent.update.mockResolvedValue({ id: "scan-1", notificationStatus: "pending" } as never);

    const result = await queueEmergencyNotificationsFromScan(mockPrisma, {
      scanEventId: "scan-1",
      chipId: "chip-1",
      shortCode: "SC-123",
      profileId: "profile-1",
      profileName: "Ana López",
      publicUrl: "/e/SC-123",
      accountId: "account-1",
    });

    expect(result.status).toBe("pending");
    expect(result.queued).toBe(1);
    expect(mockPrisma.consent.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ consentType: "automatic_emergency_alerts", revokedAt: null }),
      })
    );
    expect(mockPrisma.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          eventId: "scan-1",
          channel: "email",
          recipient: "maria@example.com",
          status: "pending",
        }),
      })
    );
    expect(mockPrisma.scanEvent.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "scan-1" },
        data: { notificationStatus: "pending" },
      })
    );
  });

  it("marks the scan as skipped when consent is missing", async () => {
    mockPrisma.scanEvent.findUnique.mockResolvedValue(baseScan() as never);
    mockPrisma.consent.findFirst.mockResolvedValue(null as never);

    const result = await queueEmergencyNotificationsFromScan(mockPrisma, {
      scanEventId: "scan-1",
      chipId: "chip-1",
      shortCode: "SC-123",
      profileId: "profile-1",
      profileName: "Ana López",
      publicUrl: "/e/SC-123",
      accountId: "account-1",
    });

    expect(result.status).toBe("skipped");
    expect(result.reason).toBe("consent_missing");
    expect(mockPrisma.notification.create).not.toHaveBeenCalled();
    expect(mockPrisma.scanEvent.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "scan-1" },
        data: { notificationStatus: "skipped" },
      })
    );
  });

  it("queues a manual alert without requiring automatic-alert consent", async () => {
    process.env.RESEND_API_KEY = "resend-test";
    mockPrisma.scanEvent.findUnique.mockResolvedValue(baseScan() as never);
    mockPrisma.notification.findFirst.mockResolvedValue(null as never);
    mockPrisma.notification.create.mockResolvedValue({ id: "notification-1" } as never);
    mockPrisma.scanEvent.update.mockResolvedValue({ id: "scan-1", notificationStatus: "pending" } as never);

    const result = await queueEmergencyNotificationsFromScan(mockPrisma, {
      scanEventId: "scan-1",
      chipId: "chip-1",
      shortCode: "SC-123",
      profileId: "profile-1",
      profileName: "Ana López",
      publicUrl: "/e/SC-123",
      accountId: "account-1",
      trigger: "manual",
    });

    expect(result.status).toBe("pending");
    expect(mockPrisma.consent.findFirst).not.toHaveBeenCalled();
    expect(mockPrisma.notification.create).toHaveBeenCalled();
  });

  it("records but suppresses repeated automatic alerts during the chip/contact/channel cooldown", async () => {
    process.env.RESEND_API_KEY = "resend-test";
    mockPrisma.scanEvent.findUnique.mockResolvedValue(baseScan({ id: "scan-2" }) as never);
    mockPrisma.consent.findFirst.mockResolvedValue({ id: "consent-1" } as never);
    mockPrisma.notification.findFirst
      .mockResolvedValueOnce(null as never)
      .mockResolvedValueOnce({
        id: "notification-previous",
        status: "sent",
        providerResponse: null,
      } as never);
    mockPrisma.notification.create.mockResolvedValue({ id: "notification-suppressed" } as never);
    mockPrisma.scanEvent.update.mockResolvedValue({ id: "scan-2", notificationStatus: "suppressed" } as never);

    const result = await queueEmergencyNotificationsFromScan(mockPrisma, {
      scanEventId: "scan-2",
      chipId: "chip-1",
      shortCode: "SC-123",
      profileId: "profile-1",
      profileName: "Ana López",
      publicUrl: "/e/SC-123",
      accountId: "account-1",
    });

    expect(result).toMatchObject({ status: "suppressed", queued: 0, suppressed: 1, reason: "cooldown" });
    expect(mockPrisma.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          eventId: "scan-2",
          status: "suppressed",
          providerResponse: expect.stringContaining('"reason":"cooldown"'),
        }),
      })
    );
  });

  it("processes pending notifications and marks them sent", async () => {
    process.env.RESEND_API_KEY = "resend-test";
    mockSendEmergencyNotification.mockResolvedValue({
      success: true,
      providerResponse: "resend-message-id",
    });

    mockPrisma.notification.findMany
      .mockResolvedValueOnce([] as never)
      .mockResolvedValueOnce([
      {
        id: "notification-1",
        eventId: "scan-1",
        channel: "email",
        recipient: "maria@example.com",
        status: "pending",
        idempotencyKey: "emergency:scan-1:chip-1:email:recipient",
        attempts: 0,
        availableAt: new Date(0),
        lockedAt: null,
        lockedBy: null,
        lastErrorCode: null,
        lastErrorMessage: null,
        providerResponse: JSON.stringify({ attempts: 0 }),
        sentAt: null,
        createdAt: new Date(),
      },
    ] as never);
    mockPrisma.notification.updateMany.mockResolvedValue({ count: 1 } as never);
    mockPrisma.notification.update.mockResolvedValue({
      id: "notification-1",
      eventId: "scan-1",
      channel: "email",
      recipient: "maria@example.com",
      status: "sent",
      providerResponse: JSON.stringify({ attempts: 1, providerSuccess: true }),
      sentAt: new Date(),
      createdAt: new Date(),
    } as never);
    mockPrisma.scanEvent.findUnique.mockResolvedValue(baseScan() as never);

    const result = await processPendingEmergencyNotifications(mockPrisma, { limit: 10 });

    expect(result.sent).toBe(1);
    expect(mockSendEmergencyNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        recipient: "maria@example.com",
        type: "email",
        shortCode: "SC-123",
        idempotencyKey: "emergency:scan-1:chip-1:email:recipient",
      })
    );
    expect(mockPrisma.notification.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: "notification-1", status: "processing" }),
        data: expect.objectContaining({
          status: "sent",
          sentAt: expect.any(Date),
        }),
      })
    );
  });

  it("retries temporary provider failures", async () => {
    process.env.RESEND_API_KEY = "resend-test";
    mockSendEmergencyNotification.mockResolvedValue({
      success: false,
      providerResponse: "timeout while sending",
    });

    mockPrisma.notification.findMany
      .mockResolvedValueOnce([] as never)
      .mockResolvedValueOnce([
      {
        id: "notification-1",
        eventId: "scan-1",
        channel: "email",
        recipient: "maria@example.com",
        status: "pending",
        idempotencyKey: "emergency:scan-1:chip-1:email:recipient",
        attempts: 1,
        availableAt: new Date(0),
        lockedAt: null,
        lockedBy: null,
        lastErrorCode: null,
        lastErrorMessage: null,
        providerResponse: JSON.stringify({ attempts: 1 }),
        sentAt: null,
        createdAt: new Date(),
      },
    ] as never);
    mockPrisma.notification.updateMany.mockResolvedValue({ count: 1 } as never);
    mockPrisma.notification.update.mockResolvedValue({
      id: "notification-1",
      eventId: "scan-1",
      channel: "email",
      recipient: "maria@example.com",
      status: "retrying",
      providerResponse: JSON.stringify({ attempts: 2 }),
      sentAt: null,
      createdAt: new Date(),
    } as never);
    mockPrisma.scanEvent.findUnique.mockResolvedValue(baseScan() as never);

    const result = await processPendingEmergencyNotifications(mockPrisma, { limit: 10 });

    expect(result.retrying).toBe(1);
    expect(mockPrisma.notification.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: "notification-1", status: "processing" }),
        data: expect.objectContaining({
          status: "retrying",
        }),
      })
    );
  });

  it("lets only one of two workers claim and send the same notification", async () => {
    process.env.RESEND_API_KEY = "resend-test";
    mockSendEmergencyNotification.mockResolvedValue({
      success: true,
      providerResponse: "resend-message-id",
    });

    const state = {
      id: "notification-race",
      eventId: "scan-1",
      chipId: "chip-1",
      channel: "email",
      recipient: "maria@example.com",
      status: "pending",
      idempotencyKey: "emergency:scan-1:chip-1:email:recipient",
      attempts: 0,
      availableAt: new Date(0),
      lockedAt: null as Date | null,
      lockedBy: null as string | null,
      lastErrorCode: null,
      lastErrorMessage: null,
      providerResponse: JSON.stringify({ attempts: 0 }),
      sentAt: null,
      createdAt: new Date(0),
    };

    mockPrisma.notification.findMany.mockImplementation(async (args: unknown) => {
      const where = (args as { where?: { status?: string | { in?: string[] } } }).where;
      if (where?.status === "processing") return [] as never;
      if (typeof where?.status === "object" && where.status.in?.includes(state.status)) {
        return [{ ...state }] as never;
      }
      return [] as never;
    });
    mockPrisma.notification.updateMany.mockImplementation(async (args: unknown) => {
      const input = args as {
        where: { status?: string | { in?: string[] }; lockedBy?: string };
        data: Record<string, unknown>;
      };
      const statusMatches = typeof input.where.status === "string"
        ? state.status === input.where.status
        : input.where.status?.in?.includes(state.status);
      const lockMatches = input.where.lockedBy === undefined || input.where.lockedBy === state.lockedBy;
      if (!statusMatches || !lockMatches) return { count: 0 } as never;
      if (input.data.status) state.status = String(input.data.status);
      if (input.data.lockedAt !== undefined) state.lockedAt = input.data.lockedAt as Date | null;
      if (input.data.lockedBy !== undefined) state.lockedBy = input.data.lockedBy as string | null;
      if (input.data.attempts && typeof input.data.attempts === "object") state.attempts += 1;
      return { count: 1 } as never;
    });
    mockPrisma.scanEvent.findUnique.mockResolvedValue(baseScan() as never);

    const now = new Date("2026-09-04T00:00:00Z");
    const [workerA, workerB] = await Promise.all([
      processPendingEmergencyNotifications(mockPrisma, { limit: 10, workerId: "worker-a", now }),
      processPendingEmergencyNotifications(mockPrisma, { limit: 10, workerId: "worker-b", now }),
    ]);

    expect(workerA.claimed + workerB.claimed).toBe(1);
    expect(mockSendEmergencyNotification).toHaveBeenCalledTimes(1);
  });

  it("recovers expired email leases and dead-letters ambiguous SMS leases", async () => {
    const lockedAt = new Date("2026-09-04T00:00:00Z");
    const rows = [
      { id: "email-1", channel: "email", status: "processing", lockedAt, lockedBy: "dead-a" },
      { id: "sms-1", channel: "sms", status: "processing", lockedAt, lockedBy: "dead-b" },
    ];
    mockPrisma.notification.findMany.mockResolvedValue(rows as never);
    mockPrisma.notification.updateMany.mockResolvedValue({ count: 1 } as never);

    const result = await recoverExpiredEmergencyNotificationLeases(mockPrisma, {
      now: new Date("2026-09-04T00:10:00Z"),
      leaseMs: 60_000,
    });

    expect(result).toEqual({ recovered: 1, deadLettered: 1 });
    expect(mockPrisma.notification.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "retrying" }) })
    );
    expect(mockPrisma.notification.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "dead_letter" }) })
    );
  });
});
