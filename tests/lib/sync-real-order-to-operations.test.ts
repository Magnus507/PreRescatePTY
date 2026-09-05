import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  mapCommercialItemToOperationalRequirement: vi.fn(),
  findFirstMock: vi.fn(),
  createMock: vi.fn(),
  updateMock: vi.fn(),
}));

vi.mock("@/lib/operations/commercial-product-mapping", () => ({
  mapCommercialItemToOperationalRequirement: mocks.mapCommercialItemToOperationalRequirement,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    operationCommercialOrder: {
      findFirst: mocks.findFirstMock,
      create: mocks.createMock,
      update: mocks.updateMock,
    },
  },
}));

import { syncRealOrderToOperations } from "@/lib/operations/sync-real-order-to-operations";

describe("syncRealOrderToOperations", () => {
  beforeEach(() => {
    mocks.mapCommercialItemToOperationalRequirement.mockReset();
    mocks.findFirstMock.mockReset();
    mocks.createMock.mockReset();
    mocks.updateMock.mockReset();
    mocks.findFirstMock.mockResolvedValue(null);
    mocks.createMock.mockResolvedValue({ id: "co-1" });
    mocks.updateMock.mockResolvedValue({ id: "co-1" });
  });

  it("preserves direct operational mapping data for store items", async () => {
    await syncRealOrderToOperations(
      {
        operationCommercialOrder: {
          findFirst: mocks.findFirstMock,
          create: mocks.createMock,
          update: mocks.updateMock,
        },
      } as never,
      {
        sourceType: "checkout",
        sourceId: "order-1",
        orderType: "customer",
        customerName: "Cliente",
        items: [
          {
            productId: "product-1",
            productCode: "PRP-FG-001",
            productName: "Producto Premium",
            quantity: 2,
            unitPrice: 25,
            unit: "unit",
            finishedGoodId: "fg-1",
            operationalMappingId: "mapping-1",
            operationalProductCode: "PRP-FG-001",
            operationalProductName: "Producto Premium Operativo",
            operationalFinishedGoodId: "fg-1",
          },
        ],
      }
    );

    expect(mocks.mapCommercialItemToOperationalRequirement).not.toHaveBeenCalled();
    expect(mocks.createMock).toHaveBeenCalledTimes(1);

    const createArg = mocks.createMock.mock.calls[0]?.[0];
    expect(createArg.data.items.create).toEqual([
      {
        finishedGoodId: "fg-1",
        productCode: "PRP-FG-001",
        productName: "Producto Premium Operativo",
        quantity: 2,
        unitPrice: 25,
        totalPrice: 50,
        unit: "unit",
        notes: "[operationalMappingId:mapping-1]",
      },
    ]);
  });
  it("NEW-13: replay preserves operational status and item identities", async () => {
    mocks.findFirstMock.mockResolvedValue({ id: "co-1" });
    await syncRealOrderToOperations({ operationCommercialOrder: { findFirst: mocks.findFirstMock, update: mocks.updateMock } } as never,
      { sourceType: "checkout", sourceId: "order-1", orderType: "customer", paymentStatus: "paid", items: [] });
    const data = mocks.updateMock.mock.calls[0][0].data;
    expect(data.status).toBeUndefined();
    expect(data.fulfillmentStatus).toBeUndefined();
    expect(data.items).toBeUndefined();
    expect(data.paymentStatus).toBe("paid");
  });

});
