import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { assertIntegrationDatabaseReady, createIntegrationPrismaClient, prepareIntegrationEnvironment, seedIntegrationUser } from "./integration-db";
import { releaseEligibleOrderReservations } from "@/lib/operations/release-order-reservations";
const auth = vi.hoisted(() => vi.fn());
vi.mock("@/lib/rbac", () => ({ GENERAL_ADMIN_ROLES: ["admin"], requireRole: auth }));
const db = createIntegrationPrismaClient();
const run = `fulfillment-${Date.now()}`;
let delivery: typeof import("@/app/api/admin/operations/dispatches/[id]/confirm-delivery/route").POST;
let history: typeof import("@/lib/operations/operation-history").getOperationHistory;
describe("real PostgreSQL fulfillment and support history", () => {
  beforeAll(async () => {
    prepareIntegrationEnvironment(); await assertIntegrationDatabaseReady(db);
    const user = await seedIntegrationUser(db, { email: `${run}@example.invalid` });
    auth.mockResolvedValue({ authorized: true, session: { user: { id: user.id } } });
    ({ POST: delivery } = await import("@/app/api/admin/operations/dispatches/[id]/confirm-delivery/route"));
    ({ getOperationHistory: history } = await import("@/lib/operations/operation-history"));
  });
  afterAll(async () => { await db.$disconnect(); });
  it("delivery preserves allocation, appears in history, and cannot be released to stock", async () => {
    const dispatch = await db.operationDispatch.create({ data: { code: `${run}-dispatch`, status: "dispatched" } });
    const order = await db.operationCommercialOrder.create({ data: { code: `${run}-delivered`, status: "dispatched", dispatchId: dispatch.id } });
    const unit = await db.operationFinishedGoodUnit.create({ data: { internalLabel: run, productCode: run, productName: "Fixture", productType: "test", status: "dispatched", qaStatus: "passed", reservedOrderId: order.id } });
    await db.operationDispatchItem.create({ data: { dispatchId: dispatch.id, unitId: unit.id, quantity: 1, unit: "piece" } });
    expect((await delivery(new NextRequest("http://localhost/delivery", { method: "POST", body: "{}" }), { params: Promise.resolve({ id: dispatch.id }) })).status).toBe(200);
    const delivered = await db.operationFinishedGoodUnit.findUniqueOrThrow({ where: { id: unit.id } });
    expect(delivered.status).toBe("delivered"); expect(delivered.activationStatus).toBe("not_activated"); expect(delivered.reservedOrderId).toBe(order.id);
    const released = await releaseEligibleOrderReservations(db, { orderId: order.id });
    expect(released.releasedCount).toBe(0); expect(released.blockedCount).toBe(1);
    const closed = await db.operationCommercialOrder.create({ data: { code: `${run}-closed`, status: "closed" } });
    const active = await db.operationCommercialOrder.create({ data: { code: `${run}-active`, status: "draft" } });
    const results = await history({ entityType: "commercial_order", search: run });
    const ids = results.suggestions!.map(row => row.id);
    expect(ids).toContain(order.id); expect(ids).toContain(closed.id); expect(ids).not.toContain(active.id); expect(new Set(ids).size).toBe(ids.length);
  });
  it("cancelled reservation returns only an uncommitted unit to stock and records history", async () => {
    const order = await db.operationCommercialOrder.create({ data: { code: `${run}-cancelled`, status: "cancelled" } });
    const unit = await db.operationFinishedGoodUnit.create({ data: { internalLabel: `${run}-reserved`, productCode: run, productName: "Fixture", productType: "test", status: "reserved", qaStatus: "passed", reservedOrderId: order.id } });
    expect((await releaseEligibleOrderReservations(db, { orderId: order.id })).releasedCount).toBe(1);
    const current = await db.operationFinishedGoodUnit.findUniqueOrThrow({ where: { id: unit.id } });
    expect(current.status).toBe("available"); expect(current.reservedOrderId).toBeNull();
    expect(await db.operationFinishedGoodUnitEvent.count({ where: { unitId: unit.id, eventType: "RELEASED", referenceId: order.id } })).toBe(1);
  });
});
