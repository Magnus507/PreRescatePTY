import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  requireRole: vi.fn(),
  findUnique: vi.fn(),
  update: vi.fn(),
  auditCreate: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock("@/lib/rbac", () => ({
  GENERAL_ADMIN_ROLES: ["admin", "superadmin"],
  requireRole: mocks.requireRole,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: { $transaction: mocks.transaction },
}));

vi.mock("@/domains/users/repositories/user.repository", () => ({
  UserRepository: { findPersonalUsers: vi.fn() },
}));

import { PATCH } from "@/app/api/admin/users/route";

const userId = "clh1234567890123456789012";

function request(status = "suspended") {
  return new NextRequest("https://example.test/api/admin/users", {
    method: "PATCH",
    headers: { "x-vercel-id": "iad1::audit-user" },
    body: JSON.stringify({ id: userId, status }),
  });
}

describe("PATCH /api/admin/users", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireRole.mockResolvedValue({
      authorized: true,
      session: { user: { id: "admin-1", accountId: "admin-account" } },
    });
    mocks.findUnique.mockResolvedValue({
      id: userId,
      accountId: "user-account",
      email: "person@example.test",
      status: "active",
      isAdmin: false,
    });
    mocks.update.mockResolvedValue({
      id: userId,
      accountId: "user-account",
      email: "person@example.test",
      status: "suspended",
    });
    mocks.auditCreate.mockResolvedValue({ id: "audit-1" });
    mocks.transaction.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) => callback({
      user: { findUnique: mocks.findUnique, update: mocks.update },
      auditLog: { create: mocks.auditCreate },
    }));
  });

  it("changes status, invalidates sessions, and writes before/after evidence atomically", async () => {
    const response = await PATCH(request());

    expect(response.status).toBe(200);
    expect(mocks.update).toHaveBeenCalledWith({
      where: { id: userId },
      data: { status: "suspended", sessionVersion: { increment: 1 } },
      select: { id: true, accountId: true, email: true, status: true },
    });
    expect(mocks.auditCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        actorUserId: "admin-1",
        accountId: "user-account",
        entityType: "User",
        entityId: userId,
        action: "user_status_updated",
        requestId: "iad1::audit-user",
        oldValuesJson: '{"status":"active"}',
        newValuesJson: '{"status":"suspended"}',
      }),
    });
  });

  it("does not let the general user endpoint suspend an administrator", async () => {
    mocks.findUnique.mockResolvedValue({
      id: userId,
      accountId: "admin-account",
      email: "other-admin@example.test",
      status: "active",
      isAdmin: true,
    });

    const response = await PATCH(request());
    expect(response.status).toBe(404);
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.auditCreate).not.toHaveBeenCalled();
  });

  it("does not report success when audit persistence fails", async () => {
    mocks.auditCreate.mockRejectedValue(new Error("AUDIT_FAILED"));
    const response = await PATCH(request());

    expect(response.status).toBe(500);
  });
});
