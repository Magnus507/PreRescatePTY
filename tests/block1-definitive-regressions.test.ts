import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { getCommercialOrderReservationOwnerId } from "@/app/api/admin/operations/commercial-orders/commercial-orders.helpers";

function source(path: string) {
  return readFileSync(path, "utf8");
}

describe("Block 1 definitive fulfillment guardrails", () => {
  it("uses one canonical owner for source-backed and standalone reservations", () => {
    expect(getCommercialOrderReservationOwnerId({ id: "commercial", sourceId: "checkout" })).toBe("checkout");
    expect(getCommercialOrderReservationOwnerId({ id: "commercial", sourceId: null })).toBe("commercial");

    const engine = source("lib/operations/commercial-order-reservation.ts");
    const detail = source("app/api/admin/operations/commercial-orders/[id]/route.ts");
    const list = source("app/api/admin/operations/commercial-orders/route.ts");
    expect(engine).toContain("getCommercialOrderReservationOwnerId(order)");
    expect(detail).toContain("getCommercialOrderReservationOwnerId(commercialOrder)");
    expect(list).toContain("reservationOwnerByOrderId");
    expect(list).toContain("getCommercialOrderReservationOwnerId(order)");
  });

  it("keeps manual inventory reservation paid-only with no confirmation bypass", () => {
    const route = source("app/api/admin/operations/commercial-orders/[id]/reserve-stock/route.ts");
    expect(route).toContain('order.paymentStatus !== "paid"');
    expect(route).toContain("ORDER_PAYMENT_NOT_PAID");
    expect(route).not.toContain("confirmPendingPayment");
  });

  it("routes partial commercial release through the shared fail-closed helper", () => {
    const route = source("app/api/admin/operations/commercial-orders/[id]/release-reservation/route.ts");
    const helper = source("lib/operations/release-order-reservations.ts");
    expect(route).toContain("releaseEligibleOrderReservations");
    expect(route).toContain("unitIds: unitsToRelease.map");
    expect(route).toContain("RESERVATION_RELEASE_BLOCKED");
    expect(route).not.toContain("operationFinishedGoodUnitEvent.createMany");
    expect(helper).toContain("unitIds?: string[]");
    expect(helper).toContain("dispatchedAt: null");
    expect(helper).toContain("deliveredAt: null");
    expect(helper).toContain("activatedAt: null");
    expect(helper).toContain('activationStatus: { not: "activated" }');
    expect(helper).toContain("dispatchItems: { none: {} }");
  });

  it("hardens the actual Pedidos dispatch route at quantity, SKU, ownership and concurrency boundaries", () => {
    const route = source("app/api/admin/orders/[id]/send-to-dispatch/route.ts");
    expect(route).toContain("const orderLock = await tx.order.updateMany");
    expect(route).toContain("OPERATIONAL_ORDER_REQUIRED");
    expect(route).toContain("AMBIGUOUS_OPERATIONAL_ORDER");
    expect(route).toContain("requiredByProductCode");
    expect(route).toContain("reservedByProductCode");
    expect(route).toContain("PRODUCT_RESERVATION_MISMATCH");
    expect(route).toContain("dispatchItems: { none: {} }");
    expect(route).toContain('status: { not: "cancelled" }');
    expect(route).toContain("getAvailableDispatchCode");
    expect(route).toContain("validateExistingCustomerDispatch");
    expect(route).toContain("EXISTING_DISPATCH_MISMATCH");
    expect(route).toContain("EXISTING_DISPATCH_ALREADY_DELIVERED");
    expect(route).toContain('dispatch.status === "delivered"');
    expect(route).toContain('unit.reservedOrderId !== order.id');
    expect(route).toContain('unit.dispatchItems.length !== 1');
    expect(route).toContain('unit.status !== "dispatched"');
  });

  it("prevents arbitrary customer dispatch ownership through manual commercial-order creation", () => {
    const route = source("app/api/admin/operations/commercial-orders/route.ts");
    expect(route).toContain("CUSTOMER_DISPATCH_REQUIRES_DEDICATED_FLOW");
    expect(route).toContain("DISPATCH_ALREADY_OWNED");
    expect(route).toContain("findFirst");
    expect(route).toContain("dispatchId: data.dispatchId");
  });
});
