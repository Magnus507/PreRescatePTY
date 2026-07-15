import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { mockPrisma } from "../helpers/mock-prisma";
import { resetAllMocks } from "../helpers/reset-mocks";
import { hashPasswordResetToken } from "@/lib/password-reset";

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

const mockBcryptHash = vi.hoisted(() => vi.fn());
vi.mock("bcryptjs", () => ({
  default: { hash: mockBcryptHash },
  hash: mockBcryptHash,
}));

import { POST } from "@/app/api/auth/reset-password/route";

const TEST_EMAIL = "user@test.com";
const TEST_TOKEN = "reset-token-plain";
const TEST_TOKEN_HASH = hashPasswordResetToken(TEST_TOKEN);

function createRequest(token?: string, password = "NuevaClave123") {
  return new NextRequest("http://localhost/api/auth/reset-password", {
    method: "POST",
    body: JSON.stringify({ token, password }),
  });
}

function setupAllowedRateLimit() {
  mockRateLimit.mockResolvedValue({ allowed: true, remaining: 1, resetAt: Date.now() + 1000 });
  mockGetClientIp.mockReturnValue("127.0.0.1");
  mockBcryptHash.mockResolvedValue("$2a$10$HASHED" as never);
}

function setupTokenRecord(overrides: Record<string, unknown> = {}) {
  mockPrisma.passwordResetToken.findUnique.mockResolvedValue({
    id: "prt-1",
    email: TEST_EMAIL,
    token: TEST_TOKEN_HASH,
    expiresAt: new Date(Date.now() + 60_000),
    consumedAt: null,
    ...overrides,
  } as never);
}

describe("POST /api/auth/reset-password", () => {
  beforeEach(() => {
    resetAllMocks();
    mockRateLimit.mockReset();
    mockGetClientIp.mockReset();
    mockBcryptHash.mockReset();
    mockPrisma.passwordResetToken.updateMany.mockResolvedValue({ count: 1 } as never);
    mockPrisma.user.updateMany.mockResolvedValue({ count: 1 } as never);
    mockPrisma.passwordResetToken.deleteMany.mockResolvedValue({ count: 1 } as never);
    mockPrisma.$transaction.mockImplementation(async (callback: (tx: typeof mockPrisma) => Promise<unknown>) =>
      callback(mockPrisma)
    );
    setupAllowedRateLimit();
  });

  it("consumes the token atomically, updates the password and increments sessionVersion", async () => {
    setupTokenRecord();

    const res = await POST(createRequest(TEST_TOKEN));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(mockPrisma.passwordResetToken.updateMany).toHaveBeenCalledWith({
      where: {
        id: "prt-1",
        token: TEST_TOKEN_HASH,
        consumedAt: null,
        expiresAt: { gt: expect.any(Date) },
      },
      data: { consumedAt: expect.any(Date) },
    });
    expect(mockPrisma.user.updateMany).toHaveBeenCalledWith({
      where: { email: TEST_EMAIL },
      data: {
        passwordHash: "$2a$10$HASHED",
        sessionVersion: { increment: 1 },
      },
    });
    expect(mockPrisma.passwordResetToken.deleteMany).toHaveBeenCalledWith({
      where: { email: TEST_EMAIL, id: { not: "prt-1" } },
    });
  });

  it("rejects an invalid token without revealing whether the email exists", async () => {
    mockPrisma.passwordResetToken.findUnique.mockResolvedValue(null as never);

    const res = await POST(createRequest("invalid-token"));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toMatch(/inválido|utilizado/i);
  });

  it("rejects an expired token", async () => {
    setupTokenRecord({ expiresAt: new Date(Date.now() - 60_000) });

    const res = await POST(createRequest(TEST_TOKEN));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toMatch(/expirado/i);
  });

  it("allows only one of two concurrent requests to consume the same token", async () => {
    setupTokenRecord();
    mockPrisma.passwordResetToken.updateMany
      .mockResolvedValueOnce({ count: 1 } as never)
      .mockResolvedValueOnce({ count: 0 } as never);

    const [first, second] = await Promise.all([POST(createRequest(TEST_TOKEN)), POST(createRequest(TEST_TOKEN))]);
    const firstJson = await first.json();
    const secondJson = await second.json();

    expect([first.status, second.status].sort()).toEqual([200, 400]);
    expect([firstJson.success, secondJson.success].filter(Boolean)).toHaveLength(1);
    expect(mockPrisma.user.updateMany).toHaveBeenCalledTimes(1);
  });
});
