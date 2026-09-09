import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import {
  assertIntegrationDatabaseReady,
  createIntegrationPrismaClient,
  prepareIntegrationEnvironment,
  seedIntegrationUser,
} from "./integration-db";

const auth = vi.hoisted(() => vi.fn());
vi.mock("@/lib/rbac", () => ({ GENERAL_ADMIN_ROLES: ["admin"], requireRole: auth }));

const db = createIntegrationPrismaClient();
const run = `dispatch-relink-${Date.now()}-${Math.random().toString(36).slice(2)}`;
let sendToDispatch: typeof import("@/app/api/admin/orders/[id]/send-to-dispatch/route").POST;

describe("PostgreSQL integration: historical customer dispatch relink", () => {
  beforeAll(async () => {
    prepareIntegrationEnvironment();
    await assertIntegrationDatabaseReady(db);
    const user = await seedIntegrationUser(db, { email: `${run}@example.invalid` });
    auth.mockResolvedValue({ authorized: true, session: { user: { id: user.id } } });
    ({ POST: sendToDispatch } = await import("@/app/api/admin/orders/[id]/send-to-dispatch/route"));
  });

  afterAll(async () => {
    await db.$disconnect();
  });

  it("does not relink a historical active dispatch whose physical SKU differs from current demand", async () => {
    const requiredSku = `${run}-REQUIRED`;
    const wrongSku = `${run}-WRONG`;
    const sourceOrder = await db.order.create({
      data: {
        amount: 25,
        orderNumber: `${run}-wrong-sku`,
        paymentStatus: "paid",
        orderStatus: "processing",
        provider: "manual",
        customerName: "Relink validation",
      },
    });
    const commercialOrder = await db.operationCommercialOrder.create({
      data: {
        code: `OP-${run}-wrong-sku`,
        sourceType: "checkout",
        sourceId: sourceOrder.id,
        status: "stock_reserved",
        customerType: "customer",
        paymentStatus: "paid",
        fulfillmentStatus: "reserved",
        totalAmount: 25,
        currency: "USD",
        items: {
          create: {
            productCode: requiredSku,
            productName: "Required SKU",
            quantity: 1,
            unitPrice: 25,
            totalPrice: 25,
            unit: "unit",
          },
        },
      },
    });
    const wrongUnit = await db.operationFinishedGoodUnit.create({
      data: {
        internalLabel: `UNIT-${run}-wrong-sku`,
        productCode: wrongSku,
        productName: "Wrong SKU",
        productType: wrongSku,
        status: "reserved",
        qaStatus: "passed",
        activationStatus: "not_activated",
        reservedOrderId: sourceOrder.id,
        reservedAt: new Date(),
      },
    });
    const historicalDispatch = await db.operationDispatch.create({
      data: {
        code: `DSP-${run}-wrong-sku`,
        status: "pending_pick",
        destinationType: "customer",
        items: {
          create: {
            unitId: wrongUnit.id,
            internalLabel: wrongUnit.internalLabel,
            productCode: wrongSku,
            productName: "Wrong SKU",
            quantity: 1,
            unit: "unit",
            status: "pending_pick",
          },
        },
        events: {
          create: {
            eventType: "CREATED",
            referenceType: "order",
            referenceId: sourceOrder.id,
            metadataJson: JSON.stringify({ sourceOrderId: sourceOrder.id }),
          },
        },
      },
    });

    const response = await sendToDispatch(
      new NextRequest("http://localhost/send-to-dispatch", { method: "POST" }),
      { params: Promise.resolve({ id: sourceOrder.id }) }
    );
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({
      error: expect.stringContaining("despacho histórico"),
    });

    const unchangedOrder = await db.operationCommercialOrder.findUniqueOrThrow({
      where: { id: commercialOrder.id },
    });
    expect(unchangedOrder.dispatchId).toBeNull();
    expect(unchangedOrder.status).toBe("stock_reserved");
    expect(unchangedOrder.fulfillmentStatus).toBe("reserved");
    expect(
      await db.operationDispatch.count({
        where: {
          events: { some: { referenceType: "order", referenceId: sourceOrder.id } },
        },
      })
    ).toBe(1);
    expect(
      await db.operationDispatch.findUniqueOrThrow({ where: { id: historicalDispatch.id } })
    ).toMatchObject({ status: "pending_pick" });
  });
});
