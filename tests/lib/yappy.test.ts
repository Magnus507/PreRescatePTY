import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createYappyCheckout,
  normalizeYappyAlias,
  verifyYappyIpnSignature,
} from "@/lib/payments/yappy";

describe("Yappy V2 client", () => {
  beforeEach(() => {
    vi.stubEnv("YAPPY_ENVIRONMENT", "uat");
    vi.stubEnv("YAPPY_MERCHANT_ID", "merchant-1");
    vi.stubEnv("YAPPY_DOMAIN", "https://prerescatepty.com");
    vi.stubEnv("YAPPY_SECRET_KEY", Buffer.from("ipn-secret.extra").toString("base64"));
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("normalizes Panama aliases without accepting malformed numbers", () => {
    expect(normalizeYappyAlias("+507 6123-4567")).toBe("61234567");
    expect(normalizeYappyAlias("6123 4567")).toBe("61234567");
    expect(normalizeYappyAlias("123")).toBeNull();
  });

  it("validates the official HMAC using constant input order", () => {
    const orderId = "P12345678901234";
    const status = "E";
    const domain = "https://prerescatepty.com";
    const hash = createHmac("sha256", "ipn-secret")
      .update(`${orderId}${status}${domain}`)
      .digest("hex");

    expect(verifyYappyIpnSignature({ orderId, status, domain, hash })).toBe(true);
    expect(verifyYappyIpnSignature({ orderId, status: "R", domain, hash })).toBe(false);
    expect(verifyYappyIpnSignature({ orderId, status, domain: "https://otro.example", hash })).toBe(false);
  });

  it("creates the Yappy order using backend amounts and the configured IPN", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ body: { token: "merchant-token", epochTime: 123456 } }), { status: 200 })
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ body: { transactionId: 9988, documentName: "payment-doc", token: "payment-token" } }),
          { status: 200 }
        )
      );
    vi.stubGlobal("fetch", fetchMock);

    const session = await createYappyCheckout({
      providerOrderId: "P12345678901234",
      aliasYappy: "61234567",
      subtotal: "25.00",
      total: "25.00",
    });

    expect(session).toEqual({ transactionId: "9988", documentName: "payment-doc", token: "payment-token" });
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "https://api-comecom-uat.yappycloud.com/payments/payment-wc",
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: "merchant-token" }),
        body: JSON.stringify({
          merchantId: "merchant-1",
          orderId: "P12345678901234",
          domain: "https://prerescatepty.com",
          paymentDate: 123456,
          aliasYappy: "61234567",
          ipnUrl: "https://prerescatepty.com/api/payments/yappy/ipn",
          discount: "0.00",
          taxes: "0.00",
          subtotal: "25.00",
          total: "25.00",
        }),
      })
    );
  });
});
