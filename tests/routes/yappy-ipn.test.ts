import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { mockPrisma } from "../helpers/mock-prisma";
import { resetAllMocks } from "../helpers/reset-mocks";

const mockVerifySignature = vi.hoisted(() => vi.fn());
const mockEnqueueStoredSync = vi.hoisted(() => vi.fn());
const mockEnsurePendingInvoice = vi.hoisted(() => vi.fn());

vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/lib/payments/yappy", async () => {
  const actual = await vi.importActual<typeof import("@/lib/payments/yappy")>("@/lib/payments/yappy");
  return { ...actual, verifyYappyIpnSignature: mockVerifySignature };
});
vi.mock("@/lib/operations/commerce-order-sync-outbox", () => ({
  enqueueStoredCommerceOrderSyncOutbox: mockEnqueueStoredSync,
}));
vi.mock("@/domains/invoices/services/invoice.service", () => ({
  InvoiceService: { ensurePendingForPaidOrder: mockEnsurePendingInvoice },
}));

import { GET } from "@/app/api/payments/yappy/ipn/route";

const HASH = "a".repeat(64);

function request(status = "E") {
  return new NextRequest(
    `http://localhost/api/payments/yappy/ipn?orderId=P12345678901234&status=${status}&hash=${HASH}&domain=https%3A%2F%2Fprerescatepty.com`
  );
}

function setup() {
  mockVerifySignature.mockReturnValue(true);
  mockPrisma.paymentAttempt.findUnique
    .mockResolvedValueOnce({
      id: "attempt-1",
      orderId: "order-1",
      order: { packageId: null },
    } as never)
    .mockResolvedValue({ status: "pending" } as never);
  mockPrisma.paymentEvent.findUnique.mockResolvedValue(null);
  mockPrisma.operationCommercialOrder.findFirst.mockResolvedValue(null);
  mockEnqueueStoredSync.mockResolvedValue({ id: "outbox-1" });
  mockEnsurePendingInvoice.mockResolvedValue({ id: "invoice-1" });
}

describe("GET /api/payments/yappy/ipn", () => {
  beforeEach(() => {
    resetAllMocks();
    mockVerifySignature.mockReset();
    mockEnqueueStoredSync.mockReset();
    mockEnsurePendingInvoice.mockReset();
    setup();
  });

  it("marks the attempt and order paid only after a valid executed IPN", async () => {
    const response = await GET(request("E"));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true });
    expect(mockPrisma.paymentEvent.create).toHaveBeenCalledTimes(1);
    expect(mockPrisma.paymentAttempt.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: "succeeded" }),
    }));
    expect(mockPrisma.order.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ paymentStatus: "paid", orderStatus: "processing", provider: "yappy" }),
    }));
    expect(mockEnqueueStoredSync).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      orderId: "order-1",
      sourceType: "checkout",
    }));
    expect(mockEnsurePendingInvoice).toHaveBeenCalledWith(expect.anything(), {
      orderId: "order-1",
      sourcePaymentAttemptId: "attempt-1",
    });
  });

  it("records a rejected attempt without rejecting the reusable order", async () => {
    const response = await GET(request("R"));

    expect(response.status).toBe(200);
    expect(mockPrisma.paymentAttempt.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: "rejected" }),
    }));
    expect(mockPrisma.order.update).not.toHaveBeenCalled();
    expect(mockEnqueueStoredSync).not.toHaveBeenCalled();
    expect(mockEnsurePendingInvoice).not.toHaveBeenCalled();
  });

  it("rejects an invalid signature without touching payment state", async () => {
    mockVerifySignature.mockReturnValue(false);
    const response = await GET(request("E"));

    expect(response.status).toBe(401);
    expect(mockPrisma.paymentAttempt.findUnique).not.toHaveBeenCalled();
    expect(mockPrisma.paymentEvent.create).not.toHaveBeenCalled();
  });

  it("acknowledges the same provider event only once", async () => {
    mockPrisma.paymentEvent.findUnique.mockResolvedValue({ id: "event-1" } as never);
    const response = await GET(request("E"));

    expect(response.status).toBe(200);
    expect(mockPrisma.paymentEvent.create).not.toHaveBeenCalled();
    expect(mockPrisma.order.update).not.toHaveBeenCalled();
  });

  it("never downgrades a successful attempt with a later rejected event", async () => {
    mockPrisma.paymentAttempt.findUnique.mockReset();
    mockPrisma.paymentAttempt.findUnique
      .mockResolvedValueOnce({ id: "attempt-1", orderId: "order-1", order: { packageId: null } } as never)
      .mockResolvedValueOnce({ status: "succeeded" } as never);

    const response = await GET(request("R"));

    expect(response.status).toBe(200);
    expect(mockPrisma.paymentEvent.create).toHaveBeenCalledTimes(1);
    expect(mockPrisma.paymentAttempt.update).not.toHaveBeenCalled();
    expect(mockPrisma.order.update).not.toHaveBeenCalled();
  });

  it("resyncs package purchases into their existing customer-request operation", async () => {
    mockPrisma.paymentAttempt.findUnique.mockReset();
    mockPrisma.paymentAttempt.findUnique
      .mockResolvedValueOnce({ id: "attempt-1", orderId: "order-1", order: { packageId: "pkg-1" } } as never)
      .mockResolvedValueOnce({ status: "pending" } as never);
    mockPrisma.operationCommercialOrder.findFirst.mockResolvedValue({ sourceType: "customer_request" } as never);

    const response = await GET(request("E"));

    expect(response.status).toBe(200);
    expect(mockEnqueueStoredSync).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      orderId: "order-1",
      sourceType: "customer_request",
    }));
  });
});
