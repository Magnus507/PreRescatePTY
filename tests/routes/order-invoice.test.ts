import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { mockPrisma } from "../helpers/mock-prisma";
import { resetAllMocks } from "../helpers/reset-mocks";

const mockGetServerSession = vi.hoisted(() => vi.fn());
const mockRequireActiveAccountSession = vi.hoisted(() => vi.fn());

vi.mock("next-auth", () => ({ getServerSession: mockGetServerSession }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/lib/rbac", () => ({ requireActiveAccountSession: mockRequireActiveAccountSession }));

import { GET } from "@/app/api/orders/[id]/invoice/route";

function request() {
  return new NextRequest("http://localhost/api/orders/order-1/invoice");
}

function params() {
  return { params: Promise.resolve({ id: "order-1" }) };
}

describe("GET /api/orders/[id]/invoice", () => {
  beforeEach(() => {
    resetAllMocks();
    mockGetServerSession.mockReset();
    mockRequireActiveAccountSession.mockReset();
  });

  it("requires authentication", async () => {
    mockRequireActiveAccountSession.mockResolvedValue({
      authorized: false,
      response: new Response(JSON.stringify({ error: "No autorizado" }), { status: 401 }),
    });

    const response = await GET(request(), params());

    expect(response.status).toBe(401);
    expect(mockPrisma.invoice.findUnique).not.toHaveBeenCalled();
  });

  it("does not expose another user's invoice", async () => {
    mockRequireActiveAccountSession.mockResolvedValue({
      authorized: true,
      session: { user: { id: "user-1" } },
    });
    mockPrisma.invoice.findUnique.mockResolvedValue({
      id: "invoice-1",
      order: { userId: "user-2" },
      lines: [],
    } as never);

    const response = await GET(request(), params());

    expect(response.status).toBe(404);
  });

  it("returns the immutable snapshot to the order owner", async () => {
    mockRequireActiveAccountSession.mockResolvedValue({
      authorized: true,
      session: { user: { id: "user-1" } },
    });
    mockPrisma.invoice.findUnique.mockResolvedValue({
      id: "invoice-1",
      orderId: "order-1",
      internalNumber: "INV-ORD-001",
      status: "pending_configuration",
      currency: "USD",
      subtotal: "25.00",
      discountTotal: "0.00",
      taxRate: "0.000000",
      taxTotal: "0.00",
      total: "25.00",
      priceIncludesTax: true,
      buyerName: "Cliente",
      buyerEmail: "cliente@example.com",
      buyerDocument: null,
      createdAt: new Date("2026-08-26T00:00:00.000Z"),
      order: { userId: "user-1" },
      lines: [{
        id: "line-1",
        description: "Sticker PreRescate",
        productCode: "STK-001",
        quantity: 1,
        unitPrice: "25.00",
        subtotal: "25.00",
        discount: "0.00",
        taxRate: "0.000000",
        taxAmount: "0.00",
        total: "25.00",
      }],
    } as never);

    const response = await GET(request(), params());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.invoice).toMatchObject({
      internalNumber: "INV-ORD-001",
      status: "pending_configuration",
      total: "25.00",
      lines: [{ description: "Sticker PreRescate", total: "25.00" }],
    });
  });
});
