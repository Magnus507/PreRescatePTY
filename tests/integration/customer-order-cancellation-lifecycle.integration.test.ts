import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import {
  assertIntegrationDatabaseReady,
  createIntegrationPrismaClient,
  prepareIntegrationEnvironment,
  seedIntegrationUser,
} from "./integration-db";
import { reconcileCustomerProducedUnitReservation } from "@/lib/operations/customer-produced-unit-reservation";

const auth = vi.hoisted(() => vi.fn());
vi.mock("@/lib/rbac", () => ({
  ORDER_REVIEW_ROLES: ["admin"],
  GENERAL_ADMIN_ROLES: ["admin"],
  requireRole: auth,
}));

const db = createIntegrationPrismaClient();
const run = `b4-cancel-lifecycle-${Date.now()}-${Math.random().toString(36).slice(2)}`;
let cancelOrder: typeof import("@/app/api/admin/orders/[id]/delete/route").POST;
let prepareProduction: typeof import("@/app/api/admin/operations/production-orders/[id]/prepare-digital-items/route").POST;

function cancelRequest(orderId: string) {
  return cancelOrder(
    new NextRequest(`http://localhost/api/admin/orders/${orderId}/delete`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        confirmText: "ELIMINAR",
        reason: "Bloque 4 cancellation lifecycle",
      }),
    }),
    { params: Promise.resolve({ id: orderId }) }
  );
}

