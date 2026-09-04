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
const mockEnqueueCommerceOrderSyncOutbox = vi.hoisted(() => vi.fn());
const mockRateLimit = vi.hoisted(() => vi.fn());

vi.mock("@/lib/order-number", () => ({
  generateOrderNumber: mockGenerateOrderNumber,
}));

vi.mock("@/lib/operations/commerce-order-sync-outbox", () => ({
  enqueueCommerceOrderSyncOutbox: mockEnqueueCommerceOrderSyncOutbox,
}));

vi.mock("@/lib/rateLimit", () => ({
  rateLimit: mockRateLimit,
}));

import { POST } from "@/app/api/orders/manual/route";
import { getServerSession } from "next-auth";

const TEST_USER_ID = "test-user-1";
const TEST_ACCOUNT_ID = "account-1";
const TEST_PACKAGE_ID = "pkg_123";

function createManualOrderRequest(body: Record<string, unknown> = {}) {
  return new NextRequest("http://localhost/api/orders/manual", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

function validManualOrderBody(overrides: Record<string, unknown> = {}) {
  return {
    packageId: TEST_PACKAGE_ID,
    customerName: "Cliente Prueba",
    customerPhone: "6000-0000",
    shippingAddress: "Calle 50, edificio de prueba",
    shippingCity: "Panamá",
    shippingNotes: "Recepción principal",
    paymentMethod: "yappy",
    ...overrides,
  };
}

function setupDefaultMocks() {
  vi.mocked(getServerSession).mockResolvedValue(
    createMockSession({ id: TEST_USER_ID, role: "owner", accountId: TEST_ACCOUNT_ID }) as never
  );
  mockRateLimit.mockResolvedValue({ allowed: true });
  mockPrisma.user.findUnique.mockResolvedValue({
    id: TEST_USER_ID,
    email: "cliente@example.com",
    accountId: TEST_ACCOUNT_ID,
    status: "active",
    deletedAt: null,
  } as never);
  mockPrisma.account.findUnique.mockResolvedValue({
    id: TEST_ACCOUNT_ID,
    accountType: "personal",
  } as never);
  mockPrisma.package.findUnique.mockResolvedValue({
    id: TEST_PACKAGE_ID,
    name: "Plan Básico",
    price: 49.99,
    maxChips: 5,
    isActive: true,
    accountType: "personal",
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
    customerPhone: "6000-0000",
    shippingAddress: "Calle 50, edificio de prueba",
    shippingCity: "Panamá",
    shippingNotes: "Recepción principal",
    provider: "manual",
    providerReference: null,
    manualPaymentReference: null,
    paymentProofUrl: null,
    currency: "usd",
    items: [],
  } as never);
  mockGenerateOrderNumber.mockResolvedValue("PR-2026-000101");
  mockEnqueueCommerceOrderSyncOutbox.mockResolvedValue({ id: "outbox-1" });
}

describe("POST /api/orders/manual", () => {
  beforeEach(() => {
    resetAllMocks();
    mockGenerateOrderNumber.mockReset();
    mockEnqueueCommerceOrderSyncOutbox.mockReset();
    mockRateLimit.mockReset();
    mockPrisma.user.findUnique.mockReset();
    mockPrisma.account.findUnique.mockReset();
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

  it("creates a manual order and its operations outbox atomically", async () => {
    setupDefaultMocks();

    const res = await POST(createManualOrderRequest(validManualOrderBody()));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.order.provider).toBe("manual");
    expect(json.order.paymentStatus).toBe("pending");
    expect(mockGenerateOrderNumber).toHaveBeenCalled();
    expect(mockPrisma.order.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          customerName: "Cliente Prueba",
          customerEmail: "cliente@example.com",
          customerPhone: "6000-0000",
          shippingAddress: "Calle 50, edificio de prueba",
          shippingCity: "Panamá",
        }),
      })
    );
    expect(mockEnqueueCommerceOrderSyncOutbox).toHaveBeenCalledWith(
      mockPrisma,
      expect.objectContaining({
        sourceType: "customer_request",
        sourceId: "order-1",
        sourceCode: "PR-2026-000101",
        paymentStatus: "pending",
      })
    );
    expect(json.operationsSyncStatus).toBe("queued");
    expect(json.operationsSyncWarning).toBeNull();
  });

  it("returns an error and does not expose a created order when outbox insertion fails", async () => {
    setupDefaultMocks();
    mockEnqueueCommerceOrderSyncOutbox.mockRejectedValue(new Error("OUTBOX_UNAVAILABLE"));

    const res = await POST(createManualOrderRequest(validManualOrderBody()));

    expect(res.status).toBe(500);
  });

  it("returns 400 for inactive package", async () => {
    setupDefaultMocks();
    mockPrisma.package.findUnique.mockResolvedValue({
      id: TEST_PACKAGE_ID,
      isActive: false,
    } as never);

    const res = await POST(
      createManualOrderRequest(validManualOrderBody({ paymentMethod: "bank_transfer" }))
    );
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toMatch(/paquete no disponible/i);
    expect(mockPrisma.order.create).not.toHaveBeenCalled();
  });
});
