import { beforeEach, describe, expect, it, vi } from "vitest";
import { mockPrisma, resetMockPrisma } from "../helpers/mock-prisma";

const role = vi.hoisted(() => vi.fn());

vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/lib/rbac", () => ({
  GENERAL_ADMIN_ROLES: ["admin", "superadmin"],
  requireRole: role,
}));
vi.mock("@/lib/operations/dispatch-view-model", () => ({
  buildDispatchViewModel: vi.fn((dispatch) => dispatch),
}));
vi.mock("@/lib/operations/dispatch-source", () => ({
  getDispatchCustomerOrderId: vi.fn(() => null),
}));

import { GET } from "@/app/api/admin/operations/dispatches/route";

describe("operations dispatch active queue", () => {
  beforeEach(() => {
    resetMockPrisma();
    role.mockResolvedValue({ authorized: true, session: { user: { id: "admin-1" } } });
  });

  it("excludes terminal dispatches from the active work queue", async () => {
    mockPrisma.operationDispatch.findMany.mockResolvedValue([] as never);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.dispatches).toEqual([]);
    expect(mockPrisma.operationDispatch.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          status: {
            notIn: ["delivered", "cancelled", "completed", "closed"],
          },
        },
      })
    );
  });

  it("denies unauthorized users before reading dispatches", async () => {
    role.mockResolvedValue({ authorized: false, response: new Response("", { status: 403 }) });

    const response = await GET();

    expect(response.status).toBe(403);
    expect(mockPrisma.operationDispatch.findMany).not.toHaveBeenCalled();
  });
});