describe("PostgreSQL integration: Block 4 customer cancellation lifecycle / PHY-13", () => {
  beforeAll(async () => {
    prepareIntegrationEnvironment();
    await assertIntegrationDatabaseReady(db);
    const user = await seedIntegrationUser(db, { email: `${run}@example.invalid` });
    auth.mockResolvedValue({
      authorized: true,
      session: {
        user: {
          id: user.id,
          accountId: null,
          email: user.email,
        },
      },
    });
    ({ POST: cancelOrder } = await import("@/app/api/admin/orders/[id]/delete/route"));
    ({ POST: prepareProduction } = await import(
      "@/app/api/admin/operations/production-orders/[id]/prepare-digital-items/route"
    ));
  });

  afterAll(async () => {
    await db.$disconnect();
  });

  it("cancellation before production cancels projection, releases stock, cancels unstarted production and prevents later preparation", async () => {
    const productCode = `${run}-CANCELPRE-SKU`;
    const sourceOrder = await db.order.create({
      data: {
        amount: 50,
        orderNumber: `${run}-CANCELPRE`,
        paymentStatus: "paid",
        orderStatus: "processing",
        provider: "manual",
      },
    });

    const commercialOrder = await db.operationCommercialOrder.create({
      data: {
        code: `OP-${run}-CANCELPRE`,
        sourceType: "checkout",
        sourceId: sourceOrder.id,
        status: "accepted",
        customerType: "customer",
        paymentStatus: "paid",
        fulfillmentStatus: "requested",
        totalAmount: 50,
        currency: "USD",
        items: {
          create: {
            productCode,
            productName: "pre-production cancellation product",
            quantity: 2,
            unitPrice: 25,
            totalPrice: 50,
            unit: "unit",
          },
        },
      },
    });

    const reservedUnit = await db.operationFinishedGoodUnit.create({
      data: {
        internalLabel: `UNIT-${run}-CANCELPRE-RESERVED`,
        productCode,
        productName: "pre-production cancellation reserved unit",
        productType: productCode,
        status: "reserved",
        qaStatus: "passed",
        activationStatus: "not_activated",
        reservedOrderId: sourceOrder.id,
        reservedAt: new Date(),
      },
    });

    const production = await db.operationProductionOrder.create({
      data: {
        code: `PROD-${run}-CANCELPRE`.slice(0, 120),
        title: "pre-production cancellation unstarted backorder",
        status: "planned",
        plannedQuantity: 1,
        producedQuantity: 0,
        outputType: productCode,
        notes: `Production for ${sourceOrder.orderNumber}`,
        events: {
          create: {
            eventType: "CREATED",
            quantity: 1,
            reason: "Customer backorder",
            metadataJson: JSON.stringify({
              sourceType: "customer_order",
              orderId: sourceOrder.id,
              orderNumber: sourceOrder.orderNumber,
              productCode,
            }),
          },
        },
      },
    });

    const response = await cancelRequest(sourceOrder.id);
    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.releasedReservationsCount).toBe(1);
    expect(payload.cancelledCommercialOrdersCount).toBe(1);
    expect(payload.cancelledProductionOrders).toEqual([
      expect.objectContaining({ id: production.id }),
    ]);

    await expect(
      db.order.findUniqueOrThrow({ where: { id: sourceOrder.id } })
    ).resolves.toMatchObject({
      orderStatus: "cancelled",
      paymentStatus: "cancelled",
    });
    await expect(
      db.operationCommercialOrder.findUniqueOrThrow({ where: { id: commercialOrder.id } })
    ).resolves.toMatchObject({
      status: "cancelled",
      fulfillmentStatus: "pending",
    });
    await expect(
      db.operationFinishedGoodUnit.findUniqueOrThrow({ where: { id: reservedUnit.id } })
    ).resolves.toMatchObject({
      status: "available",
      reservedOrderId: null,
      activationStatus: "not_activated",
    });
    await expect(
      db.operationProductionOrder.findUniqueOrThrow({ where: { id: production.id } })
    ).resolves.toMatchObject({
      status: "cancelled",
      producedQuantity: 0,
    });

    expect(
      await db.operationCommercialOrderEvent.count({
        where: { commercialOrderId: commercialOrder.id, eventType: "CANCELLED" },
      })
    ).toBe(1);
    expect(
      await db.operationProductionEvent.count({
        where: { productionOrderId: production.id, eventType: "CANCELLED" },
      })
    ).toBe(1);

    const preparationResponse = await prepareProduction(
      new NextRequest(
        `http://localhost/api/admin/operations/production-orders/${production.id}/prepare-digital-items`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ quantity: 1 }),
        }
      ),
      { params: Promise.resolve({ id: production.id }) }
    );
    expect(preparationResponse.status).toBe(409);
    expect(
      await db.operationDigitalBatchItem.count({
        where: { productionOrderId: production.id },
      })
    ).toBe(0);
  });

  it("PHY-13 preserves already-started production but cancelled demand can never claim its output", async () => {
    const productCode = `${run}-PHY13-SKU`;
    const sourceOrder = await db.order.create({
      data: {
        amount: 25,
        orderNumber: `${run}-PHY13`,
        paymentStatus: "paid",
        orderStatus: "processing",
        provider: "manual",
      },
    });

    const commercialOrder = await db.operationCommercialOrder.create({
      data: {
        code: `OP-${run}-PHY13`,
        sourceType: "checkout",
        sourceId: sourceOrder.id,
        status: "accepted",
        customerType: "customer",
        paymentStatus: "paid",
        fulfillmentStatus: "requested",
        totalAmount: 25,
        currency: "USD",
        items: {
          create: {
            productCode,
            productName: "PHY-13 product",
            quantity: 1,
            unitPrice: 25,
            totalPrice: 25,
            unit: "unit",
          },
        },
      },
    });

    const production = await db.operationProductionOrder.create({
      data: {
        code: `PROD-${run}-PHY13`.slice(0, 120),
        title: "PHY-13 started customer production",
        status: "started",
        plannedQuantity: 1,
        producedQuantity: 0,
        outputType: productCode,
        events: {
          create: {
            eventType: "CREATED",
            quantity: 1,
            reason: "Customer backorder",
            metadataJson: JSON.stringify({
              sourceType: "customer_order",
              orderId: sourceOrder.id,
              orderNumber: sourceOrder.orderNumber,
              productCode,
            }),
          },
        },
      },
    });

    const response = await cancelRequest(sourceOrder.id);
    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.cancelledProductionOrders).toHaveLength(0);
    expect(payload.preservedProductionOrders).toEqual([
      expect.objectContaining({ id: production.id, status: "started" }),
    ]);

    await expect(
      db.operationProductionOrder.findUniqueOrThrow({ where: { id: production.id } })
    ).resolves.toMatchObject({ status: "started" });
    await expect(
      db.operationCommercialOrder.findUniqueOrThrow({ where: { id: commercialOrder.id } })
    ).resolves.toMatchObject({ status: "cancelled" });

    // Simulate the already-started physical work reaching passed QA. The unit
    // remains valid inventory, but cancellation of authoritative demand must
    // make customer reservation reconciliation a no-op.
    const producedUnit = await db.operationFinishedGoodUnit.create({
      data: {
        internalLabel: `UNIT-${run}-PHY13-PRODUCED`,
        productCode,
        productName: "PHY-13 produced unit",
        productType: productCode,
        status: "available",
        qaStatus: "passed",
        activationStatus: "not_activated",
      },
    });

    const reconciliation = await db.$transaction((tx) =>
      reconcileCustomerProducedUnitReservation(tx, {
        commercialOrderId: commercialOrder.id,
        unitId: producedUnit.id,
      })
    );
    expect(reconciliation).toBeNull();

    await expect(
      db.operationFinishedGoodUnit.findUniqueOrThrow({ where: { id: producedUnit.id } })
    ).resolves.toMatchObject({
      status: "available",
      qaStatus: "passed",
      activationStatus: "not_activated",
      reservedOrderId: null,
    });
  });
});
