import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { mockPrisma, resetMockPrisma } from "../helpers/mock-prisma";
const role = vi.hoisted(() => vi.fn());
vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/lib/rbac", () => ({ GENERAL_ADMIN_ROLES: ["admin", "superadmin"], requireRole: role }));
vi.mock("@/lib/operations/operation-movements", () => ({ getOperationMovements: vi.fn().mockResolvedValue([]) }));
import { GET } from "@/app/api/admin/operations/history/route";
import { getOperationHistory } from "@/lib/operations/operation-history";
describe("operations history", () => {
  beforeEach(() => { resetMockPrisma(); role.mockResolvedValue({ authorized: true }); });
  it("loads delivered/closed orders on entry and projects no customer PII", async () => {
    mockPrisma.operationCommercialOrder.findMany.mockResolvedValue(["delivered", "closed"].map(status => ({ id: status, code: status, status, fulfillmentStatus: status, updatedAt: new Date(), dispatch: null })) as never);
    const response = await GET(new NextRequest("http://localhost/api/admin/operations/history"));
    const result = await response.json();
    expect(result.suggestions.map((row: { id: string }) => row.id)).toEqual(["delivered", "closed"]);
    const query = mockPrisma.operationCommercialOrder.findMany.mock.calls[0][0];
    expect(query.where.OR).toEqual(expect.arrayContaining([{ status: { in: ["delivered", "completed", "closed"] } }, { dispatch: { is: { status: "delivered" } } }]));
    expect(query.select).not.toHaveProperty("customerEmail");
    expect(query.select).not.toHaveProperty("customerName");
  });
  it("denies unauthorized users before querying history", async () => {
    role.mockResolvedValue({ authorized: false, response: new Response("", { status: 403 }) });
    expect((await GET(new NextRequest("http://localhost/api/admin/operations/history"))).status).toBe(403);
    expect(mockPrisma.operationCommercialOrder.findMany).not.toHaveBeenCalled();
  });
  it("searches completed orders with stable pagination", async () => {
    mockPrisma.operationCommercialOrder.findMany.mockResolvedValue([]);
    await getOperationHistory({ entityType: "commercial_order", search: " PR-2026 ", page: 2, limit: 10 });
    expect(mockPrisma.operationCommercialOrder.findMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 20, take: 11, where: expect.objectContaining({ code: { contains: "PR-2026", mode: "insensitive" } }), orderBy: [{ updatedAt: "desc" }, { id: "desc" }] }));
  });
});
