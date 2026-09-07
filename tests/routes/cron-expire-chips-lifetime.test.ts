import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mockHeartbeatUpsert = vi.hoisted(() => vi.fn());
const mockStorageCleanup = vi.hoisted(() => vi.fn());
const mockLoggerInfo = vi.hoisted(() => vi.fn());

vi.mock("@/lib/prisma", () => ({
  prisma: { systemConfig: { upsert: mockHeartbeatUpsert } },
}));
vi.mock("@/lib/storage-cleanup-outbox", () => ({
  processStorageCleanupOutbox: mockStorageCleanup,
}));
vi.mock("@/lib/logger", () => ({
  logger: { info: mockLoggerInfo },
}));

import { POST } from "@/app/api/cron/expire-chips/route";

describe("legacy expire-chips cron under lifetime policy", () => {
  beforeEach(() => {
    mockHeartbeatUpsert.mockReset();
    mockStorageCleanup.mockReset();
    mockLoggerInfo.mockReset();
    mockHeartbeatUpsert.mockResolvedValue({});
    mockStorageCleanup.mockResolvedValue({ processed: 0, failed: 0 });
    process.env.CRON_SECRET = "cron-secret";
  });

  it("keeps storage maintenance but performs zero time-based expirations", async () => {
    const response = await POST(new NextRequest("http://localhost/api/cron/expire-chips", {
      method: "POST",
      headers: { authorization: "Bearer cron-secret" },
    }));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.count).toBe(0);
    expect(json.legacyTimeExpiryDisabled).toBe(true);
    expect(mockStorageCleanup).toHaveBeenCalledTimes(1);
    expect(mockHeartbeatUpsert).toHaveBeenCalledTimes(1);
  });

  it("still protects the maintenance endpoint with CRON_SECRET", async () => {
    const response = await POST(new NextRequest("http://localhost/api/cron/expire-chips", { method: "POST" }));
    expect(response.status).toBe(401);
    expect(mockStorageCleanup).not.toHaveBeenCalled();
  });
});