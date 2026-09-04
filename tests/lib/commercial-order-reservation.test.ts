import { describe, expect, it, vi } from "vitest";
import {
  isCommercialOrderEligibleForReservation,
  reserveCommercialOrderStock,
} from "@/lib/operations/commercial-order-reservation";

type Unit = {
  id: string;
  internalLabel: string;
  productCode: string;
  productType: string;
  status: string;
  qaStatus: string | null;
  activationStatus: string;
  reservedOrderId: string | null;
  dispatchItems: Array<unknown>;
};

type UnitWhere = {
  id?: { in: string[] };
  reservedOrderId?: string | null;
  productCode: string;
  productType?: string;
  status: string;
  qaStatus?: string;
  activationStatus?: string;
  dispatchItems: { none: Record<string, never> };
};

function createTx(order: {
  id: string;
  customerType?: string;
  status?: string;
  paymentStatus?: string;
  items: Array<{
    id: string;
    quantity: number;
    productCode: string | null;
    finishedGoodId: string | null;
    finishedGood: { code: string; productType: string } | null;
  }>;
}, units: Unit[]) {
  const state = {
    order,
    units,
  };

  const matchesWhere = (unit: Unit, where: UnitWhere) => {
    if (where.id && !where.id.in.includes(unit.id)) return false;
    if (unit.productCode !== where.productCode) return false;
    if (where.productType && unit.productType !== where.productType) return false;
    if (unit.status !== where.status) return false;
    if (where.qaStatus && unit.qaStatus !== where.qaStatus) return false;
    if (where.activationStatus && unit.activationStatus !== where.activationStatus) return false;
    if (where.reservedOrderId !== undefined && unit.reservedOrderId !== where.reservedOrderId) return false;
    if (unit.dispatchItems.length !== 0) return false;
    return true;
  };

  return {
    operationCommercialOrder: {
      findUnique: vi.fn(async () => state.order),
      update: vi.fn(async ({ data }: { data: { status?: string; fulfillmentStatus?: string } }) => ({
        id: state.order.id,
        status: data.status ?? state.order.status ?? "draft",
        paymentStatus: state.order.paymentStatus ?? "paid",
        fulfillmentStatus: data.fulfillmentStatus ?? "pending",
      })),
    },
    operationFinishedGoodUnit: {
      findMany: vi.fn(async ({ where, take }: { where: UnitWhere; take?: number }) => {
        const matched = state.units.filter((unit) => matchesWhere(unit, where));
        return typeof take === "number" ? matched.slice(0, take) : matched;
      }),
      updateMany: vi.fn(async ({ where, data }: {
        where: UnitWhere;
        data: { status: string; reservedOrderId: string; reservedAt: Date };
      }) => {
        let count = 0;
        for (const unit of state.units) {
          if (matchesWhere(unit, where)) {
            unit.status = data.status;
            unit.reservedOrderId = data.reservedOrderId;
            count += 1;
          }
        }
        return { count };
      }),
    },
    operationFinishedGoodUnitEvent: {
      createMany: vi.fn(async () => ({ count: 0 })),
    },
  };
}

