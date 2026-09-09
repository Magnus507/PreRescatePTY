import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  assertIntegrationDatabaseReady,
  createIntegrationPrismaClient,
  prepareIntegrationEnvironment,
} from "./integration-db";
import {
  recoverDeliveredCommercialOrderProjections,
} from "@/lib/operations/delivered-commercial-order-reconciliation";

const db = createIntegrationPrismaClient();
const run = `delivery-projection-${Date.now()}-${Math.random().toString(36).slice(2)}`;

describe("PostgreSQL integration: delivered commercial projection recovery", () => {
  beforeAll(async () => {
    prepareIntegrationEnvironment();
    await assertIntegrationDatabaseReady(db);
  });

  afterAll(async () => {
    await db.$disconnect();
  });

  async function seedDeliveredFixture(input: {
    suffix: string;
    sourceOrderStatus: "processing" | "completed";
  }) {
    const sourceOrder = await db.order.create({
      data: {
        amount: 25,
        orderNumber: `${run}-${input.suffix}`,
        paymentStatus: "paid",
        orderStatus: input.sourceOrderStatus,
        provider: "manual",
        customerName: "Delivery projection test",
      },
    });
    const deliveredAt = new Date();
    const dispatch = await db.operationDispatch.create({
      data: {
        code: `DSP-${run}-${input.suffix}`,
        status: "delivered",
        destinationType: "customer",
        deliveredAt,
      },
    });
    const commercialOrder = await db.operationCommercialOrder.create({
      data: {
        code: `OP-${run}-${input.suffix}`,
        sourceType: "checkout",
        sourceId: sourceOrder.id,
        status: "processing",
        customerType: "customer",
        paymentStatus: "paid",
        fulfillmentStatus: "dispatch_pending",
        totalAmount: 25,
        currency: "USD",
        dispatchId: dispatch.id,
      },
    });
    const unit = await db.operationFinishedGoodUnit.create({
      data: {
        internalLabel: `UNIT-${run}-${input.suffix}`,
        productCode: `${run}-SKU-${input.suffix}`,
        productName: "Delivered projection fixture",
        productType: "test",
        status: "activated",
        qaStatus: "passed",
        activationStatus: "activated",
        reservedOrderId: sourceOrder.id,
        reservedAt: new Date(deliveredAt.getTime() - 120_000),
        dispatchedAt: new Date(deliveredAt.getTime() - 60_000),
        deliveredAt,
        activatedAt: new Date(deliveredAt.getTime() + 60_000),
      },
    });
    await db.operationDispatchItem.create({
      data: {
        dispatchId: dispatch.id,
        unitId: unit.id,
        internalLabel: unit.internalLabel,
        productCode: unit.productCode,
        productName: unit.productName,
        quantity: 1,
        unit: "unit",
        status: "delivered",
        dispatchedAt: unit.dispatchedAt,
        deliveredAt,
      },
    });
    return { sourceOrder, dispatch, commercialOrder, unit };
  }

  it("repairs a stale projection only when source, dispatch and physical delivery all agree", async () => {
    const fixture = await seedDeliveredFixture({
      suffix: "safe",
      sourceOrderStatus: "completed",
    });

    const recovery = await recoverDeliveredCommercialOrderProjections(db, { limit: 10 });
    expect(recovery.failed).toBe(0);
    expect(recovery.reconciled).toBeGreaterThanOrEqual(1);

    const repaired = await db.operationCommercialOrder.findUniqueOrThrow({
      where: { id: fixture.commercialOrder.id },
    });
    expect(repaired.status).toBe("completed");
    expect(repaired.fulfillmentStatus).toBe("delivered");
    expect(
      await db.operationCommercialOrderEvent.count({
        where: {
          commercialOrderId: fixture.commercialOrder.id,
          eventType: "DELIVERY_RECONCILED",
        },
      })
    ).toBe(1);

    const retry = await recoverDeliveredCommercialOrderProjections(db, { limit: 10 });
    expect(retry.failed).toBe(0);
    expect(
      await db.operationCommercialOrderEvent.count({
        where: {
          commercialOrderId: fixture.commercialOrder.id,
          eventType: "DELIVERY_RECONCILED",
        },
      })
    ).toBe(1);
  });

  it("fails closed when the source order does not confirm completion", async () => {
    const fixture = await seedDeliveredFixture({
      suffix: "unsafe-source",
      sourceOrderStatus: "processing",
    });

    const recovery = await recoverDeliveredCommercialOrderProjections(db, { limit: 10 });
    expect(recovery.failed).toBe(0);

    const unchanged = await db.operationCommercialOrder.findUniqueOrThrow({
      where: { id: fixture.commercialOrder.id },
    });
    expect(unchanged.status).toBe("processing");
    expect(unchanged.fulfillmentStatus).toBe("dispatch_pending");
    expect(
      await db.operationCommercialOrderEvent.count({
        where: {
          commercialOrderId: fixture.commercialOrder.id,
          eventType: "DELIVERY_RECONCILED",
        },
      })
    ).toBe(0);
  });
});
