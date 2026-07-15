import { describe, it, expect, beforeEach, vi } from "vitest";
import { mockPrisma, resetMockPrisma } from "../helpers/mock-prisma";
import { resetAllMocks } from "../helpers/reset-mocks";

const mockSyncRealOrderToOperations = vi.hoisted(() => vi.fn());

vi.mock("@/lib/operations/sync-real-order-to-operations", () => ({
  syncRealOrderToOperations: mockSyncRealOrderToOperations,
}));

import {
  enqueueCommerceOrderSyncOutbox,
  processCommerceOrderSyncOutboxBatch,
} from "@/lib/operations/commerce-order-sync-outbox";

describe("commerce-order-sync-outbox", () => {
  beforeEach(() => {
    resetAllMocks();
    resetMockPrisma();
    mockSyncRealOrderToOperations.mockReset();
    mockPrisma.order.findUnique.mockReset();
    mockPrisma.$transaction.mockImplementation(async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => fn(mockPrisma));
  });

  it("enqueues a durable outbox event with a unique deduplication key", async () => {
    mockPrisma.commerceOrderSyncOutbox.create.mockResolvedValue({
      id: "outbox-1",
      deduplicationKey: "commerce.order.sync_requested:checkout:order-1:v1",
    } as never);

    const row = (await enqueueCommerceOrderSyncOutbox(mockPrisma as never, {
      sourceType: "checkout",
      sourceId: "order-1",
      sourceCode: "ORD-001",
      orderType: "customer",
      customerName: "Cliente",
      contactEmail: "cliente@example.com",
      paymentStatus: "pending",
      currency: "USD",
      items: [
        {
          productId: "product-1",
          productCode: "PRD-1",
          productName: "Producto 1",
          quantity: 1,
          unitPrice: 25,
          unit: "unit",
          finishedGoodId: "fg-1",
          operationalMappingId: "map-1",
          operationalProductCode: "PRD-1",
          operationalProductName: "Producto 1",
          operationalFinishedGoodId: "fg-1",
        },
      ],
    })) as { id: string };

    expect(mockPrisma.commerceOrderSyncOutbox.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          eventType: "commerce.order.sync_requested",
          sourceType: "checkout",
          sourceId: "order-1",
          deduplicationKey: "commerce.order.sync_requested:checkout:order-1:v1",
          payloadVersion: 1,
          status: "pending",
        }),
      })
    );
    expect(row.id).toBe("outbox-1");
  });

  it("processes a claimed event and marks it processed", async () => {
    mockPrisma.commerceOrderSyncOutbox.findMany.mockResolvedValue([
      {
        id: "outbox-1",
        eventType: "commerce.order.sync_requested",
        sourceType: "checkout",
        sourceId: "order-1",
        deduplicationKey: "commerce.order.sync_requested:checkout:order-1:v1",
        payloadVersion: 1,
        payloadJson: JSON.stringify({
          version: 1,
          syncInput: {
            sourceType: "checkout",
            sourceId: "order-1",
            sourceCode: "ORD-001",
            orderType: "customer",
            customerName: "Cliente",
            contactEmail: "cliente@example.com",
            paymentStatus: "pending",
            currency: "USD",
            items: [
              {
                productId: "product-1",
                productCode: "PRD-1",
                productName: "Producto 1",
                quantity: 1,
                unitPrice: 25,
                unit: "unit",
                finishedGoodId: "fg-1",
                operationalMappingId: "map-1",
                operationalProductCode: "PRD-1",
                operationalProductName: "Producto 1",
                operationalFinishedGoodId: "fg-1",
              },
            ],
          },
        }),
        status: "pending",
        attempts: 0,
        availableAt: new Date(),
        lockedAt: null,
        lockedBy: null,
        processedAt: null,
        lastErrorCode: null,
        lastErrorMessage: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ] as never);
    mockPrisma.order.findUnique.mockResolvedValue({
      id: "order-1",
      orderNumber: "ORD-001",
      orderType: "customer",
      customerName: "Cliente",
      customerEmail: "cliente@example.com",
      customerPhone: null,
      customerDocument: null,
      providerReference: null,
      paymentStatus: "pending",
      manualPaymentReference: null,
      paymentProofUrl: null,
      currency: "USD",
      amount: 25,
      organizationId: null,
      items: [
        {
          productId: "product-1",
          productType: "PRD-1",
          productName: "Producto 1",
          productCode: "PRD-1",
          quantity: 1,
          unitPrice: 25,
          operationalMappingId: "map-1",
          operationalMappingStatus: "mapped",
          operationalFinishedGoodId: "fg-1",
          operationalProductCode: "PRD-1",
          operationalProductName: "Producto 1",
        },
      ],
    } as never);
    mockPrisma.commerceOrderSyncOutbox.updateMany.mockResolvedValue({ count: 1 } as never);
    mockPrisma.commerceOrderSyncOutbox.update.mockResolvedValue({ id: "outbox-1" } as never);
    mockSyncRealOrderToOperations.mockResolvedValue({
      order: { id: "op-1" },
      created: true,
      sourceKey: "checkout:order-1",
    });

    const result = await processCommerceOrderSyncOutboxBatch(mockPrisma as never, {
      limit: 10,
      workerId: "worker-1",
    });

    expect(result.claimed).toBe(1);
    expect(result.processed).toBe(1);
    expect(result.retrying).toBe(0);
    expect(result.failed).toBe(0);
    expect(mockSyncRealOrderToOperations).toHaveBeenCalledTimes(1);
    expect(mockPrisma.commerceOrderSyncOutbox.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "outbox-1" },
        data: expect.objectContaining({
          status: "processed",
          lockedBy: null,
        }),
      })
    );
  });

  it("marks a temporary failure as retrying with backoff", async () => {
    mockPrisma.commerceOrderSyncOutbox.findMany.mockResolvedValue([
      {
        id: "outbox-2",
        eventType: "commerce.order.sync_requested",
        sourceType: "checkout",
        sourceId: "order-2",
        deduplicationKey: "commerce.order.sync_requested:checkout:order-2:v1",
        payloadVersion: 1,
        payloadJson: JSON.stringify({
          version: 1,
          syncInput: {
            sourceType: "checkout",
            sourceId: "order-2",
            orderType: "customer",
            customerName: "Cliente",
            contactEmail: "cliente@example.com",
            paymentStatus: "pending",
            currency: "USD",
            items: [],
          },
        }),
        status: "pending",
        attempts: 1,
        availableAt: new Date(),
        lockedAt: null,
        lockedBy: null,
        processedAt: null,
        lastErrorCode: null,
        lastErrorMessage: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ] as never);
    mockPrisma.order.findUnique.mockResolvedValue({
      id: "order-2",
      orderNumber: "ORD-002",
      orderType: "customer",
      customerName: "Cliente",
      customerEmail: "cliente@example.com",
      customerPhone: null,
      customerDocument: null,
      providerReference: null,
      paymentStatus: "pending",
      manualPaymentReference: null,
      paymentProofUrl: null,
      currency: "USD",
      amount: 25,
      organizationId: null,
      items: [
        {
          productId: "product-2",
          productType: "PRD-2",
          productName: "Producto 2",
          productCode: "PRD-2",
          quantity: 1,
          unitPrice: 25,
          operationalMappingId: "map-2",
          operationalMappingStatus: "mapped",
          operationalFinishedGoodId: "fg-2",
          operationalProductCode: "PRD-2",
          operationalProductName: "Producto 2",
        },
      ],
    } as never);
    mockPrisma.commerceOrderSyncOutbox.updateMany.mockResolvedValue({ count: 1 } as never);
    mockPrisma.commerceOrderSyncOutbox.update.mockResolvedValue({ id: "outbox-2" } as never);
    mockSyncRealOrderToOperations.mockRejectedValue(new Error("DB timeout"));

    const result = await processCommerceOrderSyncOutboxBatch(mockPrisma as never, {
      limit: 10,
      workerId: "worker-1",
    });

    expect(result.claimed).toBe(1);
    expect(result.processed).toBe(0);
    expect(result.retrying).toBe(1);
    expect(result.failed).toBe(0);
    expect(mockPrisma.commerceOrderSyncOutbox.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "outbox-2" },
        data: expect.objectContaining({
          status: "retrying",
          lastErrorCode: "RETRYABLE_SYNC_ERROR",
        }),
      })
    );
  });
});
