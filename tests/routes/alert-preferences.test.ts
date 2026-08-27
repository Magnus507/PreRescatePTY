import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { mockPrisma } from "../helpers/mock-prisma";
import { resetAllMocks } from "../helpers/reset-mocks";

vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/lib/request-ip", () => ({ getClientIp: vi.fn(() => "127.0.0.1") }));

import { getServerSession } from "next-auth";
import { GET, PATCH } from "@/app/api/users/alert-preferences/route";

describe("/api/users/alert-preferences", () => {
  beforeEach(() => {
    resetAllMocks();
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "user-1" } } as never);
    mockPrisma.user.findUnique.mockResolvedValue({ id: "user-1", accountId: "account-1" } as never);
    mockPrisma.$transaction.mockImplementation(async (callback: (tx: typeof mockPrisma) => Promise<unknown>) => callback(mockPrisma));
    mockPrisma.auditLog.create.mockResolvedValue({ id: "audit-1" } as never);
  });

  it("returns whether automatic alerts have explicit active consent", async () => {
    mockPrisma.consent.findFirst.mockResolvedValue({ id: "consent-1", grantedAt: new Date() } as never);
    const response = await GET();
    const json = await response.json();
    expect(response.status).toBe(200);
    expect(json.automaticAlertsEnabled).toBe(true);
  });

  it("creates explicit consent when automatic alerts are enabled", async () => {
    mockPrisma.consent.findFirst.mockResolvedValue(null as never);
    mockPrisma.consent.create.mockResolvedValue({ id: "consent-1" } as never);
    const response = await PATCH(new NextRequest("http://localhost/api/users/alert-preferences", {
      method: "PATCH",
      body: JSON.stringify({ automaticAlertsEnabled: true }),
    }));

    expect(response.status).toBe(200);
    expect(mockPrisma.consent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ consentType: "automatic_emergency_alerts" }),
      })
    );
    expect(mockPrisma.auditLog.create).toHaveBeenCalled();
  });

  it("revokes active consent when automatic alerts are disabled", async () => {
    mockPrisma.consent.findFirst.mockResolvedValue({ id: "consent-1" } as never);
    mockPrisma.consent.updateMany.mockResolvedValue({ count: 1 } as never);
    const response = await PATCH(new NextRequest("http://localhost/api/users/alert-preferences", {
      method: "PATCH",
      body: JSON.stringify({ automaticAlertsEnabled: false }),
    }));

    expect(response.status).toBe(200);
    expect(mockPrisma.consent.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: { revokedAt: expect.any(Date) } })
    );
  });
});
