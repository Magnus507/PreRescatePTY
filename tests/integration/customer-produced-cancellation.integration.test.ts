import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  assertIntegrationDatabaseReady,
  createIntegrationPrismaClient,
  prepareIntegrationEnvironment,
} from "./integration-db";
import { reconcileCustomerProducedUnitReservation } from "@/lib/operations/customer-produced-unit-reservation";

const db = createIntegrationPrismaClient();
const run = `cancelled-produced-${Date.now()}-${Math.random().toString(36).slice(2)}`;

describe("PostgreSQL integration: produced units after customer cancellation", () => {
  beforeAll(async () => {
    prepareIntegrationEnvironment();
    await assertIntegrationDatabaseReady(db);
  });

  afterAll(async () => {
    await db.$disconnect();
  });

  async function createProducedUnit(suffix: string, productCode: string) {
    return db.operationFinishedGoodUnit.create({
      data: {
        internalLabel: `UNIT-${run}-${suffix}`,
        productCode,
        productName: `Produced ${productCode}`,
        productType: productCode,
        status: "available",
        qaStatus: "passed",
        activationStatus: "not_activated",
      },
    });
  }

  it("does not reserve a produced unit when the authoritative source Order was cancelled", async () => {
    const productCode = `${run}-SOURCE-CANCELLED`;
    const sourceOrder = await db.order.create({
      data: {
        amount: 25,
        orderNumber: `${run}-source-order`,
        paymentStatus: "paid",
        orderStatus: "cancelled",
        provider: "manual",
      },
    });
    const commercialOrder = await db.operationCommercialOrder.create({
      data: {
        code: `OP-${run}-source-order`,
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
            productName: "Cancelled source fixture",
            quantity: 1,
            unitPrice: 25,
            totalPrice: 25,
            unit: "unit",
          },
        },
      },
    });
    const unit = await createProducedUnit("source-cancelled", productCode);

    const result = await db.$transaction((tx) =>
      reconcileCustomerProducedUnitReservation(tx, {
        commercialOrderId: commercialOrder.id,
        unitId: unit.id,
      })
    );

    expect(result).toBeNull();
    expect(
      await db.operationFinishedGoodUnit.findUniqueOrThrow({ where: { id: unit.id } })
    ).toMatchObject({
      status: "available",
      qaStatus: "passed",
      reservedOrderId: null,
    });
  });

  it("does not strand a produced unit when the commercial demand was cancelled in flight", async () => {
    const productCode = `${run}-COMMERCIAL-CANCELLED`;
    const commercialOrder = await db.operationCommercialOrder.create({
      data: {
        code: `OP-${run}-commercial-cancelled`,
        status: "cancelled",
        customerType: "customer",
        paymentStatus: "paid",
        fulfillmentStatus: "pending",
        totalAmount: 25,
        currency: "USD",
        items: {
          create: {
            productCode,
            productName: "Cancelled commercial fixture",
            quantity: 1,
            unitPrice: 25,
            totalPrice: 25,
            unit: "unit",
          },
        },
      },
    });
    const unit = await createProducedUnit("commercial-cancelled", productCode);

    const result = await db.$transaction((tx) =>
      reconcileCustomerProducedUnitReservation(tx, {
        commercialOrderId: commercialOrder.id,
        unitId: unit.id,
      })
    );

    expect(result).toBeNull();
    expect(
      await db.operationFinishedGoodUnit.findUniqueOrThrow({ where: { id: unit.id } })
    ).toMatchObject({
      status: "available",
      qaStatus: "passed",
      reservedOrderId: null,
    });
  });
});
