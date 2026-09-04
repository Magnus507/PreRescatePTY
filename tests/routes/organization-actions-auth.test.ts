import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireActiveAccountSession: vi.fn(),
  userFindUnique: vi.fn(),
  userUpdate: vi.fn(),
  chipFindUnique: vi.fn(),
  chipUpdate: vi.fn(),
  auditCreate: vi.fn(),
  transaction: vi.fn(),
  hash: vi.fn(),
}));

vi.mock("@/lib/rbac", () => ({
  requireActiveAccountSession: mocks.requireActiveAccountSession,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: mocks.userFindUnique },
    chip: { findUnique: mocks.chipFindUnique },
    $transaction: mocks.transaction,
  },
}));
vi.mock("@/domains/accounts/services/account-state.service", () => ({ AccountStateService: {} }));
vi.mock("bcryptjs", () => ({ default: { hash: mocks.hash } }));

import { POST } from "@/app/api/organizations/actions/route";

function request(action = "unknown", data: Record<string, unknown> = {}) {
  return new Request("https://example.test/api/organizations/actions", {
    method: "POST",
    headers: { "x-vercel-id": "iad1::organization-action" },
    body: JSON.stringify({ action, data }),
  });
}

describe("POST /api/organizations/actions authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.hash.mockResolvedValue("hashed-password");
    mocks.userFindUnique.mockResolvedValue({
      id: "member-1",
      accountId: "account-1",
      role: "member",
      status: "active",
      sessionVersion: 0,
      profile: { id: "profile-1" },
    });
    mocks.userUpdate.mockResolvedValue({
      id: "member-1",
      accountId: "account-1",
      role: "member",
      status: "active",
      sessionVersion: 1,
    });
    mocks.chipFindUnique.mockResolvedValue({
      id: "chip-1",
      accountId: "account-1",
      ownerUserId: null,
      assignedProfileId: null,
      status: "inventory",
      serviceStatus: "inactive",
      activatedAt: null,
      serviceStartDate: null,
      serviceEndDate: null,
    });
    mocks.chipUpdate.mockResolvedValue({
      id: "chip-1",
      accountId: "account-1",
      ownerUserId: "member-1",
      assignedProfileId: "profile-1",
      status: "activated",
      serviceStatus: "active",
    });
    mocks.auditCreate.mockResolvedValue({ id: "audit-1" });
    mocks.transaction.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) => callback({
      user: { update: mocks.userUpdate },
      chip: { update: mocks.chipUpdate },
      auditLog: { create: mocks.auditCreate },
    }));
  });

  it("returns the fresh-session rejection before processing any action", async () => {
    const rejection = new Response(JSON.stringify({ error: "No autorizado" }), { status: 401 });
    mocks.requireActiveAccountSession.mockResolvedValue({ authorized: false, response: rejection });

    const response = await POST(request());
    expect(response.status).toBe(401);
  });

  it("rejects organization members from privileged account actions", async () => {
    mocks.requireActiveAccountSession.mockResolvedValue({
      authorized: true,
      session: { user: { id: "member-1", accountId: "account-1" } },
      current: { accountId: "account-1", role: "member" },
    });

    const response = await POST(request());
    expect(response.status).toBe(403);
  });

  it("allows the account owner to reach action validation", async () => {
    mocks.requireActiveAccountSession.mockResolvedValue({
      authorized: true,
      session: { user: { id: "owner-1", accountId: "account-1" } },
      current: { accountId: "account-1", role: "owner" },
    });

    const response = await POST(request());
    expect(response.status).toBe(400);
  });

  it("resets a member password, revokes existing sessions, and audits atomically", async () => {
    mocks.requireActiveAccountSession.mockResolvedValue({
      authorized: true,
      session: { user: { id: "owner-1", accountId: "account-1" } },
      current: { accountId: "account-1", role: "owner" },
    });

    const response = await POST(request("reset-password", {
      userId: "member-1",
      newPassword: "new-secure-password",
    }));

    expect(response.status).toBe(200);
    expect(mocks.userUpdate).toHaveBeenCalledWith({
      where: { id: "member-1" },
      data: { passwordHash: "hashed-password", sessionVersion: { increment: 1 } },
      select: { id: true, accountId: true, status: true, role: true, sessionVersion: true },
    });
    expect(mocks.auditCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ action: "organization_member_password_reset", actorUserId: "owner-1" }),
    });
  });

  it("assigns a chip and audit evidence in the same transaction", async () => {
    mocks.requireActiveAccountSession.mockResolvedValue({
      authorized: true,
      session: { user: { id: "owner-1", accountId: "account-1" } },
      current: { accountId: "account-1", role: "owner" },
    });

    const response = await POST(request("assign-chip", { chipId: "chip-1", memberId: "member-1" }));

    expect(response.status).toBe(200);
    expect(mocks.chipUpdate).toHaveBeenCalledTimes(1);
    expect(mocks.auditCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ action: "organization_chip_assigned", entityId: "chip-1" }),
    });
  });

  it("does not report a password reset when audit persistence fails", async () => {
    mocks.requireActiveAccountSession.mockResolvedValue({
      authorized: true,
      session: { user: { id: "owner-1", accountId: "account-1" } },
      current: { accountId: "account-1", role: "owner" },
    });
    mocks.auditCreate.mockRejectedValue(new Error("AUDIT_FAILED"));

    const response = await POST(request("reset-password", {
      userId: "member-1",
      newPassword: "new-secure-password",
    }));

    expect(response.status).toBe(500);
  });
});
