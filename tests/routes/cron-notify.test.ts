import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mockHeartbeatUpsert = vi.hoisted(() => vi.fn());

vi.mock("@/lib/prisma", () => ({
  prisma: { systemConfig: { upsert: mockHeartbeatUpsert } },
}));

import { GET, POST } from "@/app/api/cron/notify/route";

describe("cron notify route", () => {
  beforeEach(() => {
    mockHeartbeatUpsert.mockReset();
    mockHeartbeatUpsert.mockResolvedValue({});
    process.env.CRON_SECRET = "cron-secret";
  });

  it("rejects requests without authorization", async () => {
    const res = await POST(new NextRequest("http://localhost/api/cron/notify", { method: "POST" }));
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.error).toMatch(/autorizado/i);
    expect(mockHeartbeatUpsert).not.toHaveBeenCalled();
  });

  it("records a healthy heartbeat without leasing or sending notifications", async () => {
    const req = new NextRequest("http://localhost/api/cron/notify", {
      method: "POST",
      headers: { authorization: "Bearer cron-secret" },
    });

    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toMatchObject({
      claimed: 0,
      sent: 0,
      retrying: 0,
      failed: 0,
      deadLettered: 0,
      deliveryMode: "manual_whatsapp",
      disabled: true,
    });
    expect(mockHeartbeatUpsert).toHaveBeenCalledTimes(1);
    const heartbeatCall = mockHeartbeatUpsert.mock.calls[0]?.[0];
    expect(heartbeatCall.where.key).toBe("cron:last-success:notify");
    expect(heartbeatCall.create.value).toContain('"deliveryMode":"manual_whatsapp"');
  });
});