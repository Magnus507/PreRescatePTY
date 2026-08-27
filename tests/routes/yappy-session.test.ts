import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { mockPrisma } from "../helpers/mock-prisma";
import { resetAllMocks } from "../helpers/reset-mocks";
import { createMockSession } from "../helpers/mock-auth";

const mockRateLimit = vi.hoisted(() => vi.fn());
const mockCreateYappyCheckout = vi.hoisted(() => vi.fn());

vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/lib/rateLimit", () => ({ rateLimit: mockRateLimit }));
vi.mock("@/lib/encryption", () => ({
  encryptSensitiveValue: vi.fn((value: string) => `encrypted:${value}`),
  decryptSensitiveValue: vi.fn((value: string) => ({ plaintext: value.replace(/^encrypted:/, "") })),
}));
vi.mock("@/lib/payments/yappy", async () => {
  const actual = await vi.importActual<typeof import("@/lib/payments/yappy")>("@/lib/payments/yappy");
  return {
    ...actual,
    createYappyCheckout: mockCreateYappyCheckout,
    getYappyButtonScriptUrl: vi.fn(() => "https://cdn.example/yappy.js"),
  };
});

import { getServerSession } from "next-auth";
import { POST } from "@/app/api/payments/yappy/[orderId]/session/route";

function request(aliasYappy = "+507 6123-4567") {
  return new NextRequest("http://localhost/api/payments/yappy/order-1/session", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Idempotency-Key": "click-1" },
    body: JSON.stringify({ aliasYappy }),
  });
}

function setup() {
  vi.mocked(getServerSession).mockResolvedValue(createMockSession({ id: "user-1" }) as never);
  mockRateLimit.mockResolvedValue({ allowed: true });
  mockPrisma.order.findUnique.mockResolvedValue({
    id: "order-1",
    userId: "user-1",
    amount: "25.00",
    currency: "USD",
    paymentStatus: "pending",
    orderStatus: "pending",
    paymentMethod: "yappy",
    customerPhone: null,
  } as never);
  mockPrisma.paymentAttempt.findUnique.mockResolvedValue(null);
  mockPrisma.paymentAttempt.create.mockResolvedValue({ id: "attempt-1" } as never);
  mockCreateYappyCheckout.mockResolvedValue({
    transactionId: "tx-1",
    documentName: "doc-1",
    token: "token-1",
  });
}

describe("POST /api/payments/yappy/[orderId]/session", () => {
  beforeEach(() => {
    resetAllMocks();
    mockRateLimit.mockReset();
    mockCreateYappyCheckout.mockReset();
    setup();
  });

  it("uses the persisted order amount and creates a separate payment attempt", async () => {
    const response = await POST(request(), { params: Promise.resolve({ orderId: "order-1" }) });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toMatchObject({ attemptId: "attempt-1", transactionId: "tx-1", token: "token-1" });
    expect(mockCreateYappyCheckout).toHaveBeenCalledWith(expect.objectContaining({
      aliasYappy: "61234567",
      subtotal: "25.00",
      total: "25.00",
    }));
    expect(mockPrisma.paymentAttempt.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ orderId: "order-1", amount: "25.00", status: "created" }),
    }));
    expect(mockPrisma.order.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ provider: "yappy", customerPhone: "61234567" }),
    }));
  });

  it("does not let another user pay the order", async () => {
    mockPrisma.order.findUnique.mockResolvedValue({
      id: "order-1",
      userId: "other-user",
      amount: "25.00",
      currency: "USD",
      paymentStatus: "pending",
      orderStatus: "pending",
      paymentMethod: "yappy",
    } as never);

    const response = await POST(request(), { params: Promise.resolve({ orderId: "order-1" }) });
    expect(response.status).toBe(404);
    expect(mockCreateYappyCheckout).not.toHaveBeenCalled();
  });

  it("does not create a second payment for a paid order", async () => {
    mockPrisma.order.findUnique.mockResolvedValue({
      id: "order-1",
      userId: "user-1",
      amount: "25.00",
      currency: "USD",
      paymentStatus: "paid",
      orderStatus: "processing",
      paymentMethod: "yappy",
    } as never);

    const response = await POST(request(), { params: Promise.resolve({ orderId: "order-1" }) });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ paid: true });
    expect(mockCreateYappyCheckout).not.toHaveBeenCalled();
  });

  it("rejects an invalid Yappy alias before contacting the provider", async () => {
    const response = await POST(request("123"), { params: Promise.resolve({ orderId: "order-1" }) });
    expect(response.status).toBe(400);
    expect(mockCreateYappyCheckout).not.toHaveBeenCalled();
  });
});
