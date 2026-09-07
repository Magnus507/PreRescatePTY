import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { mockPrisma } from "../helpers/mock-prisma";
import { resetAllMocks } from "../helpers/reset-mocks";

vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));

import { getServerSession } from "next-auth";
import { GET, PATCH } from "@/app/api/users/alert-preferences/route";

describe("/api/users/alert-preferences", () => {
  beforeEach(() => {
    resetAllMocks();
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "user-1" } } as never);
    mockPrisma.user.findUnique.mockResolvedValue({ id: "user-1", accountId: "account-1" } as never);
  });

  it("always reports manual-only delivery without reading historical consent", async () => {
    const response = await GET();
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toMatchObject({
      automaticAlertsEnabled: false,
      automaticAlertsAvailable: false,
      deliveryMode: "manual_whatsapp",
      grantedAt: null,
    });
    expect(mockPrisma.consent.findFirst).not.toHaveBeenCalled();
  });

  it("returns 410 for stale attempts to enable automatic alerts and creates no consent", async () => {
    const response = await PATCH(new NextRequest("http://localhost/api/users/alert-preferences", {
      method: "PATCH",
      body: JSON.stringify({ automaticAlertsEnabled: true }),
    }));
    const json = await response.json();

    expect(response.status).toBe(410);
    expect(json).toMatchObject({
      automaticAlertsEnabled: false,
      automaticAlertsAvailable: false,
      deliveryMode: "manual_whatsapp",
      reason: "manual_contact_only",
    });
    expect(mockPrisma.consent.create).not.toHaveBeenCalled();
    expect(mockPrisma.consent.updateMany).not.toHaveBeenCalled();
    expect(mockPrisma.auditLog.create).not.toHaveBeenCalled();
  });

  it("still requires authentication", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);

    const response = await GET();
    expect(response.status).toBe(401);
  });
});