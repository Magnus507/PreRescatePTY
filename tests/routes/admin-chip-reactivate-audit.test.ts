import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { mockPrisma } from "../helpers/mock-prisma";

const mockRequireRole = vi.hoisted(() => vi.fn());
const mockInvalidateCache = vi.hoisted(() => vi.fn());

vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/lib/rbac", () => ({
  GENERAL_ADMIN_ROLES: ["admin", "superadmin"],
  requireRole: mockRequireRole,
}));
vi.mock("@/domains/accounts/services/account-state.service", () => ({
  AccountStateService: { invalidateCache: mockInvalidateCache },
}));

import { POST } from "@/app/api/admin/chips/[chipId]/reactivate/route";

const activeChip = {
  id: "chip-1",
  accountId: "account-1",
  ownerUserId: "owner-1",
  status: "activated",
  serviceStatus: "expired",
  serviceStartDate: new Date("2024-01-01T00:00:00.000Z"),
  serviceEndDate: new Date("2026-01-01T00:00:00.000Z"),
};

describe("admin chip reactivation audit trail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireRole.mockResolvedValue({
      authorized: true,
      session: { user: { id: "admin-1", accountId: null } },
    });
  });

  it("updates and audits the chip in one transaction", async () => {
    mockPrisma.chip.findUnique.mockResolvedValue(activeChip as never);
    mockPrisma.chip.update.mockResolvedValue({
      ...activeChip,
      serviceStatus: "active",
      serviceStartDate: new Date(),
      serviceEndDate: new Date(),
    } as never);

    const response = await POST(
      new NextRequest("http://localhost/api/admin/chips/chip-1/reactivate", {
        method: "POST",
        headers: { "x-request-id": "reactivate-request-1" },
      }),
      { params: Promise.resolve({ chipId: "chip-1" }) }
    );

    expect(response.status).toBe(200);
    expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        actorUserId: "admin-1",
        entityType: "chip",
        entityId: "chip-1",
        action: "chip.reactivated",
        requestId: "reactivate-request-1",
        result: "success",
      }),
    });
    expect(mockInvalidateCache).toHaveBeenCalledWith("owner-1");
  });

  it("preserves the previous rejection for a chip that is not activated", async () => {
    mockPrisma.chip.findUnique.mockResolvedValue({ ...activeChip, status: "inventory" } as never);

    const response = await POST(
      new NextRequest("http://localhost/api/admin/chips/chip-1/reactivate", { method: "POST" }),
      { params: Promise.resolve({ chipId: "chip-1" }) }
    );

    expect(response.status).toBe(400);
    expect(mockPrisma.chip.update).not.toHaveBeenCalled();
    expect(mockPrisma.auditLog.create).not.toHaveBeenCalled();
  });
});
