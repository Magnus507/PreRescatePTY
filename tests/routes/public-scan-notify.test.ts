import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";

import { POST } from "@/app/api/public/[shortCode]/scan/[scanId]/notify/route";

describe("POST /api/public/[shortCode]/scan/[scanId]/notify", () => {
  it("returns 410 so stale clients cannot trigger provider-side delivery", async () => {
    const response = await POST(
      new NextRequest("http://localhost/api/public/SC-123/scan/scan-1/notify", { method: "POST" }),
      { params: Promise.resolve({ shortCode: "SC-123", scanId: "scan-1" }) }
    );
    const json = await response.json();

    expect(response.status).toBe(410);
    expect(json).toMatchObject({
      notificationStatus: "disabled",
      reason: "manual_contact_only",
    });
    expect(json.message).toMatch(/WhatsApp manual/i);
  });
});