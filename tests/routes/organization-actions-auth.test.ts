import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireActiveAccountSession: vi.fn(),
  userFindUnique: vi.fn(),
  userUpdate: vi.fn(),
  userCreate: vi.fn(),
  chipFindUnique: vi.fn(),
  chipUpdate: vi.fn(),
  organizationFindFirst: vi.fn(),
  organizationUpdate: vi.fn(),
  organizationMemberCreate: vi.fn(),
  accountState: vi.fn(),
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
    organization: { findFirst: mocks.organizationFindFirst, update: mocks.organizationUpdate },
    organizationMember: { create: mocks.organizationMemberCreate },
    $transaction: mocks.transaction,
  },
}));
vi.mock("@/domains/accounts/services/account-state.service", () => ({ AccountStateService: { getAccountState: mocks.accountState } }));
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
    mocks.userCreate.mockResolvedValue({
      id: "member-2", accountId: "account-1", role: "member", status: "active", profile: { id: "profile-2" },
    });
    mocks.organizationFindFirst.mockResolvedValue({
      id: "organization-1", displayName: "Rescate", organizationType: "corporate",
      emergencyButton1Phone: null, emergencyButton2Phone: null, emergencyButton3Phone: null,
    });
    mocks.organizationUpdate.mockResolvedValue({
      id: "organization-1", displayName: "Rescate actualizado", organizationType: "corporate",
      emergencyButton1Phone: "+50760000000", emergencyButton2Phone: null, emergencyButton3Phone: null,
    });
    mocks.organizationMemberCreate.mockResolvedValue({ id: "organization-member-2" });
    mocks.accountState.mockResolvedValue({ canAddFamilyMember: true });
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
      chip: { update: mocks.chipUpdate },
      organization: { findFirst: mocks.organizationFindFirst, update: mocks.organizationUpdate },
      organizationMember: { create: mocks.organizationMemberCreate },
      user: { update: mocks.userUpdate, create: mocks.userCreate },
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

  it("creates the member, organization link, and audit record in one transaction", async () => {
    mocks.requireActiveAccountSession.mockResolvedValue({
      authorized: true,
      session: { user: { id: "owner-1", accountId: "account-1" } },
      current: { accountId: "account-1", role: "owner" },
    });
    mocks.userFindUnique.mockResolvedValueOnce(null);

    const response = await POST(request("add-member", {
      email: "member-2@example.test", password: "secure-password", firstName: "Ana", lastName: "Pérez",
    }));

    expect(response.status).toBe(200);
    expect(mocks.userCreate).toHaveBeenCalledTimes(1);
    expect(mocks.organizationMemberCreate).toHaveBeenCalledTimes(1);
    expect(mocks.auditCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ action: "organization_member_added", entityId: "member-2" }),
    });
  });

  it("records organization configuration changes without persisting contact numbers in audit snapshots", async () => {
    mocks.requireActiveAccountSession.mockResolvedValue({
      authorized: true,
      session: { user: { id: "owner-1", accountId: "account-1" } },
      current: { accountId: "account-1", role: "owner" },
    });

    const response = await POST(request("update-organization", {
      displayName: "Rescate actualizado", organizationType: "corporate", emergencyButton1Phone: "+50760000000",
    }));

    expect(response.status).toBe(200);
    expect(mocks.organizationUpdate).toHaveBeenCalledTimes(1);
    expect(mocks.auditCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "organization_configuration_updated",
        oldValuesJson: expect.not.stringContaining("60000000"),
        newValuesJson: expect.not.stringContaining("60000000"),
      }),
    });
  });
});
