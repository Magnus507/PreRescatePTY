import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { mockPrisma } from "../helpers/mock-prisma";
import { resetAllMocks } from "../helpers/reset-mocks";

const mockAfter = vi.hoisted(() => vi.fn());
const mockRateLimit = vi.hoisted(() => vi.fn());
const mockGetClientIp = vi.hoisted(() => vi.fn());
const mockResolve = vi.hoisted(() => vi.fn());
const mockQueue = vi.hoisted(() => vi.fn());

vi.mock("next/server", async () => {
  const actual = await vi.importActual<typeof import("next/server")>("next/server");
  return { ...actual, after: mockAfter };
});
vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/lib/rateLimit", () => ({ rateLimit: mockRateLimit }));
vi.mock("@/lib/request-ip", () => ({ getClientIp: mockGetClientIp }));
vi.mock("@/lib/public-access/resolve-public-profile-by-chip", () => ({
  resolvePublicProfileByChipShortCode: mockResolve,
}));
vi.mock("@/lib/emergency-alerts", () => ({
  queueEmergencyNotificationsFromScan: mockQueue,
  processPendingEmergencyNotifications: vi.fn(),
}));

import { POST } from "@/app/api/public/[shortCode]/scan/[scanId]/notify/route";

describe("POST /api/public/[shortCode]/scan/[scanId]/notify", () => {
  beforeEach(() => {
    resetAllMocks();
    mockAfter.mockReset();
    mockRateLimit.mockResolvedValue({ allowed: true });
    mockGetClientIp.mockReturnValue("127.0.0.1");
    mockResolve.mockResolvedValue({
      ok: true,
      chip: { id: "chip-1", shortCode: "SC-123" },
      profile: { id: "profile-1", firstName: "Ana", lastName: "López", displayNamePublic: "Ana López" },
    });
    mockPrisma.scanEvent.findUnique.mockResolvedValue({
      id: "scan-1",
      chipId: "chip-1",
      profileId: "profile-1",
      accountId: "account-1",
    } as never);
    mockPrisma.$transaction.mockImplementation(async (callback: (tx: typeof mockPrisma) => Promise<unknown>) => callback(mockPrisma));
    mockQueue.mockResolvedValue({ status: "pending", queued: 1, disabled: 0, reason: "queued" });
  });

  it("queues a manual alert for the matching scan", async () => {
    const response = await POST(new NextRequest("http://localhost/api/public/SC-123/scan/scan-1/notify", { method: "POST" }), {
      params: Promise.resolve({ shortCode: "SC-123", scanId: "scan-1" }),
    });

    expect(response.status).toBe(200);
    expect(mockQueue).toHaveBeenCalledWith(
      mockPrisma,
      expect.objectContaining({ scanEventId: "scan-1", trigger: "manual" })
    );
    expect(mockAfter).toHaveBeenCalledOnce();
  });

  it("rejects a scan that belongs to another chip", async () => {
    mockPrisma.scanEvent.findUnique.mockResolvedValue({
      id: "scan-1",
      chipId: "other-chip",
      profileId: "profile-1",
      accountId: "account-1",
    } as never);

    const response = await POST(new NextRequest("http://localhost/api/public/SC-123/scan/scan-1/notify", { method: "POST" }), {
      params: Promise.resolve({ shortCode: "SC-123", scanId: "scan-1" }),
    });

    expect(response.status).toBe(404);
    expect(mockQueue).not.toHaveBeenCalled();
  });
});
