import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { mockPrisma } from "../helpers/mock-prisma";
import { resetAllMocks } from "../helpers/reset-mocks";
import { createMockSession } from "../helpers/mock-auth";

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  authOptions: {},
}));

vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

const mockGenerateOrderNumber = vi.hoisted(() => vi.fn());
const mockSyncRealOrderToOperations = vi.hoisted(() => vi.fn());

vi.mock("@/lib/order-number", () => ({
  generateOrderNumber: mockGenerateOrderNumber,
}));

vi.mock("@/lib/operations/sync-real-order-to-operations", () => ({
  syncRealOrderToOperations: mockSyncRealOrderToOperations,
}));

import { POST } from "@/app/api/orders/manual/route";
import { getServerSession } from "next-auth";

const TEST_USER_ID = "test-user-1";
const TEST_ACCOUNT_ID = "test-account-id";
const TEST_PACKAGE_ID = "pkg_123";

function createManualOrderRequest(body: Record<string, unknown> = {}) {
  return new NextRequest("http://localhost/api/orders/manual", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

function setupDefaultMocks() {
  vi.mocked(getServerSession).mockResolvedValue(
    createMockSession({ id: TEST_USER_ID, role: "owner" }) as never
  );
  mockPrisma.package.findUnique.mockResolvedValue({
    id: TEST_PACKAGE_ID,
    name: "Plan Básico",
    price: 49.99,
    maxChips: 5,
    isActive: true,
  } as never);
  mockPrisma.$transaction.mockImplementation(async (callback: (tx: typeof mockPrisma) => Promise<unknown>) => {
    return callback(mockPrisma);
  });
  mockPrisma.order.create.mockResolvedValue({
    id: "order-1",
    orderNumber: "PR-2026-000101",
    userId: TEST_USER_ID,
    amount: 49.99,
    paymentStatus: "pending",
    paymentMethod: "yappy",
    customerName: "Cliente Prueba",
    customerEmail: "cliente@example.com",
    customerPhone: null,
    provider: "manual",
    providerReference: null,
    manualPaymentReference: null,
    paymentProofUrl: null,
    currency: "usd",
  } as never);
  mockGenerateOrderNumber.mockResolvedValue("PR-2026-000101");
  mockSyncRealOrderToOperations.mockResolvedValue(undefined);
}

describe("POST /api/orders/manual", () => {
  beforeEach(() => {
    resetAllMocks();
    mockGenerateOrderNumber.mockReset();
    mockSyncRealOrderToOperations.mockReset();
    mockPrisma.package.findUnique.mockReset();
    mockPrisma.order.create.mockReset();
    mockPrisma.$transaction.mockReset();
  });

  it("returns 401 without session", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);

    const res = await POST(createManualOrderRequest());
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.error).toMatch(/autorizado/i);
  });

  it("creates a manual order and syncs operations with customer_request", async () => {
    setupDefaultMocks();

    const res = await POST(
      createManualOrderRequest({
        packageId: TEST_PACKAGE_ID,
        customerName: "Cliente Prueba",
        customerEmail: "cliente@example.com",
        paymentMethod: "yappy",
      })
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.order.provider).toBe("manual");
    expect(json.order.paymentStatus).toBe("pending");
    expect(mockGenerateOrderNumber).toHaveBeenCalled();
    expect(mockPrisma.order.create).toHaveBeenCalled();
    expect(mockSyncRealOrderToOperations).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        sourceType: "customer_request",
        sourceId: "order-1",
        sourceCode: "PR-2026-000101",
        paymentStatus: "pending",
      })
    );
  });

  it("returns 400 for inactive package", async () => {
    setupDefaultMocks();
    mockPrisma.package.findUnique.mockResolvedValue({
      id: TEST_PACKAGE_ID,
      isActive: false,
    } as never);

    const res = await POST(
      createManualOrderRequest({
        packageId: TEST_PACKAGE_ID,
        customerName: "Cliente Prueba",
        customerEmail: "cliente@example.com",
        paymentMethod: "bank_transfer",
      })
    );
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toMatch(/paquete no disponible/i);
    expect(mockPrisma.order.create).not.toHaveBeenCalled();
  });
});
