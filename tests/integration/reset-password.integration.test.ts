import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { createIntegrationPrismaClient, prepareIntegrationEnvironment, seedIntegrationUser, assertIntegrationDatabaseReady } from "./integration-db";
import { hashPasswordResetToken } from "@/lib/password-reset";

const mockRateLimit = vi.hoisted(() => vi.fn());
const mockGetClientIp = vi.hoisted(() => vi.fn());
const mockBcryptHash = vi.hoisted(() => vi.fn());

vi.mock("@/lib/rateLimit", () => ({
  rateLimit: mockRateLimit,
}));

vi.mock("@/lib/request-ip", () => ({
  getClientIp: mockGetClientIp,
}));

vi.mock("bcryptjs", () => ({
  default: { hash: mockBcryptHash },
  hash: mockBcryptHash,
}));

const db = createIntegrationPrismaClient();

let POST: typeof import("@/app/api/auth/reset-password/route").POST;

const RUN_ID = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
const TEST_EMAIL = `reset-user-${RUN_ID}@test.local`;
const TEST_TOKEN = `reset-token-${RUN_ID}`;
const TEST_TOKEN_HASH = hashPasswordResetToken(TEST_TOKEN);

function createRequest(token?: string, password = "NuevaClave123") {
  return new NextRequest("http://localhost/api/auth/reset-password", {
    method: "POST",
    body: JSON.stringify({ token, password }),
  });
}

describe("PostgreSQL integration: password reset", () => {
  beforeAll(async () => {
    prepareIntegrationEnvironment();
    await assertIntegrationDatabaseReady(db);
    ({ POST } = await import("@/app/api/auth/reset-password/route"));
  });

  beforeEach(() => {
    mockRateLimit.mockReset();
    mockGetClientIp.mockReset();
    mockBcryptHash.mockReset();
    mockRateLimit.mockResolvedValue({ allowed: true, remaining: 1, resetAt: Date.now() + 1000 });
    mockGetClientIp.mockReturnValue("127.0.0.1");
    mockBcryptHash.mockResolvedValue("$2a$10$HASHED" as never);
  });

  afterAll(async () => {
    await db.$disconnect();
  });

  it("consumes the same token exactly once under concurrent requests", async () => {
    await seedIntegrationUser(db, {
      email: TEST_EMAIL,
      passwordHash: "$2a$10$ORIGINAL",
      sessionVersion: 0,
    });

    await db.passwordResetToken.create({
      data: {
        email: TEST_EMAIL,
        token: TEST_TOKEN_HASH,
        expiresAt: new Date(Date.now() + 60_000),
      },
    });

    const [first, second] = await Promise.all([
      POST(createRequest(TEST_TOKEN)),
      POST(createRequest(TEST_TOKEN)),
    ]);

    const [firstJson, secondJson] = await Promise.all([first.json(), second.json()]);

    const resetTokens = await db.passwordResetToken.findMany({ where: { email: TEST_EMAIL } });
    const user = await db.user.findUnique({ where: { email: TEST_EMAIL } });

    expect([first.status, second.status].sort()).toEqual([200, 400]);
    expect([firstJson.success, secondJson.success].filter(Boolean)).toHaveLength(1);
    expect(resetTokens).toHaveLength(1);
    expect(resetTokens[0]?.consumedAt).not.toBeNull();
    expect(user?.sessionVersion).toBe(1);
  });
});
