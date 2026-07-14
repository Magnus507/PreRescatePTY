import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { mockPrisma } from "../helpers/mock-prisma";
import { resetAllMocks } from "../helpers/reset-mocks";

const mockAfter = vi.hoisted(() => vi.fn());
const mockRateLimit = vi.hoisted(() => vi.fn());
const mockGetClientIp = vi.hoisted(() => vi.fn());
const mockResolvePublicProfileByChipShortCode = vi.hoisted(() => vi.fn());
const mockQueueEmergencyNotificationsFromScan = vi.hoisted(() => vi.fn());
const mockGetReverseGeocoding = vi.hoisted(() => vi.fn());

vi.mock("next/server", async () => {
  const actual = await vi.importActual<typeof import("next/server")>("next/server");
  return {
    ...actual,
    after: mockAfter,
  };
});

vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

vi.mock("@/lib/rateLimit", () => ({
  rateLimit: mockRateLimit,
}));

vi.mock("@/lib/request-ip", () => ({
  getClientIp: mockGetClientIp,
}));

vi.mock("@/lib/geocoding", () => ({
  getReverseGeocoding: mockGetReverseGeocoding,
}));

vi.mock("@/lib/public-access/resolve-public-profile-by-chip", () => ({
  resolvePublicProfileByChipShortCode: mockResolvePublicProfileByChipShortCode,
}));

vi.mock("@/lib/emergency-alerts", () => ({
  queueEmergencyNotificationsFromScan: mockQueueEmergencyNotificationsFromScan,
}));

import { POST } from "@/app/api/public/[shortCode]/scan/route";

function scanRequest(body: Record<string, unknown> = {}) {
  return new NextRequest("http://localhost/api/public/SC-123/scan", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

describe("POST /api/public/[shortCode]/scan", () => {
  beforeEach(() => {
    resetAllMocks();
    mockAfter.mockReset();
    mockRateLimit.mockReset();
    mockGetClientIp.mockReset();
    mockResolvePublicProfileByChipShortCode.mockReset();
    mockQueueEmergencyNotificationsFromScan.mockReset();
    mockGetReverseGeocoding.mockReset();
    mockPrisma.scanEvent.create.mockReset();
    mockPrisma.scanEvent.update.mockReset();
    mockPrisma.chip.update.mockReset();
    mockPrisma.$transaction.mockReset();

    mockRateLimit.mockResolvedValue({ allowed: true, resetAt: Date.now() + 60_000 } as never);
    mockGetClientIp.mockReturnValue("127.0.0.1");
    mockGetReverseGeocoding.mockResolvedValue({ address: null, city: null, country: null } as never);
    mockResolvePublicProfileByChipShortCode.mockResolvedValue({
      ok: true,
      reason: null,
      chip: { id: "chip-1", shortCode: "SC-123", accountId: "account-1" },
      profile: {
        id: "profile-1",
        firstName: "Ana",
        lastName: "López",
        displayNamePublic: "Ana López",
      },
      publicContext: {
        shortCode: "SC-123",
        chipId: "chip-1",
        profileId: "profile-1",
      },
    } as never);
    mockPrisma.$transaction.mockImplementation(async (callback: (tx: typeof mockPrisma) => Promise<unknown>) => {
      return callback(mockPrisma);
    });
    mockPrisma.scanEvent.create.mockResolvedValue({
      id: "scan-1",
      chipId: "chip-1",
      profileId: "profile-1",
      accountId: "account-1",
      notificationStatus: "pending",
    } as never);
    mockPrisma.chip.update.mockResolvedValue({ id: "chip-1" } as never);
    mockQueueEmergencyNotificationsFromScan.mockResolvedValue({
      status: "pending",
      queued: 1,
      skipped: 0,
      disabled: 0,
      reason: "queued",
    });
  });

  it("registers the scan and returns the notification summary", async () => {
    const res = await POST(scanRequest({ sourceType: "qr" }), {
      params: Promise.resolve({ shortCode: "SC-123" }),
    });
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.scanId).toBe("scan-1");
    expect(json.notificationStatus).toBe("pending");
    expect(json.notificationSummary.queued).toBe(1);
    expect(mockQueueEmergencyNotificationsFromScan).toHaveBeenCalledWith(
      mockPrisma,
      expect.objectContaining({
        scanEventId: "scan-1",
        chipId: "chip-1",
        profileId: "profile-1",
      })
    );
  });

  it("returns 429 when rate limit denies the request", async () => {
    mockRateLimit.mockResolvedValue({ allowed: false, resetAt: Date.now() + 30_000 } as never);

    const res = await POST(scanRequest({ sourceType: "qr" }), {
      params: Promise.resolve({ shortCode: "SC-123" }),
    });
    const json = await res.json();

    expect(res.status).toBe(429);
    expect(json.error).toMatch(/demasiadas/i);
  });
});
