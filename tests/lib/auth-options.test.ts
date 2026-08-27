import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  userFindUnique: vi.fn(),
  userUpdate: vi.fn(),
  rateLimitMock: vi.fn(),
  getClientIpMock: vi.fn(),
  decryptMock: vi.fn(),
  verifyMfaTokenMock: vi.fn(),
  bcryptCompareMock: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: mocks.userFindUnique,
      update: mocks.userUpdate,
    },
  },
}));

vi.mock("@/lib/rateLimit", () => ({
  rateLimit: mocks.rateLimitMock,
}));

vi.mock("@/lib/request-ip", () => ({
  getClientIp: mocks.getClientIpMock,
}));

vi.mock("@/lib/encryption", () => ({
  decrypt: mocks.decryptMock,
}));

vi.mock("@/domains/users/services/mfa.service", () => ({
  verifyMfaToken: mocks.verifyMfaTokenMock,
}));

vi.mock("bcryptjs", () => ({
  default: {
    compare: mocks.bcryptCompareMock,
  },
}));

import bcrypt from "bcryptjs";
import { authOptions, authorizeCredentials } from "@/lib/auth";

describe("authOptions credentials flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.rateLimitMock.mockResolvedValue({ allowed: true });
    mocks.getClientIpMock.mockReturnValue("127.0.0.1");
    mocks.decryptMock.mockReturnValue("mfa-secret");
    mocks.verifyMfaTokenMock.mockReturnValue(true);
    mocks.bcryptCompareMock.mockResolvedValue(true);
    mocks.userUpdate.mockResolvedValue({});
  });

  it("authorizes an active user with sessionVersion 0", async () => {
    mocks.userFindUnique.mockResolvedValue({
      id: "user-1",
      email: "client@example.com",
      passwordHash: "hashed",
      status: "active",
      role: "owner",
      isAdmin: false,
      adminRole: null,
      accountId: "account-1",
      sessionVersion: 0,
      mfaEnabled: false,
      mfaSecret: null,
    });

    const result = await authorizeCredentials({ email: "client@example.com", password: "Secret123!" }, {} as never);

    expect(result).toEqual({
      id: "user-1",
      email: "client@example.com",
      name: "client@example.com",
      role: "owner",
      accountId: "account-1",
      sessionVersion: 0,
    });
    expect(mocks.userUpdate).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { lastLoginAt: expect.any(Date) },
    });
    expect(bcrypt.compare).toHaveBeenCalled();
  });

  it("rejects inactive users", async () => {
    mocks.userFindUnique.mockResolvedValue({
      id: "user-2",
      email: "disabled@example.com",
      passwordHash: "hashed",
      status: "suspended",
      role: "owner",
      isAdmin: false,
      adminRole: null,
      accountId: "account-2",
      sessionVersion: 0,
      mfaEnabled: false,
      mfaSecret: null,
    });

    await expect(
      authorizeCredentials({ email: "disabled@example.com", password: "Secret123!" }, {} as never)
    ).rejects.toThrow("Credenciales inválidas");
  });

  it("requires MFA when the user has it enabled", async () => {
    mocks.userFindUnique.mockResolvedValue({
      id: "user-3",
      email: "mfa@example.com",
      passwordHash: "hashed",
      status: "active",
      role: "owner",
      isAdmin: false,
      adminRole: null,
      accountId: "account-3",
      sessionVersion: 0,
      mfaEnabled: true,
      mfaSecret: "encrypted-secret",
    });

    await expect(
      authorizeCredentials({ email: "mfa@example.com", password: "Secret123!" }, {} as never)
    ).rejects.toThrow("MFA_REQUIRED");

    const withCode = await authorizeCredentials(
      { email: "mfa@example.com", password: "Secret123!", mfaCode: "123456" },
      {} as never
    );

    expect(withCode?.id).toBe("user-3");
    expect(mocks.verifyMfaTokenMock).toHaveBeenCalledWith("123456", "mfa-secret");
  });

  it("propagates claims through jwt and session callbacks", async () => {
    const jwtResult = await authOptions.callbacks?.jwt?.({
      token: {} as never,
      user: {
        id: "user-4",
        role: "superadmin",
        accountId: null,
        sessionVersion: 0,
      } as never,
    } as never);

    expect(jwtResult).toEqual({
      id: "user-4",
      role: "superadmin",
      accountId: null,
      sessionVersion: 0,
      revoked: false,
    });

    const sessionResult = await authOptions.callbacks?.session?.({
      session: { user: { name: "x", email: "x@example.com", image: null } } as never,
      token: {
        id: "user-4",
        role: "superadmin",
        accountId: null,
        sessionVersion: 0,
      } as never,
      user: undefined as never,
      trigger: "update",
      newSession: undefined as never,
    } as never);

    expect(sessionResult?.user).toMatchObject({
      id: "user-4",
      role: "superadmin",
      accountId: null,
      sessionVersion: 0,
    });
  });

  it("refreshes current authorization claims for an existing session", async () => {
    mocks.userFindUnique.mockResolvedValue({
      status: "active",
      deletedAt: null,
      sessionVersion: 3,
      role: "member",
      isAdmin: false,
      adminRole: null,
      accountId: "account-5",
    });

    const result = await authOptions.callbacks?.jwt?.({
      token: {
        id: "user-5",
        role: "owner",
        accountId: "old-account",
        sessionVersion: 3,
      } as never,
      user: undefined as never,
    } as never);

    expect(mocks.userFindUnique).toHaveBeenCalledWith({
      where: { id: "user-5" },
      select: expect.objectContaining({
        status: true,
        deletedAt: true,
        sessionVersion: true,
      }),
    });
    expect(result).toMatchObject({
      id: "user-5",
      role: "member",
      accountId: "account-5",
      sessionVersion: 3,
      revoked: false,
    });
  });

  it.each([
    ["deleted", null],
    ["suspended", { status: "suspended", deletedAt: null, sessionVersion: 1 }],
    ["deleted user", { status: "inactive", deletedAt: new Date(), sessionVersion: 1 }],
    ["outdated session", { status: "active", deletedAt: null, sessionVersion: 2 }],
  ])("revokes an existing session for a %s", async (_case, currentUser) => {
    mocks.userFindUnique.mockResolvedValue(currentUser);

    const token = await authOptions.callbacks?.jwt?.({
      token: {
        id: "user-6",
        role: "owner",
        accountId: "account-6",
        sessionVersion: 1,
      } as never,
      user: undefined as never,
    } as never);
    const session = await authOptions.callbacks?.session?.({
      session: { user: { email: "old@example.com" } } as never,
      token: token as never,
    } as never);

    expect(token).toMatchObject({ revoked: true });
    expect(session).not.toHaveProperty("user");
  });

  it("fails closed when the current account state cannot be checked", async () => {
    mocks.userFindUnique.mockRejectedValue(new Error("database unavailable"));

    const token = await authOptions.callbacks?.jwt?.({
      token: {
        id: "user-7",
        role: "owner",
        accountId: "account-7",
        sessionVersion: 0,
      } as never,
      user: undefined as never,
    } as never);

    expect(token).toMatchObject({ revoked: true });
  });
});
