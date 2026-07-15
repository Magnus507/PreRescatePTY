import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getServerSessionMock: vi.fn(),
  userFindUniqueMock: vi.fn(),
  userUpdateMock: vi.fn(),
}));

vi.mock("next-auth", () => ({
  getServerSession: mocks.getServerSessionMock,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: mocks.userFindUniqueMock,
      update: mocks.userUpdateMock,
    },
  },
}));

vi.mock("@/lib/auth", () => ({
  authOptions: {},
}));

import { requireActiveAccountSession, requireFreshSession, bumpUserSessionVersion } from "@/lib/rbac";

describe("session revalidation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("allows an active user with sessionVersion 0 and accountId", async () => {
    mocks.getServerSessionMock.mockResolvedValue({
      user: {
        id: "user-1",
        role: "owner",
        accountId: "account-1",
        sessionVersion: 0,
      },
    });
    mocks.userFindUniqueMock.mockResolvedValue({
      id: "user-1",
      status: "active",
      role: "owner",
      adminRole: null,
      isAdmin: false,
      accountId: "account-1",
      sessionVersion: 0,
      deletedAt: null,
    });

    const result = await requireActiveAccountSession();

    expect(result.authorized).toBe(true);
    if (result.authorized) {
      expect(result.current.sessionVersion).toBe(0);
      expect(result.current.accountId).toBe("account-1");
    }
  });

  it("rejects users without accountId for account-only flows", async () => {
    mocks.getServerSessionMock.mockResolvedValue({
      user: {
        id: "user-2",
        role: "owner",
        accountId: null,
        sessionVersion: 0,
      },
    });
    mocks.userFindUniqueMock.mockResolvedValue({
      id: "user-2",
      status: "active",
      role: "owner",
      adminRole: null,
      isAdmin: false,
      accountId: null,
      sessionVersion: 0,
      deletedAt: null,
    });

    const result = await requireActiveAccountSession();
    expect(result.authorized).toBe(false);
    if (!result.authorized) {
      expect(result.response.status).toBe(401);
    }
  });

  it("rejects a revoked sessionVersion", async () => {
    mocks.getServerSessionMock.mockResolvedValue({
      user: {
        id: "user-3",
        role: "owner",
        accountId: "account-3",
        sessionVersion: 0,
      },
    });
    mocks.userFindUniqueMock.mockResolvedValue({
      id: "user-3",
      status: "active",
      role: "owner",
      adminRole: null,
      isAdmin: false,
      accountId: "account-3",
      sessionVersion: 1,
      deletedAt: null,
    });

    const result = await requireFreshSession();
    expect(result.authorized).toBe(false);
    if (!result.authorized) {
      expect(result.response.status).toBe(401);
    }
  });

  it("bumps sessionVersion in DB", async () => {
    mocks.userUpdateMock.mockResolvedValue({ id: "user-4", sessionVersion: 2 });

    await bumpUserSessionVersion("user-4");

    expect(mocks.userUpdateMock).toHaveBeenCalledWith({
      where: { id: "user-4" },
      data: { sessionVersion: { increment: 1 } },
      select: { id: true, sessionVersion: true },
    });
  });
});
