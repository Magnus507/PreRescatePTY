import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { uploadPaymentProof } from "@/lib/payment-proof-upload";
const request = vi.fn();
const ok = (data = {}) => new Response(JSON.stringify(data), { status: 200 });
describe("shared direct payment proof upload", () => {
  beforeEach(() => { request.mockReset(); vi.stubGlobal("fetch", request); });
  afterEach(() => vi.unstubAllGlobals());
  it.each(["image/jpeg", "image/png", "image/webp"])("uploads %s raw bytes and associates only the signed path", async type => {
    request.mockResolvedValueOnce(ok({ path: "payments/u/o/file", signedUrl: "https://storage.test/signed" })).mockResolvedValueOnce(ok()).mockResolvedValueOnce(ok());
    await uploadPaymentProof("o", new File(["image bytes"], "proof", { type }), " REF ");
    expect(request.mock.calls[0][0]).toBe("/api/orders/o/payment-proof/upload-url");
    expect(request.mock.calls[1][1].body).toBeInstanceOf(ArrayBuffer);
    expect(request.mock.calls[1][1].method).toBe("PUT");
    expect(JSON.parse(request.mock.calls[2][1].body)).toEqual({ paymentProofPath: "payments/u/o/file", manualPaymentReference: "REF" });
  });
  it.each(["application/pdf", "text/html", "image/heic"])("rejects unsupported %s before network", async type => {
    await expect(uploadPaymentProof("o", new File(["bytes"], "proof", { type }))).rejects.toThrow(/JPG/);
    expect(request).not.toHaveBeenCalled();
  });
  it.each([0, 5 * 1024 * 1024 + 1])("rejects invalid size %s", async size => {
    await expect(uploadPaymentProof("o", { size, type: "image/png" } as File)).rejects.toThrow(/5MB/);
    expect(request).not.toHaveBeenCalled();
  });
  it("does not upload for an ineligible order", async () => {
    request.mockResolvedValueOnce(new Response(JSON.stringify({ error: "Pedido no encontrado" }), { status: 404 }));
    await expect(uploadPaymentProof("other", new File(["bytes"], "proof", { type: "image/png" }))).rejects.toThrow(/Pedido/);
    expect(request).toHaveBeenCalledTimes(1);
  });
  it("a failed upload does not register; retry obtains a fresh signed path", async () => {
    const file = new File(["bytes"], "proof", { type: "image/png" });
    request.mockResolvedValueOnce(ok({ path: "old", signedUrl: "https://storage.test/old" })).mockResolvedValueOnce(new Response("", { status: 500 }));
    await expect(uploadPaymentProof("o", file)).rejects.toThrow();
    expect(request).toHaveBeenCalledTimes(2);
    request.mockResolvedValueOnce(ok({ path: "new", signedUrl: "https://storage.test/new" })).mockResolvedValueOnce(ok()).mockResolvedValueOnce(ok());
    await uploadPaymentProof("o", file);
    expect(JSON.parse(request.mock.calls[4][1].body).paymentProofPath).toBe("new");
  });
});
