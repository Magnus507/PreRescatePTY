import { beforeEach, describe, expect, it, vi } from "vitest";
import { mockPrisma } from "../helpers/mock-prisma";
import { createMockSession } from "../helpers/mock-auth";

const { mockRequireRole } = vi.hoisted(() => ({ mockRequireRole: vi.fn() }));
vi.mock("@/lib/rbac", () => ({
  ORDER_REVIEW_ROLES: ["admin", "superadmin"],
  requireRole: mockRequireRole,
}));
vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));

import { DELETE, PATCH } from "@/app/api/admin/orders/route";

describe("legacy admin order mutations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each([
    ["PATCH", PATCH],
    ["DELETE", DELETE],
  ])("rejects %s when the session is not an administrator", async (_method, handler) => {
    mockRequireRole.mockResolvedValue({
      authorized: false,
      response: new Response(JSON.stringify({ error: "No autorizado" }), { status: 401 }),
    });

    const response = await handler();

    expect(response.status).toBe(401);
    expect(mockPrisma.order.update).not.toHaveBeenCalled();
    expect(mockPrisma.order.delete).not.toHaveBeenCalled();
    expect(mockPrisma.orderItem.deleteMany).not.toHaveBeenCalled();
  });

  it.each([
    ["PATCH", PATCH],
    ["DELETE", DELETE],
  ])("retires %s so callers must use audited dedicated workflows", async (_method, handler) => {
    mockRequireRole.mockResolvedValue({
      authorized: true,
      session: createMockSession({ role: "admin" }),
    });

    const response = await handler();

    expect(response.status).toBe(410);
    await expect(response.json()).resolves.toMatchObject({
      error: "LEGACY_ORDER_MUTATION_RETIRED",
    });
    expect(mockPrisma.order.update).not.toHaveBeenCalled();
    expect(mockPrisma.order.delete).not.toHaveBeenCalled();
    expect(mockPrisma.orderItem.deleteMany).not.toHaveBeenCalled();
  });
});
