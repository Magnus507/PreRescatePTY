import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(path, "utf8");
}

describe("Block 1 delivered projection recovery guardrails", () => {
  it("runs strict delivered projection recovery from the existing commerce worker", () => {
    const cron = source("app/api/cron/commerce-order-sync/route.ts");
    expect(cron).toContain("recoverDeliveredCommercialOrderProjections");
    expect(cron).toContain("deliveredProjectionRecovery");
    expect(cron).toContain("recordCronSuccess");
  });

  it("makes an idempotent delivery retry capable of healing a proven stale projection", () => {
    const route = source("app/api/admin/operations/dispatches/[id]/confirm-delivery/route.ts");
    expect(route).toContain("reconcileDeliveredCommercialOrderProjection");
    expect(route).toContain('if (current.status === "delivered")');
    expect(route).toContain("idempotent: true");
  });

  it("fails closed unless source, dispatch, items and physical units all prove delivery", () => {
    const recovery = source("lib/operations/delivered-commercial-order-reconciliation.ts");
    expect(recovery).toContain('sourceOrder.orderStatus !== "completed"');
    expect(recovery).toContain('sourceOrder.paymentStatus !== "paid"');
    expect(recovery).toContain('dispatch.status !== "delivered"');
    expect(recovery).toContain('item.status !== "delivered"');
    expect(recovery).toContain("!item.unitRecord.deliveredAt");
    expect(recovery).toContain("item.unitRecord.reservedOrderId !== reservationOwnerId");
    expect(recovery).toContain('eventType: "DELIVERY_RECONCILED"');
    expect(recovery).not.toContain("operationDispatch.create");
    expect(recovery).not.toContain("operationFinishedGoodUnit.update");
  });
});