describe("reserveCommercialOrderStock", () => {
  it.each([
    ["draft", "paid", true],
    ["accepted", "paid", true],
    ["confirmed", "paid", true],
    ["draft", "pending", false],
    ["accepted", "under_review", false],
    ["confirmed", "rejected", false],
    ["cancelled", "paid", false],
    ["stock_reserved", "paid", false],
    ["needs_production", "paid", false],
    ["cancelled", "pending", false],
  ])(
    "evaluates reservation eligibility for status=%s payment=%s",
    (status, paymentStatus, expected) => {
      expect(isCommercialOrderEligibleForReservation({ status, paymentStatus })).toBe(expected);
    }
  );

  it.each([
    ["draft", "pending"],
    ["accepted", "under_review"],
    ["confirmed", "rejected"],
    ["cancelled", "paid"],
    ["completed", "paid"],
  ])("rejects status=%s payment=%s before touching stock", async (status, paymentStatus) => {
    const tx = createTx(
      {
        id: `blocked-${status}-${paymentStatus}`,
        status,
        paymentStatus,
        items: [],
      },
      []
    );

    await expect(
      reserveCommercialOrderStock(tx as never, {
        orderId: `blocked-${status}-${paymentStatus}`,
        allowPartial: true,
      })
    ).rejects.toThrow("ORDER_NOT_READY_FOR_RESERVATION");
    expect(tx.operationFinishedGoodUnit.findMany).not.toHaveBeenCalled();
    expect(tx.operationCommercialOrder.update).not.toHaveBeenCalled();
  });

  it("reserves exactly one unit when inventory is sufficient", async () => {
    const tx = createTx(
      {
        id: "order-1",
        status: "draft",
        paymentStatus: "paid",
        items: [
          {
            id: "item-1",
            quantity: 1,
            productCode: "PRP-FG-STICKER",
            finishedGoodId: "fg-1",
            finishedGood: { code: "PRP-FG-STICKER", productType: "sticker_prerescatepty" },
          },
        ],
      },
      [
        {
          id: "unit-1",
          internalLabel: "U-001",
          productCode: "PRP-FG-STICKER",
          productType: "sticker_prerescatepty",
          status: "available",
          qaStatus: "passed",
          activationStatus: "not_activated",
          reservedOrderId: null,
          dispatchItems: [],
        },
      ]
    );

    const result = await reserveCommercialOrderStock(tx as never, { orderId: "order-1", allowPartial: true });

    expect(result?.summary.reservedQty).toBe(1);
    expect(result?.summary.missingQty).toBe(0);
    expect(result?.order.status).toBe("stock_reserved");
    expect(tx.operationFinishedGoodUnit.updateMany).toHaveBeenCalledTimes(1);
    expect(tx.operationFinishedGoodUnitEvent.createMany).toHaveBeenCalledTimes(1);
    expect(tx.operationCommercialOrder.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "order-1" },
        data: expect.objectContaining({
          status: "stock_reserved",
          fulfillmentStatus: "reserved",
        }),
      })
    );
  });

  it("keeps backorder behavior when inventory is unavailable", async () => {
    const tx = createTx(
      {
        id: "order-2",
        status: "draft",
        paymentStatus: "paid",
        items: [
          {
            id: "item-1",
            quantity: 1,
            productCode: "PRP-FG-STICKER",
            finishedGoodId: "fg-1",
            finishedGood: { code: "PRP-FG-STICKER", productType: "sticker_prerescatepty" },
          },
        ],
      },
      []
    );

    const result = await reserveCommercialOrderStock(tx as never, { orderId: "order-2", allowPartial: true });

    expect(result?.summary.reservedQty).toBe(0);
    expect(result?.summary.missingQty).toBe(1);
    expect(result?.order.status).toBe("needs_production");
    expect(tx.operationFinishedGoodUnit.updateMany).not.toHaveBeenCalled();
  });

  it("does not duplicate a reservation on repeated approval", async () => {
    const tx = createTx(
      {
        id: "order-3",
        status: "draft",
        paymentStatus: "paid",
        items: [
          {
            id: "item-1",
            quantity: 1,
            productCode: "PRP-FG-STICKER",
            finishedGoodId: "fg-1",
            finishedGood: { code: "PRP-FG-STICKER", productType: "sticker_prerescatepty" },
          },
        ],
      },
      [
        {
          id: "unit-1",
          internalLabel: "U-001",
          productCode: "PRP-FG-STICKER",
          productType: "sticker_prerescatepty",
          status: "available",
          qaStatus: "passed",
          activationStatus: "not_activated",
          reservedOrderId: null,
          dispatchItems: [],
        },
      ]
    );

    const first = await reserveCommercialOrderStock(tx as never, { orderId: "order-3", allowPartial: true });
    const second = await reserveCommercialOrderStock(tx as never, { orderId: "order-3", allowPartial: true });

    expect(first?.summary.reservedQty).toBe(1);
    expect(second?.summary.reservedQty).toBe(1);
    expect(second?.summary.missingQty).toBe(0);
  });

  it("allows only one of two competing reservations to consume the same unit", async () => {
    const sharedUnits: Unit[] = [
      {
        id: "unit-1",
        internalLabel: "U-001",
        productCode: "PRP-FG-STICKER",
        productType: "sticker_prerescatepty",
        status: "available",
        qaStatus: "passed",
        activationStatus: "not_activated",
        reservedOrderId: null,
        dispatchItems: [],
      },
    ];

    const txA = createTx(
      {
        id: "order-a",
        status: "draft",
        paymentStatus: "paid",
        items: [
          {
            id: "item-1",
            quantity: 1,
            productCode: "PRP-FG-STICKER",
            finishedGoodId: "fg-1",
            finishedGood: { code: "PRP-FG-STICKER", productType: "sticker_prerescatepty" },
          },
        ],
      },
      sharedUnits
    );

    const txB = createTx(
      {
        id: "order-b",
        status: "draft",
        paymentStatus: "paid",
        items: [
          {
            id: "item-1",
            quantity: 1,
            productCode: "PRP-FG-STICKER",
            finishedGoodId: "fg-1",
            finishedGood: { code: "PRP-FG-STICKER", productType: "sticker_prerescatepty" },
          },
        ],
      },
      sharedUnits
    );

    const first = await reserveCommercialOrderStock(txA as never, { orderId: "order-a", allowPartial: true });
    const second = await reserveCommercialOrderStock(txB as never, { orderId: "order-b", allowPartial: true });

    expect(first?.summary.reservedQty).toBe(1);
    expect(second?.summary.reservedQty).toBe(0);
  });

  it("rejects internal orders without reservation", async () => {
    const tx = createTx(
      {
        id: "order-internal",
        customerType: "internal",
        status: "draft",
        paymentStatus: "paid",
        items: [
          {
            id: "item-1",
            quantity: 1,
            productCode: "PRP-FG-STICKER",
            finishedGoodId: "fg-1",
            finishedGood: { code: "PRP-FG-STICKER", productType: "sticker_prerescatepty" },
          },
        ],
      },
      []
    );

    await expect(
      reserveCommercialOrderStock(tx as never, { orderId: "order-internal", allowPartial: true })
    ).rejects.toThrow("INTERNAL_ORDER_NO_RESERVATION");
  });

  it("does not reserve inventory for a mismapped or missing product because it only uses the order's own finishedGood mapping", async () => {
    const tx = createTx(
      {
        id: "order-mapped",
        status: "draft",
        paymentStatus: "paid",
        items: [
          {
            id: "item-1",
            quantity: 1,
            productCode: null,
            finishedGoodId: "fg-1",
            finishedGood: null,
          },
        ],
      },
      []
    );

    const result = await reserveCommercialOrderStock(tx as never, { orderId: "order-mapped", allowPartial: true });
    expect(result?.summary.reservedQty).toBe(0);
    expect(result?.summary.missingQty).toBe(1);
  });

  it("matches current and legacy inventory by finishedGood code even when productType differs", async () => {
    const tx = createTx(
      {
        id: "order-slug",
        status: "draft",
        paymentStatus: "paid",
        items: [
          {
            id: "item-1",
            quantity: 2,
            productCode: "PRP-FG-STICKER",
            finishedGoodId: "fg-1",
            finishedGood: { code: "PRP-FG-STICKER", productType: "sticker_prerescatepty" },
          },
        ],
      },
      [
        {
          id: "unit-current",
          internalLabel: "U-001",
          productCode: "PRP-FG-STICKER",
          productType: "sticker_prerescatepty",
          status: "available",
          qaStatus: "passed",
          activationStatus: "not_activated",
          reservedOrderId: null,
          dispatchItems: [],
        },
        {
          id: "unit-legacy",
          internalLabel: "U-002",
          productCode: "PRP-FG-STICKER",
          productType: "PRP-FG-STICKER",
          status: "available",
          qaStatus: "passed",
          activationStatus: "not_activated",
          reservedOrderId: null,
          dispatchItems: [],
        },
      ]
    );

    const result = await reserveCommercialOrderStock(tx as never, { orderId: "order-slug", allowPartial: true });

    expect(result?.summary.reservedQty).toBe(2);
    expect(result?.summary.missingQty).toBe(0);
  });
});
