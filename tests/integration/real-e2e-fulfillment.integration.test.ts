import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import {
  assertIntegrationDatabaseReady,
  createIntegrationPrismaClient,
  prepareIntegrationEnvironment,
  seedIntegrationUser,
} from "./integration-db";
import { releaseEligibleOrderReservations } from "@/lib/operations/release-order-reservations";

const auth = vi.hoisted(() => vi.fn());
vi.mock("@/lib/rbac", () => ({ GENERAL_ADMIN_ROLES: ["admin"], requireRole: auth }));

const db = createIntegrationPrismaClient();
const run = `fulfillment-${Date.now()}`;
let sendToProduction: typeof import("@/app/api/admin/operations/commercial-orders/[id]/send-to-production/route").POST;
let markSent: typeof import("@/app/api/admin/operations/dispatches/[id]/mark-sent/route").POST;
let cancelDispatch: typeof import("@/app/api/admin/operations/dispatches/[id]/cancel/route").POST;
let delivery: typeof import("@/app/api/admin/operations/dispatches/[id]/confirm-delivery/route").POST;
let history: typeof import("@/lib/operations/operation-history").getOperationHistory;

describe("real PostgreSQL fulfillment and support history", () => {
  beforeAll(async () => {
    prepareIntegrationEnvironment();
    await assertIntegrationDatabaseReady(db);
    const user = await seedIntegrationUser(db, { email: `${run}@example.invalid` });
    auth.mockResolvedValue({ authorized: true, session: { user: { id: user.id } } });
    ({ POST: sendToProduction } = await import("@/app/api/admin/operations/commercial-orders/[id]/send-to-production/route"));
    ({ POST: markSent } = await import("@/app/api/admin/operations/dispatches/[id]/mark-sent/route"));
    ({ POST: cancelDispatch } = await import("@/app/api/admin/operations/dispatches/[id]/cancel/route"));
    ({ POST: delivery } = await import("@/app/api/admin/operations/dispatches/[id]/confirm-delivery/route"));
    ({ getOperationHistory: history } = await import("@/lib/operations/operation-history"));
  });

  afterAll(async () => {
    await db.$disconnect();
  });

  it("manual backorder reserves available stock first and only produces the exact remaining shortage", async () => {
    const sku = `${run}-backorder-sku`;
    const order = await db.operationCommercialOrder.create({
      data: {
        code: `${run}-backorder-order`,
        status: "accepted",
        customerType: "customer",
        paymentStatus: "paid",
        fulfillmentStatus: "pending",
        items: {
          create: {
            productCode: sku,
            productName: "Backorder fixture",
            quantity: 5,
            unitPrice: 1,
            totalPrice: 5,
            unit: "unit",
          },
        },
      },
    });

    for (let index = 0; index < 2; index += 1) {
      await db.operationFinishedGoodUnit.create({
        data: {
          internalLabel: `${run}-backorder-reserved-${index}`,
          productCode: sku,
          productName: "Backorder fixture",
          productType: sku,
          status: "reserved",
          qaStatus: "passed",
          activationStatus: "not_activated",
          reservedOrderId: order.id,
        },
      });
    }
    const availableUnit = await db.operationFinishedGoodUnit.create({
      data: {
        internalLabel: `${run}-backorder-available`,
        productCode: sku,
        productName: "Backorder fixture",
        productType: sku,
        status: "available",
        qaStatus: "passed",
        activationStatus: "not_activated",
      },
    });

    const response = await sendToProduction(
      new NextRequest("http://localhost/send-to-production", {
        method: "POST",
        body: JSON.stringify({ mode: "backorder" }),
        headers: { "content-type": "application/json" },
      }),
      { params: Promise.resolve({ id: order.id }) }
    );
    expect(response.status).toBe(201);
    const payload = await response.json();
    expect(payload.products).toEqual([
      expect.objectContaining({ productCode: sku, plannedQuantity: 2, backorderQty: 2 }),
    ]);

    const nowReserved = await db.operationFinishedGoodUnit.count({
      where: { reservedOrderId: order.id, productCode: sku, status: "reserved" },
    });
    expect(nowReserved).toBe(3);
    const claimedAvailable = await db.operationFinishedGoodUnit.findUniqueOrThrow({
      where: { id: availableUnit.id },
    });
    expect(claimedAvailable.status).toBe("reserved");
    expect(claimedAvailable.reservedOrderId).toBe(order.id);

    const productions = await db.operationProductionOrder.findMany({
      where: { notes: { contains: `W605H-B-BACKORDER-PRODUCTION:${order.id}:${sku}` } },
    });
    expect(productions).toHaveLength(1);
    expect(productions[0].plannedQuantity).toBe(2);

    const retry = await sendToProduction(
      new NextRequest("http://localhost/send-to-production", {
        method: "POST",
        body: JSON.stringify({ mode: "backorder" }),
        headers: { "content-type": "application/json" },
      }),
      { params: Promise.resolve({ id: order.id }) }
    );
    expect(retry.status).toBe(200);
    expect(
      await db.operationProductionOrder.count({
        where: { notes: { contains: `W605H-B-BACKORDER-PRODUCTION:${order.id}:${sku}` } },
      })
    ).toBe(1);
    expect(
      await db.operationFinishedGoodUnit.count({
        where: { reservedOrderId: order.id, productCode: sku, status: "reserved" },
      })
    ).toBe(3);
  });

  it("sending a valid dispatch advances the commercial projection without losing allocation", async () => {
    const dispatch = await db.operationDispatch.create({
      data: { code: `${run}-sent-dispatch`, status: "prepared" },
    });
    const order = await db.operationCommercialOrder.create({
      data: {
        code: `${run}-sent-order`,
        status: "processing",
        paymentStatus: "paid",
        fulfillmentStatus: "prepared",
        dispatchId: dispatch.id,
      },
    });
    const unit = await db.operationFinishedGoodUnit.create({
      data: {
        internalLabel: `${run}-sent-unit`,
        productCode: run,
        productName: "Fixture",
        productType: "test",
        status: "reserved",
        qaStatus: "passed",
        activationStatus: "not_activated",
        reservedOrderId: order.id,
      },
    });
    await db.operationDispatchItem.create({
      data: {
        dispatchId: dispatch.id,
        unitId: unit.id,
        quantity: 1,
        unit: "piece",
        status: "packed",
        packedAt: new Date(),
      },
    });

    const response = await markSent(
      new NextRequest("http://localhost/mark-sent", { method: "POST", body: "{}" }),
      { params: Promise.resolve({ id: dispatch.id }) }
    );
    expect(response.status).toBe(200);

    const projected = await db.operationCommercialOrder.findUniqueOrThrow({ where: { id: order.id } });
    expect(projected.status).toBe("processing");
    expect(projected.fulfillmentStatus).toBe("dispatched");
    const sentUnit = await db.operationFinishedGoodUnit.findUniqueOrThrow({ where: { id: unit.id } });
    expect(sentUnit.status).toBe("dispatched");
    expect(sentUnit.reservedOrderId).toBe(order.id);
    expect(sentUnit.dispatchedAt).not.toBeNull();
  });

  it("blocks a prepared dispatch if the commercial order is cancelled before shipment", async () => {
    const dispatch = await db.operationDispatch.create({
      data: { code: `${run}-cancel-before-send-dispatch`, status: "prepared" },
    });
    const order = await db.operationCommercialOrder.create({
      data: {
        code: `${run}-cancel-before-send-order`,
        status: "cancelled",
        paymentStatus: "paid",
        fulfillmentStatus: "reserved",
        dispatchId: dispatch.id,
      },
    });
    const unit = await db.operationFinishedGoodUnit.create({
      data: {
        internalLabel: `${run}-cancel-before-send-unit`,
        productCode: run,
        productName: "Fixture",
        productType: "test",
        status: "reserved",
        qaStatus: "passed",
        activationStatus: "not_activated",
        reservedOrderId: order.id,
      },
    });
    await db.operationDispatchItem.create({
      data: {
        dispatchId: dispatch.id,
        unitId: unit.id,
        quantity: 1,
        unit: "piece",
        status: "packed",
        packedAt: new Date(),
      },
    });

    const response = await markSent(
      new NextRequest("http://localhost/mark-sent", { method: "POST", body: "{}" }),
      { params: Promise.resolve({ id: dispatch.id }) }
    );
    expect(response.status).toBe(409);

    const unchangedDispatch = await db.operationDispatch.findUniqueOrThrow({ where: { id: dispatch.id } });
    const unchangedUnit = await db.operationFinishedGoodUnit.findUniqueOrThrow({ where: { id: unit.id } });
    expect(unchangedDispatch.status).toBe("prepared");
    expect(unchangedUnit.status).toBe("reserved");
    expect(unchangedUnit.reservedOrderId).toBe(order.id);
    expect(
      await db.operationDispatchEvent.count({
        where: { dispatchId: dispatch.id, eventType: "DISPATCHED" },
      })
    ).toBe(0);
  });

  it("cancels a prepared dispatch by detaching its item, returns the unit to stock, and makes later shipment impossible", async () => {
    const dispatch = await db.operationDispatch.create({
      data: { code: `${run}-safe-cancel-dispatch`, status: "prepared" },
    });
    const order = await db.operationCommercialOrder.create({
      data: {
        code: `${run}-safe-cancel-order`,
        status: "dispatch_created",
        paymentStatus: "paid",
        fulfillmentStatus: "reserved",
        dispatchId: dispatch.id,
      },
    });
    const unit = await db.operationFinishedGoodUnit.create({
      data: {
        internalLabel: `${run}-safe-cancel-unit`,
        productCode: run,
        productName: "Fixture",
        productType: "test",
        status: "reserved",
        qaStatus: "passed",
        activationStatus: "not_activated",
        reservedOrderId: order.id,
      },
    });
    const item = await db.operationDispatchItem.create({
      data: {
        dispatchId: dispatch.id,
        unitId: unit.id,
        internalLabel: unit.internalLabel,
        productCode: unit.productCode,
        productName: unit.productName,
        quantity: 1,
        unit: "piece",
        status: "packed",
        packedAt: new Date(),
      },
    });

    const response = await cancelDispatch(
      new NextRequest("http://localhost/cancel-dispatch", {
        method: "POST",
        body: JSON.stringify({ reason: "Cliente cambió el pedido" }),
        headers: { "content-type": "application/json" },
      }),
      { params: Promise.resolve({ id: dispatch.id }) }
    );
    expect(response.status).toBe(200);

    const cancelled = await db.operationDispatch.findUniqueOrThrow({ where: { id: dispatch.id } });
    const releasedUnit = await db.operationFinishedGoodUnit.findUniqueOrThrow({ where: { id: unit.id } });
    const detachedItem = await db.operationDispatchItem.findUniqueOrThrow({ where: { id: item.id } });
    const projected = await db.operationCommercialOrder.findUniqueOrThrow({ where: { id: order.id } });

    expect(cancelled.status).toBe("cancelled");
    expect(releasedUnit.status).toBe("available");
    expect(releasedUnit.reservedOrderId).toBeNull();
    expect(detachedItem.unitId).toBeNull();
    expect(detachedItem.status).toBe("cancelled");
    expect(projected.dispatchId).toBeNull();
    expect(projected.status).toBe("accepted");
    expect(projected.fulfillmentStatus).toBe("pending");
    expect(
      await db.operationFinishedGoodUnitEvent.count({
        where: { unitId: unit.id, eventType: "RELEASED" },
      })
    ).toBe(1);

    const sendAfterCancel = await markSent(
      new NextRequest("http://localhost/mark-sent", { method: "POST", body: "{}" }),
      { params: Promise.resolve({ id: dispatch.id }) }
    );
    expect(sendAfterCancel.status).toBe(409);
    expect((await db.operationDispatch.findUniqueOrThrow({ where: { id: dispatch.id } })).status).toBe("cancelled");
    expect((await db.operationFinishedGoodUnit.findUniqueOrThrow({ where: { id: unit.id } })).status).toBe("available");
  });

  it("serializes cancellation against shipment so exactly one terminal transition wins", async () => {
    const dispatch = await db.operationDispatch.create({
      data: { code: `${run}-race-dispatch`, status: "prepared" },
    });
    const order = await db.operationCommercialOrder.create({
      data: {
        code: `${run}-race-order`,
        status: "dispatch_created",
        paymentStatus: "paid",
        fulfillmentStatus: "reserved",
        dispatchId: dispatch.id,
      },
    });
    const unit = await db.operationFinishedGoodUnit.create({
      data: {
        internalLabel: `${run}-race-unit`,
        productCode: `${run}-race-sku`,
        productName: "Race fixture",
        productType: "test",
        status: "reserved",
        qaStatus: "passed",
        activationStatus: "not_activated",
        reservedOrderId: order.id,
      },
    });
    const item = await db.operationDispatchItem.create({
      data: {
        dispatchId: dispatch.id,
        unitId: unit.id,
        internalLabel: unit.internalLabel,
        productCode: unit.productCode,
        productName: unit.productName,
        quantity: 1,
        unit: "piece",
        status: "packed",
        packedAt: new Date(),
      },
    });

    const [sendResponse, cancelResponse] = await Promise.all([
      markSent(
        new NextRequest("http://localhost/race-send", { method: "POST", body: "{}" }),
        { params: Promise.resolve({ id: dispatch.id }) }
      ),
      cancelDispatch(
        new NextRequest("http://localhost/race-cancel", {
          method: "POST",
          body: JSON.stringify({ reason: "Concurrent cancellation test" }),
          headers: { "content-type": "application/json" },
        }),
        { params: Promise.resolve({ id: dispatch.id }) }
      ),
    ]);

    expect([sendResponse.status, cancelResponse.status].sort()).toEqual([200, 409]);

    const finalDispatch = await db.operationDispatch.findUniqueOrThrow({ where: { id: dispatch.id } });
    const finalUnit = await db.operationFinishedGoodUnit.findUniqueOrThrow({ where: { id: unit.id } });
    const finalItem = await db.operationDispatchItem.findUniqueOrThrow({ where: { id: item.id } });
    const finalOrder = await db.operationCommercialOrder.findUniqueOrThrow({ where: { id: order.id } });

    if (finalDispatch.status === "dispatched") {
      expect(finalUnit.status).toBe("dispatched");
      expect(finalUnit.reservedOrderId).toBe(order.id);
      expect(finalItem.unitId).toBe(unit.id);
      expect(finalOrder.dispatchId).toBe(dispatch.id);
      expect(finalOrder.fulfillmentStatus).toBe("dispatched");
    } else {
      expect(finalDispatch.status).toBe("cancelled");
      expect(finalUnit.status).toBe("available");
      expect(finalUnit.reservedOrderId).toBeNull();
      expect(finalItem.unitId).toBeNull();
      expect(finalOrder.dispatchId).toBeNull();
      expect(finalOrder.fulfillmentStatus).toBe("pending");
    }

    expect(
      await db.operationDispatchEvent.count({
        where: {
          dispatchId: dispatch.id,
          eventType: { in: ["DISPATCHED", "CANCELLED"] },
        },
      })
    ).toBe(1);
  });

  it("delivery preserves allocation, finalizes the projection, appears in history, and cannot be released to stock", async () => {
    const dispatch = await db.operationDispatch.create({
      data: { code: `${run}-dispatch`, status: "dispatched" },
    });
    const order = await db.operationCommercialOrder.create({
      data: {
        code: `${run}-delivered`,
        status: "processing",
        fulfillmentStatus: "dispatched",
        dispatchId: dispatch.id,
      },
    });
    const dispatchedAt = new Date();
    const unit = await db.operationFinishedGoodUnit.create({
      data: {
        internalLabel: run,
        productCode: run,
        productName: "Fixture",
        productType: "test",
        status: "dispatched",
        qaStatus: "passed",
        reservedOrderId: order.id,
        dispatchedAt,
      },
    });
    await db.operationDispatchItem.create({
      data: {
        dispatchId: dispatch.id,
        unitId: unit.id,
        quantity: 1,
        unit: "piece",
        status: "dispatched",
        dispatchedAt,
      },
    });
    const firstDelivery = await delivery(
      new NextRequest("http://localhost/delivery", { method: "POST", body: "{}" }),
      { params: Promise.resolve({ id: dispatch.id }) }
    );
    expect(firstDelivery.status).toBe(200);
    expect((await firstDelivery.json()).idempotent).toBe(false);

    const retryDelivery = await delivery(
      new NextRequest("http://localhost/delivery", { method: "POST", body: "{}" }),
      { params: Promise.resolve({ id: dispatch.id }) }
    );
    expect(retryDelivery.status).toBe(200);
    expect((await retryDelivery.json()).idempotent).toBe(true);

    const delivered = await db.operationFinishedGoodUnit.findUniqueOrThrow({ where: { id: unit.id } });
    expect(delivered.status).toBe("delivered");
    expect(delivered.activationStatus).toBe("not_activated");
    expect(delivered.reservedOrderId).toBe(order.id);
    const projected = await db.operationCommercialOrder.findUniqueOrThrow({ where: { id: order.id } });
    expect(projected.status).toBe("completed");
    expect(projected.fulfillmentStatus).toBe("delivered");
    const released = await releaseEligibleOrderReservations(db, { orderId: order.id });
    expect(released.releasedCount).toBe(0);
    expect(released.blockedCount).toBe(1);

    const closed = await db.operationCommercialOrder.create({
      data: { code: `${run}-closed`, status: "closed" },
    });
    const active = await db.operationCommercialOrder.create({
      data: { code: `${run}-active`, status: "draft" },
    });
    const results = await history({ entityType: "commercial_order", search: run });
    const ids = results.suggestions!.map((row) => row.id);
    expect(ids).toContain(order.id);
    expect(ids).toContain(closed.id);
    expect(ids).not.toContain(active.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("cancelled reservation returns only an uncommitted unit to stock and records history", async () => {
    const order = await db.operationCommercialOrder.create({
      data: { code: `${run}-cancelled`, status: "cancelled" },
    });
    const unit = await db.operationFinishedGoodUnit.create({
      data: {
        internalLabel: `${run}-reserved`,
        productCode: run,
        productName: "Fixture",
        productType: "test",
        status: "reserved",
        qaStatus: "passed",
        reservedOrderId: order.id,
      },
    });
    expect((await releaseEligibleOrderReservations(db, { orderId: order.id })).releasedCount).toBe(1);
    const current = await db.operationFinishedGoodUnit.findUniqueOrThrow({ where: { id: unit.id } });
    expect(current.status).toBe("available");
    expect(current.reservedOrderId).toBeNull();
    expect(
      await db.operationFinishedGoodUnitEvent.count({
        where: { unitId: unit.id, eventType: "RELEASED", referenceId: order.id },
      })
    ).toBe(1);
  });
});
