import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  configFindMany: vi.fn(),
  notificationFindFirst: vi.fn(),
  notificationCount: vi.fn(),
  commerceFindFirst: vi.fn(),
  commerceCount: vi.fn(),
  storageFindFirst: vi.fn(),
  storageCount: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    systemConfig: { findMany: mocks.configFindMany },
    notification: { findFirst: mocks.notificationFindFirst, count: mocks.notificationCount },
    commerceOrderSyncOutbox: { findFirst: mocks.commerceFindFirst, count: mocks.commerceCount },
    storageCleanupOutbox: { findFirst: mocks.storageFindFirst, count: mocks.storageCount },
  },
}));

import { GET } from "@/app/api/health/ready/route";

describe("GET /api/health/ready", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = "test-cron-secret";
    const value = JSON.stringify({ at: new Date().toISOString(), summary: {} });
    mocks.configFindMany.mockResolvedValue([
      { key: "cron:last-success:notify", value },
      { key: "cron:last-success:commerce-order-sync", value },
      { key: "cron:last-success:expire-chips", value },
    ]);
    mocks.notificationFindFirst.mockResolvedValue(null);
    mocks.commerceFindFirst.mockResolvedValue(null);
    mocks.storageFindFirst.mockResolvedValue(null);
    mocks.notificationCount.mockResolvedValue(0);
    mocks.commerceCount.mockResolvedValue(0);
    mocks.storageCount.mockResolvedValue(0);
  });

  it("does not disclose operational state without authorization", async () => {
    const response = await GET(new Request("https://example.test/api/health/ready"));
    expect(response.status).toBe(401);
  });

  it("reports ready only when workers and queues meet their SLA", async () => {
    const response = await GET(new Request("https://example.test/api/health/ready", {
      headers: { authorization: "Bearer test-cron-secret" },
    }));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ status: "ready" });
  });

  it("reports degraded when a worker heartbeat is missing", async () => {
    mocks.configFindMany.mockResolvedValue([]);
    const response = await GET(new Request("https://example.test/api/health/ready", {
      headers: { authorization: "Bearer test-cron-secret" },
    }));
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      status: "degraded",
      checks: { notificationWorker: false, commerceWorker: false, expiryWorker: false },
    });
  });
});
