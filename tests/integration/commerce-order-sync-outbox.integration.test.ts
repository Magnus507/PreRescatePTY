import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createIntegrationPrismaClient, prepareIntegrationEnvironment, assertIntegrationDatabaseReady } from "./integration-db";

const mockSyncRealOrderToOperations = vi.hoisted(() => vi.fn());

vi.mock("@/lib/operations/sync-real-order-to-operations", () => ({
  syncRealOrderToOperations: mockSyncRealOrderToOperations,
}));

const db = createIntegrationPrismaClient();
const RUN_ID = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

let enqueueCommerceOrderSyncOutbox: typeof import("@/lib/operations/commerce-order-sync-outbox").enqueueCommerceOrderSyncOutbox;
let processCommerceOrderSyncOutboxBatch: typeof import("@/lib/operations/commerce-order-sync-outbox").processCommerceOrderSyncOutboxBatch;

describe("PostgreSQL integration: commerce order sync outbox", () => {
  beforeAll(async () => {
    prepareIntegrationEnvironment();
    await assertIntegrationDatabaseReady(db);
    ({ enqueueCommerceOrderSyncOutbox, processCommerceOrderSyncOutboxBatch } = await import("@/lib/operations/commerce-order-sync-outbox"));
  });

  beforeEach(() => {
    mockSyncRealOrderToOperations.mockReset();
    mockSyncRealOrderToOperations.mockResolvedValue({
      created: true,
      sourceKey: "checkout:order-1",
      order: { id: "op-order-1" },
    });
  });

  afterAll(async () => {
    await db.$disconnect();
  });

  it("claims the same outbox row in only one worker", async () => {
    const product = await db.product.create({
      data: {
        name: `Producto 1 ${RUN_ID}`,
        price: "25.00",
        category: "general",
        stock: 0,
        isActive: true,
        productType: "chip",
      },
    });

    await db.order.create({
      data: {
        id: `order-sync-${RUN_ID}`,
        amount: "25.00",
        currency: "USD",
        paymentStatus: "pending",
        provider: "manual",
        customerEmail: "buyer@test.local",
        customerName: "Buyer",
        orderNumber: `ORD-SYNC-${RUN_ID}`,
        orderStatus: "pending",
        paymentMethod: "manual",
        adminReviewStatus: "pending",
        orderType: "manual",
        items: {
          create: [{
            productType: "chip",
            quantity: 1,
            unitPrice: "25.00",
            totalPrice: "25.00",
            productId: product.id,
            productName: "Producto 1",
            productCode: "PRD-1",
            operationalMappingId: "map-1",
            operationalMappingStatus: "mapped",
            operationalFinishedGoodId: "fg-1",
            operationalProductCode: "PRD-1",
            operationalProductName: "Producto 1",
          }],
        },
      },
    });

    const outbox = await enqueueCommerceOrderSyncOutbox(db, {
      sourceType: "checkout",
      sourceId: `order-sync-${RUN_ID}`,
      sourceCode: `ORD-SYNC-${RUN_ID}`,
      orderType: "customer",
      customerName: "Buyer",
      contactEmail: `buyer-${RUN_ID}@test.local`,
      paymentStatus: "pending",
      currency: "USD",
      items: [{
        productId: "product-1",
        productCode: "PRD-1",
        productName: "Producto 1",
        quantity: 1,
        unitPrice: 25,
        unit: "unit",
        operationalMappingId: "map-1",
        operationalProductCode: "PRD-1",
        operationalProductName: "Producto 1",
        operationalFinishedGoodId: "fg-1",
      }],
    });

    const [first, second] = await Promise.all([
      processCommerceOrderSyncOutboxBatch(db, { limit: 1, workerId: "worker-a" }),
      processCommerceOrderSyncOutboxBatch(db, { limit: 1, workerId: "worker-b" }),
    ]);

    const refreshed = await db.commerceOrderSyncOutbox.findUnique({
      where: { id: outbox.id },
      select: { status: true, attempts: true, lockedBy: true, processedAt: true },
    });

    expect(first.claimed + second.claimed).toBe(1);
    expect(first.processed + second.processed).toBe(1);
    expect(mockSyncRealOrderToOperations).toHaveBeenCalledTimes(1);
    expect(refreshed?.status).toBe("processed");
    expect(refreshed?.attempts).toBe(1);
    expect(refreshed?.processedAt).not.toBeNull();
    expect(refreshed?.lockedBy).toBeNull();
  });
});
