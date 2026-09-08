import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  reserve: vi.fn(),
}));

vi.mock("@/lib/operations/commercial-order-reservation", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/operations/commercial-order-reservation")>();
  return {
    ...actual,
    reserveCommercialOrderStock: mocks.reserve,
  };
});

import { routeCustomerProductionUnit } from "@/lib/operations/customer-production-routing";

function customerDb() {
  const state = {
    unit: {
      id: "unit-1",
      productCode: "PRP-FG-STICKER",
      productName: "Sticker PreRescatePTY",
      productType: "PRI-001",
      status: "available",
      qaStatus: "passed",
      activationStatus: "not_activated",
      reservedOrderId: null as string | null,
    },
  };

  const update = vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
    if (typeof data.productCode === "string") state.unit.productCode = data.productCode;
    if (typeof data.productName === "string") state.unit.productName = data.productName;
    if (typeof data.productType === "string") state.unit.productType = data.productType;
    return state.unit;
  });

  return {
    state,
    update,
    db: {
      operationProductionOrder: {
        findUnique: vi.fn(async () => ({
          id: "production-1",
          code: "PROD-PR-2026-000281",
          notes: "Producción por falta de stock",
          outputType: "PRI-001",
          events: [
            {
              eventType: "CREATED",
              metadataJson: JSON.stringify({
                sourceType: "customer_order",
                orderId: "order-1",
                productCode: null,
              }),
            },
          ],
        })),
      },
      operationCommercialOrder: {
        findUnique: vi.fn(async () => null),
        findFirst: vi.fn(async () => ({
          id: "commercial-1",
          sourceId: "order-1",
          customerType: "customer",
          status: "needs_production",
          paymentStatus: "paid",
          items: [
            {
              productCode: "PRI-001",
              finishedGoodId: "fg-1",
              finishedGood: {
                id: "fg-1",
                code: "PRI-001",
                name: "STICKER",
                productType: "sticker-001",
              },
            },
          ],
        })),
      },
      operationFinishedGoodUnit: {
        findUnique: vi.fn(async () => ({
          ...state.unit,
          digitalBatchItem: { productionOrderId: "production-1" },
        })),
        update,
      },
    },
  };
}

describe("routeCustomerProductionUnit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.reserve.mockImplementation(async () => ({
      order: { id: "commercial-1", status: "stock_reserved", paymentStatus: "paid", fulfillmentStatus: "reserved" },
      summary: { requestedQty: 1, reservedQty: 1, missingQty: 0, status: "stock_reserved" },
      reservedUnits: [],
      missingItems: [],
    }));
  });

  it("repairs the observed legacy identity and routes the QC-passed unit into the customer reservation", async () => {
    const { db, update } = customerDb();

    const result = await routeCustomerProductionUnit(db as never, {
      productionOrderId: "production-1",
      unitId: "unit-1",
    });

    expect(result.kind).toBe("customer");
    expect(result.identityReconciled).toBe(true);
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "unit-1" },
        data: expect.objectContaining({
          productCode: "PRI-001",
          productName: "STICKER",
          productType: "sticker-001",
        }),
      })
    );
    expect(mocks.reserve).toHaveBeenCalledWith(
      db,
      expect.objectContaining({ orderId: "commercial-1", allowPartial: true })
    );
  });

  it("leaves internal production in inventory and never reserves it to a customer", async () => {
    const db = {
      operationProductionOrder: {
        findUnique: vi.fn(async () => ({
          id: "production-int",
          code: "PROD-INT-0001",
          notes: "Pedido interno para fabricar inventario",
          outputType: "sticker-001",
          events: [
            {
              eventType: "CREATED",
              metadataJson: JSON.stringify({ orderSource: "internal" }),
            },
          ],
        })),
      },
      operationCommercialOrder: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
      },
      operationFinishedGoodUnit: {
        findUnique: vi.fn(async () => ({
          id: "unit-int",
          productCode: "PRI-001",
          productName: "STICKER",
          productType: "sticker-001",
          status: "available",
          qaStatus: "passed",
          activationStatus: "not_activated",
          reservedOrderId: null,
          digitalBatchItem: { productionOrderId: "production-int" },
        })),
        update: vi.fn(),
      },
    };

    const result = await routeCustomerProductionUnit(db as never, {
      productionOrderId: "production-int",
      unitId: "unit-int",
    });

    expect(result.kind).toBe("internal");
    expect(result.unit?.status).toBe("available");
    expect(db.operationFinishedGoodUnit.update).not.toHaveBeenCalled();
    expect(mocks.reserve).not.toHaveBeenCalled();
  });
});
