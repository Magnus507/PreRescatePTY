import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mockProcessPendingEmergencyNotifications = vi.hoisted(() => vi.fn());
const mockLoggerInfo = vi.hoisted(() => vi.fn());

vi.mock("@/lib/prisma", () => ({
  prisma: {},
}));

vi.mock("@/lib/emergency-alerts", () => ({
  processPendingEmergencyNotifications: mockProcessPendingEmergencyNotifications,
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    info: mockLoggerInfo,
  },
}));

import { GET, POST } from "@/app/api/cron/notify/route";

describe("cron notify route", () => {
  beforeEach(() => {
    mockProcessPendingEmergencyNotifications.mockReset();
    mockLoggerInfo.mockReset();
    process.env.CRON_SECRET = "cron-secret";
  });

  it("rejects requests without authorization", async () => {
    const res = await POST(new NextRequest("http://localhost/api/cron/notify", { method: "POST" }));
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.error).toMatch(/autorizado/i);
  });

  it("processes pending notifications when authorized", async () => {
    mockProcessPendingEmergencyNotifications.mockResolvedValue({
      claimed: 2,
      sent: 1,
      failed: 0,
      skipped: 0,
      retrying: 1,
      disabled: 0,
    });

    const req = new NextRequest("http://localhost/api/cron/notify", {
      method: "POST",
      headers: {
        authorization: "Bearer cron-secret",
      },
    });

    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.sent).toBe(1);
    expect(mockProcessPendingEmergencyNotifications).toHaveBeenCalledTimes(1);
  });
});
