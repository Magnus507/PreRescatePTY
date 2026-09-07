import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { mockPrisma, resetMockPrisma } from "../helpers/mock-prisma";
const { session, sign } = vi.hoisted(() => ({ session: vi.fn(), sign: vi.fn() }));
vi.mock("next-auth", () => ({ getServerSession: session }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/lib/rateLimit", () => ({ rateLimit: vi.fn().mockResolvedValue({ allowed: true }) }));
vi.mock("@supabase/supabase-js", () => ({ createClient: () => ({ storage: { from: () => ({ createSignedUploadUrl: sign }) } }) }));
import { POST } from "@/app/api/orders/[id]/payment-proof/upload-url/route";
const order = { id: "o", userId: "u", provider: "manual", paymentStatus: "pending", orderStatus: "pending", adminReviewStatus: "pending" };
function call(mimeType = "image/png", size = 20) {
  return POST(new NextRequest("http://localhost/api/orders/o/payment-proof/upload-url", { method: "POST", body: JSON.stringify({ mimeType, size }) }), { params: Promise.resolve({ id: "o" }) });
}
describe("signed proof authorization", () => {
  beforeEach(() => { resetMockPrisma(); sign.mockReset().mockResolvedValue({ data: { token: "fixture", signedUrl: "https://storage.test/signed" } }); session.mockResolvedValue({ user: { id: "u" } }); mockPrisma.order.findUnique.mockResolvedValue(order as never); });
  it.each(["image/jpeg", "image/png", "image/webp"])("signs allowed %s under exact owner and order", async mime => {
    expect((await call(mime)).status).toBe(200);
    expect(sign.mock.calls[0][0]).toMatch(/^payments\/u\/o\//);
  });
  it("rejects an unauthenticated request", async () => { session.mockResolvedValue(null); expect((await call()).status).toBe(401); expect(sign).not.toHaveBeenCalled(); });
  it.each([{ userId: "other" }, { provider: "yappy" }, { paymentStatus: "paid", orderStatus: "completed", adminReviewStatus: "approved" }])("rejects ineligible order %s", async override => {
    mockPrisma.order.findUnique.mockResolvedValue({ ...order, ...override } as never);
    expect([400, 404]).toContain((await call()).status); expect(sign).not.toHaveBeenCalled();
  });
  it.each(["application/pdf", "text/html"])("rejects %s", async mime => { expect((await call(mime)).status).toBe(400); expect(sign).not.toHaveBeenCalled(); });
  it("rejects oversized uploads", async () => { expect((await call("image/png", 5 * 1024 * 1024 + 1)).status).toBe(400); expect(sign).not.toHaveBeenCalled(); });
});
