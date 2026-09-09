import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  assertIntegrationDatabaseReady,
  createIntegrationPrismaClient,
  prepareIntegrationEnvironment,
} from "./integration-db";
import {
  buildCustomerProductionCode,
  ensureCustomerBackorderProduction,
} from "@/lib/operations/customer-order-production";

const db = createIntegrationPrismaClient();
const run = `live-shortage-${Date.now()}-${Math.random().toString(36).slice(2)}`;

describe("PostgreSQL integration: customer backorder uses live shortage", () => {
  beforeAll(async () => {
    prepareIntegrationEnvironment();
    await assertIntegrationDatabaseReady(db);
  });

  afterAll(async () => {
    await db.$disconnect();
  });

  async function createOrderWithOperationalDemand(suffix: string, productCode: string) {
    const order = await db.order.create({
      data: {
        amount: 25,
        orderNumber: `${run}-${suffix}`,
        paymentStatus: "paid",
        orderStatus: "processing",
        provider: "manual",
        customerName: "Live shortage test",
      },
    });
    const commercialOrder = await db.operationCommercialOrder.create({
      data: {
        code: `OP-${run}-${suffix}`,
        sourceType: "checkout",
        sourceId: order.id,
        status: "accepted",
        customerType: "customer",
        paymentStatus: "paid",
        fulfillmentStatus: "pending",
        totalAmount: 25,
        currency: "USD",
        items: {
          create: {
            productCode,
            productName: `Product ${productCode}`,
            quantity: 1,
            unitPrice: 25,
            totalPrice: 25,
            unit: "unit",
          },
        },
      },
    });
    return { order, commercialOrder };
  }

  it("does not manufacture from a stale backorder note after live stock fully covers demand", async () => {
    const productCode = `${run}-STALE`;
    const { order } = await createOrderWithOperationalDemand("stale", productCode);
    await db.operationFinishedGoodUnit.create({
      data: {
        internalLabel: `UNIT-${run}-stale`,
        productCode,
        productName: "Reserved live stock",
        productType: productCode,
        status: "reserved",
        qaStatus: "passed",
        activationStatus: "not_activated",
        reservedOrderId: order.id,
        reservedAt: new Date(),
      },
    });

    const result = await db.$transaction((tx) =>
      ensureCustomerBackorderProduction(tx, {
        orderId: order.id,
        orderNumber: order.orderNumber,
        customerName: order.customerName,
        backorderQty: 1,
        outputType: productCode,
        productCode,
        productName: "Stale fallback must not produce",
      })
    );

    expect(result).toBeNull();
    expect(
      await db.operationProductionOrder.count({
        where: { code: buildCustomerProductionCode(order.orderNumber) },
      })
    ).toBe(0);
  });

  it("serializes concurrent production requests so they converge on one work order", async () => {
    const productCode = `${run}-CONCURRENT`;
    const { order } = await createOrderWithOperationalDemand("concurrent", productCode);

    const create = () =>
      db.$transaction((tx) =>
        ensureCustomerBackorderProduction(tx, {
          orderId: order.id,
          orderNumber: order.orderNumber,
          customerName: order.customerName,
          backorderQty: 1,
          outputType: productCode,
          productCode,
          productName: "Concurrent backorder",
        })
      );

    const [first, second] = await Promise.all([create(), create()]);
    expect(first).not.toBeNull();
    expect(second).not.toBeNull();
    expect(first?.productionOrder.id).toBe(second?.productionOrder.id);

    const productions = await db.operationProductionOrder.findMany({
      where: { code: buildCustomerProductionCode(order.orderNumber) },
    });
    expect(productions).toHaveLength(1);
    expect(productions[0].plannedQuantity).toBe(1);
  });
});
