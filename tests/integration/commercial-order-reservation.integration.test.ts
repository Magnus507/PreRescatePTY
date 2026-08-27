import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createIntegrationPrismaClient, prepareIntegrationEnvironment, assertIntegrationDatabaseReady } from "./integration-db";
import { reserveCommercialOrderStock } from "@/lib/operations/commercial-order-reservation";

const db = createIntegrationPrismaClient();
const RUN_ID = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

describe("PostgreSQL integration: commercial order reservation", () => {
  beforeAll(async () => {
    prepareIntegrationEnvironment();
    await assertIntegrationDatabaseReady(db);
  });

  afterAll(async () => {
    await db.$disconnect();
  });

  it("keeps a single unit reserved even when two orders reserve concurrently", async () => {
    const unit = await db.operationFinishedGoodUnit.create({
      data: {
        internalLabel: `INT-${RUN_ID}`,
        productCode: "PRD-RES-1",
        productName: "Producto Reserva",
        productType: "PRD-RES-1",
        status: "available",
        qaStatus: "passed",
        activationStatus: "not_activated",
      },
    });

    const sourceOrderAId = `source-a-${RUN_ID}`;
    const sourceOrderBId = `source-b-${RUN_ID}`;

    const orderA = await db.operationCommercialOrder.create({
      data: {
        code: `OP-A-${RUN_ID}`,
        sourceType: "checkout",
        sourceId: sourceOrderAId,
        status: "draft",
        customerType: "customer",
        salesChannel: "web",
        paymentStatus: "pending",
        fulfillmentStatus: "pending",
        totalAmount: "25.00",
        currency: "USD",
        items: {
          create: [{
            productName: "Producto Reserva",
            quantity: 1,
            unitPrice: "25.00",
            totalPrice: "25.00",
            productCode: "PRD-RES-1",
            unit: "unit",
          }],
        },
      },
      select: { id: true },
    });

    const orderB = await db.operationCommercialOrder.create({
      data: {
        code: `OP-B-${RUN_ID}`,
        sourceType: "checkout",
        sourceId: sourceOrderBId,
        status: "draft",
        customerType: "customer",
        salesChannel: "web",
        paymentStatus: "pending",
        fulfillmentStatus: "pending",
        totalAmount: "25.00",
        currency: "USD",
        items: {
          create: [{
            productName: "Producto Reserva",
            quantity: 1,
            unitPrice: "25.00",
            totalPrice: "25.00",
            productCode: "PRD-RES-1",
            unit: "unit",
          }],
        },
      },
      select: { id: true },
    });

    const [first, second] = await Promise.all([
      db.$transaction((tx) => reserveCommercialOrderStock(tx, { orderId: orderA.id, allowPartial: true })),
      db.$transaction((tx) => reserveCommercialOrderStock(tx, { orderId: orderB.id, allowPartial: true })),
    ]);

    const reservedUnit = await db.operationFinishedGoodUnit.findUnique({ where: { id: unit.id } });
    const reservedUnits = await db.operationFinishedGoodUnit.findMany({
      where: { reservedOrderId: { in: [sourceOrderAId, sourceOrderBId] } },
      select: { id: true, reservedOrderId: true },
    });

    expect([first, second].filter(Boolean)).toHaveLength(2);
    expect(reservedUnits).toHaveLength(1);
    expect(reservedUnit?.reservedOrderId).toMatch(new RegExp(`^(${sourceOrderAId}|${sourceOrderBId})$`));
    expect([first?.summary.missingQty, second?.summary.missingQty].some((value) => value === 1)).toBe(true);

    const refreshedOrders = await db.operationCommercialOrder.findMany({
      where: { id: { in: [orderA.id, orderB.id] } },
      select: { id: true, status: true, fulfillmentStatus: true },
    });

    expect(refreshedOrders).toHaveLength(2);
    expect(refreshedOrders.every((order) => ["stock_reserved", "pending_stock", "needs_production"].includes(order.status))).toBe(true);
  });
});
