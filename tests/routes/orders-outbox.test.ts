import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { mockPrisma } from "../helpers/mock-prisma";
import { resetAllMocks } from "../helpers/reset-mocks";
import { createMockSession } from "../helpers/mock-auth";

const mockResolveStoreProductForOrder = vi.hoisted(() => vi.fn());
const mockCalculateStoreOrderFulfillment = vi.hoisted(() => vi.fn());
const mockGenerateOrderNumber = vi.hoisted(() => vi.fn());
const mockRateLimit = vi.hoisted(() => vi.fn());

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  authOptions: {},
}));

vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

vi.mock("@/lib/rateLimit", () => ({
  rateLimit: mockRateLimit,
}));

vi.mock("@/lib/order-number", () => ({
  generateOrderNumber: mockGenerateOrderNumber,
}));

vi.mock("@/lib/orders/store-order-fulfillment", () => ({
  buildStoreOrderInternalNote: vi.fn(() => "internal-note"),
  calculateStoreOrderFulfillment: mockCalculateStoreOrderFulfillment,
  parseCustomerFulfillmentSummaryFromInternalNote: vi.fn(),
  resolveStoreProductForOrder: mockResolveStoreProductForOrder,
}));

import { POST } from "@/app/api/orders/route";
import { getServerSession } from "next-auth";

describe("POST /api/orders", () => {
  beforeEach(() => {
    resetAllMocks();
    mockGenerateOrderNumber.mockReset();
    mockRateLimit.mockReset();
    mockResolveStoreProductForOrder.mockReset();
    mockCalculateStoreOrderFulfillment.mockReset();
    mockPrisma.order.create.mockReset();
    mockPrisma.commerceOrderSyncOutbox.create.mockReset();
    mockPrisma.user.findUnique.mockReset();
    mockPrisma.$transaction.mockImplementation(async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => fn(mockPrisma));
    vi.mocked(getServerSession).mockResolvedValue(
      createMockSession({ id: "user-1", role: "owner", accountId: "account-1" }) as never
    );
    mockRateLimit.mockResolvedValue({ allowed: true });
    mockGenerateOrderNumber.mockResolvedValue("ORD-001");
    mockPrisma.user.findUnique.mockResolvedValue({
      id: "user-1",
      email: "cliente@example.com",
      accountId: "account-1",
      profile: { id: "profile-1", firstName: "Ana", lastName: "Perez", address: null, city: null },
    } as never);
    mockResolveStoreProductForOrder.mockResolvedValue({
      id: "product-1",
      name: "Producto 1",
      price: 25,
      operationalMapping: {
        id: "map-1",
        productCode: "PRD-1",
        storeSection: "personal_devices",
        deviceType: "standard",
        purchaseFlow: "checkout",
        requiresCompanyContext: false,
        isPublished: true,
        finishedGoodId: "fg-1",
        finishedGood: { id: "fg-1", code: "FG-1", name: "Producto 1", status: "active" },
      },
    });
    mockCalculateStoreOrderFulfillment.mockResolvedValue({
      resolvedItems: [
        {
          productId: "product-1",
          productName: "Producto 1",
          productCode: "PRD-1",
          productType: "PRD-1",
          quantity: 1,
          unitPrice: 25,
          availableStock: 1,
          stockCoveredQty: 1,
          backorderQty: 0,
          fulfillmentMode: "stock",
          productionEstimateDays: 0,
          customerMessage: "Disponible para pedido.",
          operationalMappingId: "map-1",
          finishedGoodId: "fg-1",
        },
      ],
      summary: {
        hasBackorder: false,
        productionEstimateDays: 0,
        backorderQtyTotal: 0,
        items: [],
      },
    });
    mockPrisma.order.create.mockResolvedValue({
      id: "order-1",
      orderNumber: "ORD-001",
      customerName: "Ana Perez",
      customerEmail: "cliente@example.com",
      customerPhone: null,
      providerReference: null,
      manualPaymentReference: null,
      paymentProofUrl: null,
      currency: "USD",
      paymentStatus: "pending",
      amount: 25,
    } as never);
    mockPrisma.commerceOrderSyncOutbox.create.mockResolvedValue({ id: "outbox-1" } as never);
  });

  it("creates the order and persists a durable sync intention in the same transaction", async () => {
    const req = new NextRequest("http://localhost/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerName: "Ana Perez",
        customerEmail: "cliente@example.com",
        paymentMethod: "manual",
        items: [
          {
            productType: "PRD-1",
            quantity: 1,
            unitPrice: 25,
          },
        ],
      }),
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.operationsSyncStatus).toBe("queued");
    expect(mockPrisma.order.create).toHaveBeenCalledTimes(1);
    expect(mockPrisma.commerceOrderSyncOutbox.create).toHaveBeenCalledTimes(1);
    expect(mockPrisma.commerceOrderSyncOutbox.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          sourceType: "checkout",
          sourceId: "order-1",
          eventType: "commerce.order.sync_requested",
        }),
      })
    );
  });
});
