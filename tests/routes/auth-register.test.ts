import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { mockPrisma } from "../helpers/mock-prisma";
import { resetAllMocks } from "../helpers/reset-mocks";

vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

vi.mock("@/lib/rateLimit", () => ({
  rateLimit: vi.fn().mockResolvedValue({ allowed: true }),
}));

vi.mock("@/lib/request-ip", () => ({
  getClientIp: vi.fn(() => "127.0.0.1"),
}));

vi.mock("bcryptjs", () => ({
  default: {
    hash: vi.fn().mockResolvedValue("hashed-password"),
  },
  hash: vi.fn().mockResolvedValue("hashed-password"),
}));

import { POST } from "@/app/api/auth/register/route";

function createRegisterRequest(body: Record<string, unknown>) {
  return new NextRequest("http://localhost/api/auth/register", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

describe("POST /api/auth/register", () => {
  beforeEach(() => {
    resetAllMocks();
    mockPrisma.user.findUnique.mockResolvedValue(null as never);
    mockPrisma.package.findUnique.mockResolvedValue(null as never);
    mockPrisma.$transaction.mockImplementation(async (callback: (tx: typeof mockPrisma) => Promise<unknown>) => {
      return callback(mockPrisma);
    });
    mockPrisma.account.create.mockResolvedValue({ id: "account-1" } as never);
    mockPrisma.user.create.mockResolvedValue({ id: "user-1" } as never);
    mockPrisma.account.update.mockResolvedValue({ id: "account-1" } as never);
    mockPrisma.profile.create.mockResolvedValue({ id: "profile-1" } as never);
    mockPrisma.consent.create.mockResolvedValue({ id: "consent-1" } as never);
    mockPrisma.auditLog.create.mockResolvedValue({} as never);
  });

  it("creates an initial consent record for the new user", async () => {
    const res = await POST(
      createRegisterRequest({
        email: "user@example.com",
        phone: "+507 6000-0000",
        password: "Password123!",
        confirmPassword: "Password123!",
        accountType: "personal",
      })
    );
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.userId).toBe("user-1");
    expect(mockPrisma.consent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: "user-1",
          accountId: "account-1",
          consentType: "terms_and_privacy",
        }),
      })
    );
  });
});
