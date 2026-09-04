import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  requireRole: vi.fn(),
  rateLimit: vi.fn(),
  orderFindExternal: vi.fn(),
  memberFind: vi.fn(),
  employeeItemFind: vi.fn(),
  transaction: vi.fn(),
  txOrderFind: vi.fn(),
  txOrderUpdate: vi.fn(),
  employeeItemUpdateMany: vi.fn(),
  chipUpdate: vi.fn(),
  auditCreate: vi.fn(),
  reserveAssignedChips: vi.fn(),
}));

vi.mock("@/lib/rbac", () => ({
  ORDER_REVIEW_ROLES: ["admin", "superadmin"],
  ORDER_FULFILLMENT_ROLES: ["admin", "superadmin"],
  requireRole: mocks.requireRole,
}));

vi.mock("@/lib/rateLimit", () => ({ rateLimit: mocks.rateLimit }));
vi.mock("@/domains/orders/services/order-fulfillment.service", () => ({
  OrderFulfillmentService: { reserveAssignedChipsForOrder: mocks.reserveAssignedChips },
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    order: { findUnique: mocks.orderFindExternal },
    organizationMember: { findUnique: mocks.memberFind },
    corporateOrderEmployeeItem: { findFirst: mocks.employeeItemFind },
    $transaction: mocks.transaction,
  },
}));

import { DELETE as removePaymentProof } from "@/app/api/admin/orders/[id]/payment-proof/route";
import { POST as assignCorporateChip } from "@/app/api/admin/orders/[id]/corporate-assign/route";
import { PATCH as deliverCorporateOrder } from "@/app/api/admin/orders/[id]/corporate-delivery/route";

const orderId = "order-1";
const context = { params: Promise.resolve({ id: orderId }) };

