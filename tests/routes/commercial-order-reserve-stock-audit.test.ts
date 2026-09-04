import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { mockPrisma } from "../helpers/mock-prisma";

const mockRequireRole = vi.hoisted(() => vi.fn());
const mockReserveCommercialOrderStock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/lib/rbac", () => ({
  GENERAL_ADMIN_ROLES: ["admin", "superadmin"],
  requireRole: mockRequireRole,
}));
vi.mock("@/lib/operations/commercial-order-reservation", () => ({
  reserveCommercialOrderStock: mockReserveCommercialOrderStock,
}));

import { POST } from "@/app/api/admin/operations/commercial-orders/[id]/reserve-stock/route";

describe("commercial order stock reservation audit trail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireRole.mockResolvedValue({
      authorized: true,
      session: { user: { id: "admin-1", accountId: null } },
    });
    mockPrisma.operationCommercialOrder.findUnique.mockResolvedValue({
      id: "commercial-order-1",
      sourceId: "customer-order-1",
      paymentStatus: "paid",
      status: "accepted",
      fulfillmentStatus: "pending",
    } as never);
    mockReserveCommercialOrderStock.mockResolvedValue({
      summary: { reservedQty: 1, missingQty: 0 },
    });
  });

  it("writes the actor, request and reservation outcome in the same transaction", async () => {
    const request = new NextRequest(
      "http://localhost/api/admin/operations/commercial-orders/commercial-order-1/reserve-stock",
      { method: "POST", headers: { "x-request-id": "audit-request-1" } }
    );

    const response = await POST(request, { params: Promise.resolve({ id: "commercial-order-1" }) });

    expect(response.status).toBe(200);
    expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        actorUserId: "admin-1",
        entityType: "operation_commercial_order",
        entityId: "commercial-order-1",
        action: "commercial_order.stock_reserved",
        requestId: "audit-request-1",
        result: "success",
      }),
    });
  });
});
