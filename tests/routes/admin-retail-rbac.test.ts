import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { requireRole } = vi.hoisted(() => ({ requireRole: vi.fn() }));

vi.mock("@/lib/rbac", () => ({
  ORDER_REVIEW_ROLES: ["admin", "superadmin"],
  requireRole,
}));

vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("@/lib/rateLimit", () => ({ rateLimit: vi.fn() }));
vi.mock("@/domains/invoices/services/invoice.service", () => ({
  InvoiceService: { ensurePendingForPaidOrder: vi.fn() },
}));
vi.mock("@/domains/chips/token-lifecycle.helpers", () => ({ TOKEN_AVAILABLE_WHERE: {} }));
vi.mock("@/lib/order-number", () => ({ generateOrderNumber: vi.fn() }));
vi.mock("@/lib/identifiers", () => ({ getUniqueActivationCode: vi.fn() }));
vi.mock("@/domains/chips/activation-code.service", () => ({ protectActivationCode: vi.fn() }));
vi.mock("@/lib/audit", () => ({ getAuditRequestId: vi.fn(), writeAuditLog: vi.fn() }));

import { GET as listPoints, POST as createPoint } from "@/app/api/admin/points-of-sale/route";
import { POST as consign } from "@/app/api/admin/points-of-sale/[id]/consign/route";
import { POST as returnFromPoint } from "@/app/api/admin/points-of-sale/[id]/return/route";
import { POST as markLost } from "@/app/api/admin/points-of-sale/[id]/mark-lost/route";
import { POST as retailSell } from "@/app/api/admin/retail/sell/route";

const denied = () => ({
  authorized: false as const,
  response: new Response(JSON.stringify({ error: "No autorizado" }), { status: 403 }),
});

describe("retail and point-of-sale authorization", () => {
  it("rejects every financial or inventory mutation when the fresh role guard denies access", async () => {
    requireRole.mockResolvedValue(denied());
    const req = new NextRequest("https://example.test/api/admin/points-of-sale", { method: "POST" });

    const responses = await Promise.all([
      listPoints(req),
      createPoint(req),
      consign(req, { params: Promise.resolve({ id: "pos-1" }) }),
      returnFromPoint(req, { params: Promise.resolve({ id: "pos-1" }) }),
      markLost(req, { params: Promise.resolve({ id: "pos-1" }) }),
      retailSell(req),
    ]);

    expect(responses.map((response) => response.status)).toEqual([403, 403, 403, 403, 403, 403]);
    expect(requireRole).toHaveBeenCalledTimes(6);
  });
});
