import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import {
  assertIntegrationDatabaseReady,
  createIntegrationPrismaClient,
  prepareIntegrationEnvironment,
  seedIntegrationUser,
} from "./integration-db";

const auth = vi.hoisted(() => vi.fn());
vi.mock("@/lib/rbac", () => ({
  GENERAL_ADMIN_ROLES: ["admin"],
  requireRole: auth,
}));

const db = createIntegrationPrismaClient();
const run = `b4-phy14-cancelled-production-${Date.now()}-${Math.random().toString(36).slice(2)}`;
let sendToProduction: typeof import("@/app/api/admin/operations/commercial-orders/[id]/send-to-production/route").POST;

describe("PostgreSQL integration: PHY-14 cancelled backorder production recovery", () => {
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
    ({ POST: sendToProduction } = await import(
      "@/app/api/admin/operations/commercial-orders/[id]/send-to-production/route"
    ));
  });

  afterAll(async () => {
    await db.$disconnect();
  });

  it("creates replacement production when the previous backorder work order was cancelled", async () => {
    const productCode = `${run}-SKU`;
    const sourceOrder = await db.order.create({
      data: {
        amount: 25,
        orderNumber: `${run}-ORDER`,
        paymentStatus: "paid",
        orderStatus: "processing",
        provider: "manual",
        customerName: "PHY-14 recovery",
      },
    });

    const commercialOrder = await db.operationCommercialOrder.create({
      data: {
        code: `OP-${run}`,
        sourceType: "checkout",
        sourceId: sourceOrder.id,
        status: "accepted",
        customerType: "customer",
        salesChannel: "web",
        paymentStatus: "paid",
        fulfillmentStatus: "pending",
        totalAmount: 25,
        currency: "USD",
        items: {
          create: {
            productCode,
            productName: "PHY-14 replacement product",
            quantity: 1,
            unitPrice: 25,
            totalPrice: 25,
            unit: "unit",
          },
        },
      },
    });

    const productionMarker =
      `W605H-B-BACKORDER-PRODUCTION:${commercialOrder.id}:${productCode}`;
    const cancelledProduction = await db.operationProductionOrder.create({
      data: {
        code: `PROD-CANCELLED-${run}`.slice(0, 120),
        title: "Cancelled customer backorder",
        status: "cancelled",
        plannedQuantity: 1,
        producedQuantity: 0,
        outputType: productCode,
        notes: `${productionMarker} [commercialOrderId:${commercialOrder.id}] historical cancelled production`,
      },
    });

    const response = await sendToProduction(
      new NextRequest("http://localhost/api/admin/operations/commercial-orders/test/send-to-production", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mode: "backorder" }),
      }),
      { params: Promise.resolve({ id: commercialOrder.id }) }
    );

    expect(response.status).toBe(201);
    const payload = await response.json();
    expect(payload.created).toBe(true);
    expect(payload.productionOrder?.id).not.toBe(cancelledProduction.id);
    expect(payload.productionOrder?.status).toBe("draft");
    expect(payload.products).toEqual([
      expect.objectContaining({
        productCode,
        plannedQuantity: 1,
        backorderQty: 1,
      }),
    ]);

    const productions = await db.operationProductionOrder.findMany({
      where: { notes: { contains: productionMarker } },
      orderBy: { createdAt: "asc" },
      select: { id: true, status: true, plannedQuantity: true },
    });

    expect(productions).toHaveLength(2);
    expect(productions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: cancelledProduction.id,
          status: "cancelled",
          plannedQuantity: 1,
        }),
        expect.objectContaining({
          id: payload.productionOrder.id,
          status: "draft",
          plannedQuantity: 1,
        }),
      ])
    );

    const refreshedOrder = await db.operationCommercialOrder.findUniqueOrThrow({
      where: { id: commercialOrder.id },
      select: { status: true, fulfillmentStatus: true },
    });
    expect(refreshedOrder.status).toBe("needs_production");
    expect(refreshedOrder.fulfillmentStatus).toBe("requested");
  });
});