function request(path: string, method: string, body?: unknown) {
  return new NextRequest(`https://example.test${path}`, {
    method,
    headers: { "x-vercel-id": "iad1::audit-order" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

function arrangeCorporateAssignment() {
  mocks.orderFindExternal.mockResolvedValue({
    id: orderId,
    orderType: "corporate_employee_purchase",
    paymentStatus: "paid",
    adminReviewStatus: "approved",
    corporateEmployeeItems: [{
      id: "item-1",
      organizationMemberId: "member-1",
      fulfillmentStatus: "pending_assignment",
      chipId: null,
    }],
  });
  mocks.memberFind
    .mockResolvedValueOnce({ corporateStatus: "paid_active" })
    .mockResolvedValueOnce({ corporateProfileId: "profile-1" });
  mocks.employeeItemFind.mockResolvedValue(null);
}

describe("sensitive admin order mutation audit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireRole.mockResolvedValue({
      authorized: true,
      session: { user: { id: "admin-1", accountId: "admin-account" } },
    });
    mocks.rateLimit.mockResolvedValue({ allowed: true });
    mocks.txOrderFind.mockResolvedValue({
      id: orderId,
      paymentProofUrl: "/api/image-proxy?bucket=payment-proofs&path=secret-proof.webp",
      manualPaymentReference: "TRANSFER-123",
      paymentStatus: "pending",
      adminReviewStatus: "pending",
      orderStatus: "pending",
    });
    mocks.txOrderUpdate.mockResolvedValue({
      id: orderId,
      paymentProofUrl: null,
      manualPaymentReference: null,
      paymentStatus: "pending",
      adminReviewStatus: "pending",
      orderStatus: "pending",
      corporateDeliveryStatus: "delivered",
      deliveryNote: "Lote entregado a empresa",
      estimatedDeliveryDate: new Date("2026-09-04T00:00:00.000Z"),
    });
    mocks.employeeItemUpdateMany.mockResolvedValue({ count: 1 });
    mocks.chipUpdate.mockResolvedValue({ id: "chip-1" });
    mocks.auditCreate.mockResolvedValue({ id: "audit-1" });
    mocks.reserveAssignedChips.mockResolvedValue(undefined);
    mocks.transaction.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) => callback({
      order: { findUnique: mocks.txOrderFind, update: mocks.txOrderUpdate },
      corporateOrderEmployeeItem: { updateMany: mocks.employeeItemUpdateMany },
      chip: { update: mocks.chipUpdate },
      auditLog: { create: mocks.auditCreate },
    }));
  });

  it("removes payment proof state and records sanitized evidence atomically", async () => {
    const response = await removePaymentProof(
      request(`/api/admin/orders/${orderId}/payment-proof`, "DELETE"),
      context,
    );

    expect(response.status).toBe(200);
    const auditData = mocks.auditCreate.mock.calls[0][0].data;
    expect(auditData).toEqual(expect.objectContaining({
      action: "payment_proof_removed",
      entityId: orderId,
      actorUserId: "admin-1",
    }));
    expect(auditData.oldValuesJson).not.toContain("secret-proof.webp");
    expect(auditData.oldValuesJson).not.toContain("TRANSFER-123");
    expect(auditData.oldValuesJson).toContain('"proofAttached":true');
    expect(auditData.oldValuesJson).toContain('"manualReferenceAttached":true');
  });

  it("does not report proof removal when audit persistence fails", async () => {
    mocks.auditCreate.mockRejectedValue(new Error("AUDIT_FAILED"));
    const response = await removePaymentProof(
      request(`/api/admin/orders/${orderId}/payment-proof`, "DELETE"),
      context,
    );
    expect(response.status).toBe(500);
  });

  it("assigns a corporate chip and writes its audit record in the existing transaction", async () => {
    arrangeCorporateAssignment();

    const response = await assignCorporateChip(
      request(`/api/admin/orders/${orderId}/corporate-assign`, "POST", {
        corporateOrderItemId: "item-1",
        chipId: "chip-1",
      }),
      context,
    );

    expect(response.status).toBe(200);
    expect(mocks.reserveAssignedChips).toHaveBeenCalledTimes(1);
    expect(mocks.employeeItemUpdateMany).toHaveBeenCalledTimes(1);
    expect(mocks.chipUpdate).toHaveBeenCalledTimes(1);
    expect(mocks.auditCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "corporate_chip_assigned",
        entityId: "item-1",
        requestId: "iad1::audit-order",
      }),
    });
  });

  it("does not report corporate chip assignment when audit persistence fails", async () => {
    arrangeCorporateAssignment();
    mocks.auditCreate.mockRejectedValue(new Error("AUDIT_FAILED"));

    const response = await assignCorporateChip(
      request(`/api/admin/orders/${orderId}/corporate-assign`, "POST", {
        corporateOrderItemId: "item-1",
        chipId: "chip-1",
      }),
      context,
    );
    expect(response.status).toBe(500);
  });

  it("marks corporate delivery and audit evidence atomically", async () => {
    mocks.orderFindExternal.mockResolvedValue({
      id: orderId,
      orderType: "corporate_employee_purchase",
      paymentStatus: "paid",
      adminReviewStatus: "approved",
      corporateDeliveryStatus: "preparation_pending",
      estimatedDeliveryDate: null,
    });

    const response = await deliverCorporateOrder(
      request(`/api/admin/orders/${orderId}/corporate-delivery`, "PATCH"),
      context,
    );

    expect(response.status).toBe(200);
    expect(mocks.auditCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ action: "corporate_order_delivered", entityId: orderId }),
    });
  });

  it("does not report corporate delivery when audit persistence fails", async () => {
    mocks.orderFindExternal.mockResolvedValue({
      id: orderId,
      orderType: "corporate_employee_purchase",
      paymentStatus: "paid",
      adminReviewStatus: "approved",
      corporateDeliveryStatus: "preparation_pending",
      estimatedDeliveryDate: null,
    });
    mocks.auditCreate.mockRejectedValue(new Error("AUDIT_FAILED"));

    const response = await deliverCorporateOrder(
      request(`/api/admin/orders/${orderId}/corporate-delivery`, "PATCH"),
      context,
    );
    expect(response.status).toBe(500);
  });
});
