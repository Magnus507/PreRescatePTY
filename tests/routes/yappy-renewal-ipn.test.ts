import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { mockPrisma } from "../helpers/mock-prisma";
import { resetAllMocks } from "../helpers/reset-mocks";

const mockVerifySignature = vi.hoisted(() => vi.fn());
const mockGrantRenewal = vi.hoisted(() => vi.fn());
const mockInvalidateCache = vi.hoisted(() => vi.fn());

vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/lib/payments/yappy", async () => {
  const actual = await vi.importActual<typeof import("@/lib/payments/yappy")>("@/lib/payments/yappy");
  return { ...actual, verifyYappyIpnSignature: mockVerifySignature };
});
vi.mock("@/domains/accounts/services/service-entitlement.service", () => ({
  grantForConfirmedRenewalPayment: mockGrantRenewal,
}));
vi.mock("@/domains/accounts/services/account-state.service", () => ({
  AccountStateService: { invalidateCache: mockInvalidateCache },
}));
vi.mock("@/lib/operations/commerce-order-sync-outbox", () => ({
  enqueueStoredCommerceOrderSyncOutbox: vi.fn(),
}));
vi.mock("@/domains/invoices/services/invoice.service", () => ({
  InvoiceService: { ensurePendingForPaidOrder: vi.fn() },
}));

import { GET } from "@/app/api/payments/yappy/ipn/route";

const HASH = "b".repeat(64);

function request(status = "E") {
  return new NextRequest(
    `http://localhost/api/payments/yappy/ipn?orderId=R12345678901234&status=${status}&hash=${HASH}&domain=https%3A%2F%2Fprerescatepty.com`
  );
}

function setup() {
  mockVerifySignature.mockReturnValue(true);
  mockPrisma.paymentAttempt.findUnique.mockResolvedValue(null);
  mockPrisma.renewalPayment.findUnique
    .mockResolvedValueOnce({
      id: "renewal-1",
      accountId: "account-1",
      status: "pending",
    } as never)
    .mockResolvedValue({
      status: "pending",
      accountId: "account-1",
    } as never);
  mockPrisma.renewalPaymentEvent.findUnique.mockResolvedValue(null);
  mockPrisma.user.findMany.mockResolvedValue([{ id: "user-1" }] as never);
  mockGrantRenewal.mockResolvedValue({ applied: true });
  mockInvalidateCache.mockResolvedValue(undefined);
}

describe("GET /api/payments/yappy/ipn annual renewal", () => {
  beforeEach(() => {
    resetAllMocks();
    mockVerifySignature.mockReset();
    mockGrantRenewal.mockReset();
    mockInvalidateCache.mockReset();
    setup();
  });

  it("grants 12-month entitlement only after a valid executed renewal IPN", async () => {
    const response = await GET(request("E"));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true });
    expect(mockPrisma.renewalPaymentEvent.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        paymentId: "renewal-1",
        eventType: "yappy.succeeded",
        signatureVerified: true,
      }),
    }));
    expect(mockPrisma.renewalPayment.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "renewal-1" },
      data: expect.objectContaining({ status: "succeeded" }),
    }));
    expect(mockGrantRenewal).toHaveBeenCalledWith(expect.anything(), {
      accountId: "account-1",
      paymentId: "renewal-1",
    });
    expect(mockInvalidateCache).toHaveBeenCalledWith("user-1");
  });

  it("records a rejected renewal without granting entitlement", async () => {
    const response = await GET(request("R"));

    expect(response.status).toBe(200);
    expect(mockPrisma.renewalPayment.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: "rejected" }),
    }));
    expect(mockGrantRenewal).not.toHaveBeenCalled();
    expect(mockInvalidateCache).not.toHaveBeenCalled();
  });

  it("rejects an invalid signature before touching renewal state", async () => {
    mockVerifySignature.mockReturnValue(false);

    const response = await GET(request("E"));

    expect(response.status).toBe(401);
    expect(mockPrisma.paymentAttempt.findUnique).not.toHaveBeenCalled();
    expect(mockPrisma.renewalPayment.findUnique).not.toHaveBeenCalled();
    expect(mockGrantRenewal).not.toHaveBeenCalled();
  });

  it("acknowledges a duplicate signed renewal event without granting twice", async () => {
    mockPrisma.renewalPaymentEvent.findUnique.mockResolvedValue({ id: "event-1" } as never);

    const response = await GET(request("E"));

    expect(response.status).toBe(200);
    expect(mockPrisma.renewalPaymentEvent.create).not.toHaveBeenCalled();
    expect(mockGrantRenewal).not.toHaveBeenCalled();
  });
});
