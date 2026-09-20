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
import { POST } from "@/app/api/payments/yappy/renewal/session/route";

function request(aliasYappy = "+507 6123-4567", idempotencyKey = "renew-click-1") {
  return new NextRequest("http://localhost/api/payments/yappy/renewal/session", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify({ aliasYappy }),
  });
}

function setup() {
  vi.mocked(getServerSession).mockResolvedValue(createMockSession({ id: "user-1" }) as never);
  mockRateLimit.mockResolvedValue({ allowed: true });
  mockPrisma.user.findUnique.mockResolvedValue({
    accountId: "account-1",
    status: "active",
  } as never);
  mockPrisma.renewalPayment.findUnique.mockResolvedValue(null);
  mockPrisma.renewalPayment.findFirst.mockResolvedValue(null);
  mockPrisma.renewalPayment.create.mockResolvedValue({ id: "renewal-1" } as never);
  mockCreateYappyCheckout.mockResolvedValue({
    transactionId: "tx-renewal-1",
    documentName: "doc-renewal-1",
    token: "token-renewal-1",
  });
}

describe("POST /api/payments/yappy/renewal/session", () => {
  beforeEach(() => {
    resetAllMocks();
    mockRateLimit.mockReset();
    mockCreateYappyCheckout.mockReset();
    vi.mocked(getServerSession).mockReset();
    setup();
  });

  it("creates a renewal payment separate from physical orders using the configured annual price", async () => {
    const response = await POST(request());
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toMatchObject({
      paymentId: "renewal-1",
      amount: "5.00",
      transactionId: "tx-renewal-1",
      token: "token-renewal-1",
    });
    expect(mockCreateYappyCheckout).toHaveBeenCalledWith(expect.objectContaining({
      aliasYappy: "61234567",
      subtotal: "5.00",
      total: "5.00",
    }));
    expect(mockPrisma.renewalPayment.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        accountId: "account-1",
        provider: "yappy",
        currency: "USD",
        status: "created",
      }),
    }));
    expect(mockPrisma.order.create).not.toHaveBeenCalled();
    expect(mockPrisma.paymentAttempt.create).not.toHaveBeenCalled();
  });

  it("reuses the same live pending session for an idempotent retry", async () => {
    mockPrisma.renewalPayment.findUnique.mockResolvedValue({
      id: "renewal-existing",
      status: "pending",
      expiresAt: new Date(Date.now() + 60_000),
      checkoutSessionJson: `encrypted:${JSON.stringify({
        transactionId: "tx-existing",
        documentName: "doc-existing",
        token: "token-existing",
      })}`,
    } as never);

    const response = await POST(request());
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toMatchObject({
      paymentId: "renewal-existing",
      transactionId: "tx-existing",
      token: "token-existing",
    });
    expect(mockPrisma.renewalPayment.create).not.toHaveBeenCalled();
    expect(mockCreateYappyCheckout).not.toHaveBeenCalled();
  });

  it("reuses another live pending session for the same account even with a different click key", async () => {
    mockPrisma.renewalPayment.findFirst.mockResolvedValue({
      id: "renewal-live",
      accountId: "account-1",
      provider: "yappy",
      status: "pending",
      expiresAt: new Date(Date.now() + 60_000),
      checkoutSessionJson: `encrypted:${JSON.stringify({
        transactionId: "tx-live",
        documentName: "doc-live",
        token: "token-live",
      })}`,
    } as never);

    const response = await POST(request("+507 6123-4567", "another-click-key"));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toMatchObject({
      paymentId: "renewal-live",
      transactionId: "tx-live",
      token: "token-live",
    });
    expect(mockPrisma.renewalPayment.findFirst).toHaveBeenCalledWith({
      where: {
        accountId: "account-1",
        provider: "yappy",
        status: "pending",
        expiresAt: { gt: expect.any(Date) },
      },
      orderBy: { createdAt: "desc" },
    });
    expect(mockPrisma.renewalPayment.create).not.toHaveBeenCalled();
    expect(mockCreateYappyCheckout).not.toHaveBeenCalled();
  });

  it("rejects an invalid Yappy alias before contacting the provider", async () => {
    const response = await POST(request("123"));

    expect(response.status).toBe(400);
    expect(mockCreateYappyCheckout).not.toHaveBeenCalled();
    expect(mockPrisma.renewalPayment.create).not.toHaveBeenCalled();
  });

  it("does not allow a user without an active account to start a renewal", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      accountId: "account-1",
      status: "disabled",
    } as never);

    const response = await POST(request());

    expect(response.status).toBe(409);
    expect(mockPrisma.renewalPayment.create).not.toHaveBeenCalled();
    expect(mockCreateYappyCheckout).not.toHaveBeenCalled();
  });
});
