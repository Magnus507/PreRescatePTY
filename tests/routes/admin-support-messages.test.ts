import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  requireRole: vi.fn(),
  findMany: vi.fn(),
  count: vi.fn(),
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
  prisma: {
    supportMessage: {
      findMany: mocks.findMany,
      count: mocks.count,
      findUnique: mocks.findUnique,
      update: mocks.update,
    },
    $transaction: mocks.transaction,
  },
}));

import { GET as listMessages } from "@/app/api/admin/support-messages/route";
import { PATCH as updateMessage } from "@/app/api/admin/support-messages/[id]/route";

describe("admin support messages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireRole.mockResolvedValue({
      authorized: true,
      session: { user: { id: "admin-1", accountId: "account-1" } },
    });
    mocks.findMany.mockResolvedValue([]);
    mocks.count
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(4)
      .mockResolvedValueOnce(10);
    mocks.auditCreate.mockResolvedValue({ id: "audit-1" });
    mocks.transaction.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) =>
      callback({
        supportMessage: {
          findUnique: mocks.findUnique,
          update: mocks.update,
        },
        auditLog: { create: mocks.auditCreate },
      })
    );
  });

  it("lists inbox counters without exposing the route to non-admin roles", async () => {
    const response = await listMessages(
      new NextRequest("https://example.test/api/admin/support-messages?state=open")
    );
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.counts).toEqual({ unread: 2, open: 4, resolved: 10 });
    expect(mocks.requireRole).toHaveBeenCalledWith(["admin", "superadmin"]);
  });

  it("marks an unread message read and writes audit evidence atomically", async () => {
    mocks.findUnique.mockResolvedValue({
      id: "support-1",
      readAt: null,
      resolvedAt: null,
    });
    mocks.update.mockResolvedValue({
      id: "support-1",
      readAt: new Date("2026-09-20T03:00:00.000Z"),
      resolvedAt: null,
    });

    const response = await updateMessage(
      new NextRequest("https://example.test/api/admin/support-messages/support-1", {
        method: "PATCH",
        headers: { "x-vercel-id": "iad1::support-1" },
        body: JSON.stringify({ action: "mark-read" }),
      }),
      { params: Promise.resolve({ id: "support-1" }) }
    );

    expect(response.status).toBe(200);
    expect(mocks.update).toHaveBeenCalledWith({
      where: { id: "support-1" },
      data: expect.objectContaining({
        readByUserId: "admin-1",
      }),
    });
    expect(mocks.auditCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        actorUserId: "admin-1",
        accountId: "account-1",
        entityType: "SupportMessage",
        entityId: "support-1",
        action: "support_message.mark-read",
        requestId: "iad1::support-1",
        result: "success",
      }),
    });
  });

  it("rejects unsupported message actions before mutation", async () => {
    const response = await updateMessage(
      new NextRequest("https://example.test/api/admin/support-messages/support-1", {
        method: "PATCH",
        body: JSON.stringify({ action: "delete" }),
      }),
      { params: Promise.resolve({ id: "support-1" }) }
    );

    expect(response.status).toBe(400);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });
});
