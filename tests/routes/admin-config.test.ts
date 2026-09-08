import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  requireRole: vi.fn(),
  findMany: vi.fn(),
  upsert: vi.fn(),
  auditCreate: vi.fn(),
  transaction: vi.fn(),
  invalidateMany: vi.fn(),
  getAll: vi.fn(),
}));

vi.mock("@/lib/rbac", () => ({
  GENERAL_ADMIN_ROLES: ["admin", "superadmin"],
  requireRole: mocks.requireRole,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: { $transaction: mocks.transaction },
}));

vi.mock("@/domains/shared/repositories/config.repository", () => ({
  CONFIG_KEYS: ["yappy_handle", "bank_name"],
  ConfigRepository: {
    getAll: mocks.getAll,
    invalidateMany: mocks.invalidateMany,
  },
}));

import { GET, PATCH } from "@/app/api/admin/config/route";

function request(configs: Record<string, unknown>) {
  return new NextRequest("https://example.test/api/admin/config", {
    method: "PATCH",
    headers: { "x-vercel-id": "iad1::audit-1" },
    body: JSON.stringify({ configs }),
  });
}

describe("/api/admin/config", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireRole.mockResolvedValue({
      authorized: true,
      session: { user: { id: "admin-1", accountId: "account-1" } },
    });
    mocks.getAll.mockResolvedValue({
      yappy_handle: "@prerescatepty",
      bank_name: "Banco General",
    });
    mocks.findMany.mockResolvedValue([{ key: "bank_name", value: "Anterior" }]);
    mocks.upsert.mockResolvedValue({});
    mocks.auditCreate.mockResolvedValue({ id: "audit-1" });
    mocks.transaction.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) => callback({
      systemConfig: { findMany: mocks.findMany, upsert: mocks.upsert },
      auditLog: { create: mocks.auditCreate },
    }));
  });

  it("GET exposes only editable configuration and never heartbeat/internal keys", async () => {
    mocks.getAll.mockResolvedValue({
      yappy_handle: "@prerescatepty",
      bank_name: "Banco General",
      "cron:last-success:notify": "2026-09-08T02:00:00.000Z",
      "cron:last-success:expire-chips": "2026-09-08T02:00:00.000Z",
      arbitrary_internal: "must-not-leak-into-form",
    });

    const response = await GET();
    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.configs).toEqual({
      yappy_handle: "@prerescatepty",
      bank_name: "Banco General",
    });
    expect(payload.configs["cron:last-success:notify"]).toBeUndefined();
    expect(payload.configs.arbitrary_internal).toBeUndefined();
  });

  it("PATCH rejects unknown keys before mutating data", async () => {
    const response = await PATCH(request({ arbitrary_secret: "value" }));
    expect(response.status).toBe(400);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("PATCH updates configuration and audit evidence atomically", async () => {
    const response = await PATCH(request({ bank_name: "Nuevo" }));
    expect(response.status).toBe(200);
    expect(mocks.upsert).toHaveBeenCalledWith({
      where: { key: "bank_name" },
      update: { value: "Nuevo" },
      create: { key: "bank_name", value: "Nuevo" },
    });
    expect(mocks.auditCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        actorUserId: "admin-1",
        accountId: "account-1",
        entityType: "SystemConfig",
        entityId: "global",
        action: "config_updated",
        requestId: "iad1::audit-1",
        result: "success",
      }),
    });
    expect(mocks.invalidateMany).toHaveBeenCalledWith(["bank_name"]);
  });

  it("PATCH does not invalidate cache or report success when audit persistence fails", async () => {
    mocks.auditCreate.mockRejectedValue(new Error("AUDIT_FAILED"));
    const response = await PATCH(request({ bank_name: "Nuevo" }));
    expect(response.status).toBe(500);
    expect(mocks.invalidateMany).not.toHaveBeenCalled();
  });
});
