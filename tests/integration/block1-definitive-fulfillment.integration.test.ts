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
vi.mock("@/lib/rbac", () => ({
  GENERAL_ADMIN_ROLES: ["admin"],
  requireRole: auth,
}));

const db = createIntegrationPrismaClient();
const run = `block1-definitive-${Date.now()}-${Math.random().toString(36).slice(2)}`;
let sendToDispatch: typeof import("@/app/api/admin/orders/[id]/send-to-dispatch/route").POST;

describe("PostgreSQL integration: definitive Block 1 fulfillment invariants", () => {
  beforeAll(async () => {
    prepareIntegrationEnvironment();
    await assertIntegrationDatabaseReady(db);
    const user = await seedIntegrationUser(db, { email: `${run}@example.invalid` });
    auth.mockResolvedValue({
      authorized: true,
      session: { user: { id: user.id, accountId: null, email: user.email } },
    });
    ({ POST: sendToDispatch } = await import("@/app/api/admin/orders/[id]/send-to-dispatch/route"));
  });

  afterAll(async () => {
    await db.$disconnect();
  });

  async function seedPaidCustomerOrder(input: {
    suffix: string;
    requiredSku: string;
    reservedSku: string;
  }) {
    const order = await db.order.create({
      data: {
        amount: 25,
        orderNumber: `${run}-${input.suffix}`,
        paymentStatus: "paid",
        orderStatus: "processing",
        provider: "manual",
        customerName: "Block 1 Test",
        customerEmail: `${input.suffix}@example.invalid`,
      },
    });

    const operationalOrder = await db.operationCommercialOrder.create({
      data: {
        code: `OP-${run}-${input.suffix}`,
        sourceType: "checkout",
        sourceId: order.id,
        status: "stock_reserved",
        customerType: "customer",
        paymentStatus: "paid",
        fulfillmentStatus: "reserved",
        totalAmount: 25,
        currency: "USD",
        items: {
          create: {
            productCode: input.requiredSku,
            productName: `Required ${input.requiredSku}`,
            quantity: 1,
            unitPrice: 25,
            totalPrice: 25,
            unit: "unit",
          },
        },
      },
    });

    const unit = await db.operationFinishedGoodUnit.create({
      data: {
        internalLabel: `UNIT-${run}-${input.suffix}`,
        productCode: input.reservedSku,
        productName: `Reserved ${input.reservedSku}`,
        productType: input.reservedSku,
        status: "reserved",
        qaStatus: "passed",
        activationStatus: "not_activated",
        reservedOrderId: order.id,
        reservedAt: new Date(),
      },
    });

    return { order, operationalOrder, unit };
  }

  it("rejects a dispatch when total quantity matches but the reserved SKU is wrong", async () => {
    const fixture = await seedPaidCustomerOrder({
      suffix: "wrong-sku",
      requiredSku: `${run}-SKU-A`,
      reservedSku: `${run}-SKU-B`,
    });

    const response = await sendToDispatch(
      new NextRequest("http://localhost/send-to-dispatch", { method: "POST" }),
      { params: Promise.resolve({ id: fixture.order.id }) }
    );

    expect(response.status).toBe(409);
    const payload = await response.json();
    expect(payload.error).toContain("producto/SKU");
    expect(
      await db.operationDispatch.count({
        where: {
          events: { some: { referenceType: "order", referenceId: fixture.order.id } },
        },
      })
    ).toBe(0);
    expect(
      await db.operationFinishedGoodUnit.findUniqueOrThrow({ where: { id: fixture.unit.id } })
    ).toMatchObject({ status: "reserved", reservedOrderId: fixture.order.id });
  });

  it("serializes concurrent dispatch creation so both calls converge on one dispatch", async () => {
    const sku = `${run}-SKU-CONCURRENT`;
    const fixture = await seedPaidCustomerOrder({
      suffix: "concurrent",
      requiredSku: sku,
      reservedSku: sku,
    });

    const [first, second] = await Promise.all([
      sendToDispatch(
        new NextRequest("http://localhost/send-to-dispatch-a", { method: "POST" }),
        { params: Promise.resolve({ id: fixture.order.id }) }
      ),
      sendToDispatch(
        new NextRequest("http://localhost/send-to-dispatch-b", { method: "POST" }),
        { params: Promise.resolve({ id: fixture.order.id }) }
      ),
    ]);

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    const firstPayload = await first.json();
    const secondPayload = await second.json();
    expect(firstPayload.dispatchId).toBe(secondPayload.dispatchId);

    const dispatches = await db.operationDispatch.findMany({
      where: {
        events: { some: { referenceType: "order", referenceId: fixture.order.id } },
      },
      include: { items: true },
    });
    expect(dispatches).toHaveLength(1);
    expect(dispatches[0].items).toHaveLength(1);
    expect(dispatches[0].items[0].unitId).toBe(fixture.unit.id);
    expect(
      (await db.operationCommercialOrder.findUniqueOrThrow({
        where: { id: fixture.operationalOrder.id },
      })).dispatchId
    ).toBe(dispatches[0].id);
  });

  it("does not reattach a cancelled historical dispatch and creates a new retry dispatch", async () => {
    const sku = `${run}-SKU-RETRY`;
    const fixture = await seedPaidCustomerOrder({
      suffix: "cancelled-retry",
      requiredSku: sku,
      reservedSku: sku,
    });

    const firstResponse = await sendToDispatch(
      new NextRequest("http://localhost/send-to-dispatch-first", { method: "POST" }),
      { params: Promise.resolve({ id: fixture.order.id }) }
    );
    expect(firstResponse.status).toBe(200);
    const firstPayload = await firstResponse.json();

    await db.$transaction(async (tx) => {
      await tx.operationDispatchItem.updateMany({
        where: { dispatchId: firstPayload.dispatchId },
        data: { unitId: null, status: "cancelled" },
      });
      await tx.operationDispatch.update({
        where: { id: firstPayload.dispatchId },
        data: { status: "cancelled" },
      });
      await tx.operationCommercialOrder.update({
        where: { id: fixture.operationalOrder.id },
        data: { dispatchId: null, status: "accepted", fulfillmentStatus: "pending" },
      });
      await tx.operationFinishedGoodUnit.update({
        where: { id: fixture.unit.id },
        data: { status: "available", reservedOrderId: null, reservedAt: null },
      });
    });

    const replacementUnit = await db.operationFinishedGoodUnit.create({
      data: {
        internalLabel: `UNIT-${run}-cancelled-retry-2`,
        productCode: sku,
        productName: `Replacement ${sku}`,
        productType: sku,
        status: "reserved",
        qaStatus: "passed",
        activationStatus: "not_activated",
        reservedOrderId: fixture.order.id,
        reservedAt: new Date(),
      },
    });

    const retryResponse = await sendToDispatch(
      new NextRequest("http://localhost/send-to-dispatch-retry", { method: "POST" }),
      { params: Promise.resolve({ id: fixture.order.id }) }
    );
    expect(retryResponse.status).toBe(200);
    const retryPayload = await retryResponse.json();
    expect(retryPayload.dispatchId).not.toBe(firstPayload.dispatchId);
    expect(retryPayload.dispatchCode).toMatch(/-R\d+$/);

    const cancelled = await db.operationDispatch.findUniqueOrThrow({
      where: { id: firstPayload.dispatchId },
    });
    const retry = await db.operationDispatch.findUniqueOrThrow({
      where: { id: retryPayload.dispatchId },
      include: { items: true },
    });
    expect(cancelled.status).toBe("cancelled");
    expect(retry.status).toBe("pending_pick");
    expect(retry.items).toHaveLength(1);
    expect(retry.items[0].unitId).toBe(replacementUnit.id);
  });

  it("partial release refuses a selected reservation that has committed activation state", async () => {
    const orderId = `${run}-release-owner`;
    const unit = await db.operationFinishedGoodUnit.create({
      data: {
        internalLabel: `UNIT-${run}-blocked-release`,
        productCode: `${run}-RELEASE`,
        productName: "Blocked release",
        productType: "test",
        status: "reserved",
        qaStatus: "passed",
        activationStatus: "activated",
        activatedAt: new Date(),
        reservedOrderId: orderId,
        reservedAt: new Date(),
      },
    });

    const result = await releaseEligibleOrderReservations(db, {
      orderId,
      unitIds: [unit.id],
    });

    expect(result.releasedCount).toBe(0);
    expect(result.blockedCount).toBe(1);
    expect(
      await db.operationFinishedGoodUnit.findUniqueOrThrow({ where: { id: unit.id } })
    ).toMatchObject({
      status: "reserved",
      reservedOrderId: orderId,
      activationStatus: "activated",
    });
  });
});
