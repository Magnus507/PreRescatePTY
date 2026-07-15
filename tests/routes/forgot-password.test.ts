import { describe, it, expect, beforeEach, vi } from "vitest";
import { mockPrisma } from "../helpers/mock-prisma";
import { resetAllMocks } from "../helpers/reset-mocks";

vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

const mockRateLimit = vi.hoisted(() => vi.fn());
vi.mock("@/lib/rateLimit", () => ({
  rateLimit: mockRateLimit,
}));

const mockGetClientIp = vi.hoisted(() => vi.fn());
vi.mock("@/lib/request-ip", () => ({
  getClientIp: mockGetClientIp,
}));

vi.mock("resend", () => ({
  Resend: vi.fn().mockImplementation(() => ({
    emails: { send: vi.fn() },
  })),
}));

import { NextRequest } from "next/server";
import { POST } from "@/app/api/auth/forgot-password/route";

function createRequest(email?: string) {
  return new NextRequest("http://localhost/api/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

function setupAllowedRateLimit() {
  mockRateLimit.mockResolvedValue({ allowed: true, remaining: 1, resetAt: Date.now() + 1000 });
  mockGetClientIp.mockReturnValue("127.0.0.1");
}

describe("POST /api/auth/forgot-password", () => {
  beforeEach(() => {
    resetAllMocks();
    mockRateLimit.mockReset();
    mockGetClientIp.mockReset();
    vi.stubEnv("RESEND_API_KEY", "");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "http://localhost:3000");
    setupAllowedRateLimit();
  });

  it("returns a generic success response for an existing email and stores only a hash", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: "user-1",
      email: "user@test.com",
      status: "active",
      sessionVersion: 0,
    } as never);
    mockPrisma.passwordResetToken.deleteMany.mockResolvedValue({ count: 1 } as never);
    mockPrisma.passwordResetToken.create.mockResolvedValue({ id: "prt-1" } as never);

    const res = await POST(createRequest("user@test.com"));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.message).toMatch(/si el correo existe/i);

    expect(mockPrisma.passwordResetToken.create).toHaveBeenCalledTimes(1);
    const createdData = mockPrisma.passwordResetToken.create.mock.calls[0][0]?.data as {
      token: string;
      expiresAt: Date;
      email: string;
    };
    expect(createdData.email).toBe("user@test.com");
    expect(createdData.token).toMatch(/^[a-f0-9]{64}$/);
    expect(createdData.expiresAt).toBeInstanceOf(Date);
    expect(mockPrisma.passwordResetToken.deleteMany).toHaveBeenCalledWith({
      where: { email: "user@test.com" },
    });
  });

  it("returns the same generic response when the email does not exist", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null as never);

    const res = await POST(createRequest("missing@test.com"));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.message).toMatch(/si el correo existe/i);
    expect(mockPrisma.passwordResetToken.create).not.toHaveBeenCalled();
  });
});
