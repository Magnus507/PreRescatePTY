import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  requireRole: vi.fn(),
  findUnique: vi.fn(),
  update: vi.fn(),
  create: vi.fn(),
  auditCreate: vi.fn(),
  transaction: vi.fn(),
  hash: vi.fn(),
}));

vi.mock("@/lib/rbac", () => ({
  SUPERADMIN_ROLES: ["superadmin"],
  requireRole: mocks.requireRole,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: mocks.findUnique },
    $transaction: mocks.transaction,
  },
}));

vi.mock("bcryptjs", () => ({
  default: { hash: mocks.hash },
}));

import { PATCH as patchAdmin, DELETE as deleteAdmin } from "@/app/api/admin/admins/[id]/route";
import { POST as createAdmin, PATCH as patchAdminLegacy } from "@/app/api/admin/admins/route";

const targetId = "clh1234567890123456789012";
const currentAdmin = {
  id: targetId,
  accountId: "account-2",
  email: "operator@example.test",
  isAdmin: true,
  adminRole: "admin",
  role: "owner",
  status: "active",
  createdAt: new Date("2026-09-04T00:00:00.000Z"),
};

function request(path: string, method: string, body?: unknown) {
  return new NextRequest(`https://example.test${path}`, {
    method,
    headers: { "x-vercel-id": "iad1::audit-admin" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

describe("admin account mutation audit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireRole.mockResolvedValue({
      authorized: true,
      session: { user: { id: "superadmin-1", accountId: "account-1" } },
    });
    mocks.findUnique.mockResolvedValue(currentAdmin);
    mocks.update.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
      ...currentAdmin,
      ...data,
      adminRole: data.adminRole === null ? null : (data.adminRole ?? currentAdmin.adminRole),
      isAdmin: data.isAdmin ?? currentAdmin.isAdmin,
    }));
    mocks.create.mockResolvedValue({
      ...currentAdmin,
      id: "clh9876543210987654321098",
      email: "new-admin@example.test",
      adminRole: "admin",
    });
    mocks.auditCreate.mockResolvedValue({ id: "audit-1" });
    mocks.hash.mockResolvedValue("hashed-password");
    mocks.transaction.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) => callback({
      user: { update: mocks.update, create: mocks.create },
      auditLog: { create: mocks.auditCreate },
    }));
  });

  it("updates access, invalidates existing sessions, and records before/after evidence", async () => {
    const response = await patchAdmin(
      request(`/api/admin/admins/${targetId}`, "PATCH", { role: "imprenta", status: "suspended" }),
      { params: Promise.resolve({ id: targetId }) },
    );

    expect(response.status).toBe(200);
    expect(mocks.update).toHaveBeenCalledWith({
      where: { id: targetId },
      data: { adminRole: "imprenta", status: "suspended", sessionVersion: { increment: 1 } },
    });
    expect(mocks.auditCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        actorUserId: "superadmin-1",
        accountId: "account-2",
        entityType: "User",
        entityId: targetId,
        action: "admin_access_updated",
        requestId: "iad1::audit-admin",
        result: "success",
        oldValuesJson: expect.stringContaining('"adminRole":"admin"'),
        newValuesJson: expect.stringContaining('"status":"suspended"'),
      }),
    });
  });

  it("does not report a successful access update when audit persistence fails", async () => {
    mocks.auditCreate.mockRejectedValue(new Error("AUDIT_FAILED"));
    const response = await patchAdmin(
      request(`/api/admin/admins/${targetId}`, "PATCH", { status: "suspended" }),
      { params: Promise.resolve({ id: targetId }) },
    );

    expect(response.status).toBe(500);
  });

  it("revokes access and writes the audit record in the same transaction", async () => {
    const response = await deleteAdmin(
      request(`/api/admin/admins/${targetId}`, "DELETE"),
      { params: Promise.resolve({ id: targetId }) },
    );

    expect(response.status).toBe(200);
    expect(mocks.update).toHaveBeenCalledWith({
      where: { id: targetId },
      data: { isAdmin: false, adminRole: null, sessionVersion: { increment: 1 } },
    });
    expect(mocks.auditCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ action: "admin_access_revoked" }),
    });
  });

  it("audits promotion of an existing user and fails closed if the audit cannot be stored", async () => {
    mocks.findUnique.mockResolvedValue({ ...currentAdmin, isAdmin: false, adminRole: null });
    mocks.auditCreate.mockRejectedValue(new Error("AUDIT_FAILED"));

    const response = await createAdmin(request("/api/admin/admins", "POST", {
      email: currentAdmin.email,
      password: "password-seguro",
      role: "admin",
    }));

    expect(response.status).toBe(500);
    expect(mocks.auditCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ action: "admin_access_granted" }),
    });
  });

  it("audits newly created admins without putting the password in evidence", async () => {
    mocks.findUnique.mockResolvedValue(null);
    const response = await createAdmin(request("/api/admin/admins", "POST", {
      email: "new-admin@example.test",
      password: "password-seguro",
      role: "admin",
    }));

    expect(response.status).toBe(201);
    expect(mocks.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ passwordHash: "hashed-password", sessionVersion: 1 }),
    });
    const auditArgs = mocks.auditCreate.mock.calls[0][0];
    expect(auditArgs.data.action).toBe("admin_created");
    expect(auditArgs.data.newValuesJson).not.toContain("password");
  });

  it("returns a controlled failure from the legacy update route when audit persistence fails", async () => {
    mocks.auditCreate.mockRejectedValue(new Error("AUDIT_FAILED"));
    const response = await patchAdminLegacy(request("/api/admin/admins", "PATCH", {
      id: targetId,
      status: "suspended",
    }));

    expect(response.status).toBe(500);
  });

  it("does not let the legacy update route mutate a non-admin user", async () => {
    mocks.findUnique.mockResolvedValue({ ...currentAdmin, isAdmin: false, adminRole: null });
    const response = await patchAdminLegacy(request("/api/admin/admins", "PATCH", {
      id: targetId,
      status: "suspended",
    }));

    expect(response.status).toBe(404);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });
});
