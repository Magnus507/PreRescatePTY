import { describe, expect, it, vi } from "vitest";
import { ensureCustomerBackorderProduction } from "@/lib/operations/customer-order-production";

function buildDb(options?: { canonical?: boolean }) {
  const create = vi.fn(async ({ data }: { data: Record<string, unknown> }) => ({
    id: "production-1",
    code: data.code,
    status: data.status,
    plannedQuantity: data.plannedQuantity,
  }));

  const canonical = options?.canonical === false
    ? null
    : {
        id: "fg-1",
        code: "PRI-001",
        name: "STICKER",
        productType: "sticker-001",
      };

  return {
    db: {
      operationFinishedGood: {
        findUnique: vi.fn(async () => null),
        findFirst: vi.fn(async ({ where }: { where: Record<string, unknown> }) => {
          if ("code" in where) return canonical;
          return canonical;
        }),
      },
      operationProductionOrder: {
        findUnique: vi.fn(async () => null),
        create,
      },
    },
    create,
  };
}

describe("ensureCustomerBackorderProduction", () => {
  it("normalizes a legacy SKU passed as outputType into canonical productType + productCode", async () => {
    const { db, create } = buildDb();

    await ensureCustomerBackorderProduction(db as never, {
      orderId: "order-1",
      orderNumber: "PR-2026-000281",
      customerName: "Cliente",
      backorderQty: 1,
      outputType: "PRI-001",
      productName: "STICKER",
      productCode: null,
    });

    expect(create).toHaveBeenCalledTimes(1);
    const data = create.mock.calls[0][0].data as {
      outputType: string;
      title: string;
      events: { create: { metadataJson: string } };
    };
    expect(data.outputType).toBe("sticker-001");
    expect(data.title).toContain("STICKER");
    expect(JSON.parse(data.events.create.metadataJson)).toMatchObject({
      sourceType: "customer_order",
      orderId: "order-1",
      productCode: "PRI-001",
      outputType: "sticker-001",
      finishedGoodId: "fg-1",
    });
  });

  it("keeps a safe fallback when no finished-good record can be resolved", async () => {
    const { db, create } = buildDb({ canonical: false });

    await ensureCustomerBackorderProduction(db as never, {
      orderId: "order-2",
      orderNumber: "PR-2",
      backorderQty: 2,
      outputType: "custom-product-type",
      productName: "Custom",
      productCode: "CUSTOM-001",
    });

    const data = create.mock.calls[0][0].data as {
      outputType: string;
      events: { create: { metadataJson: string } };
    };
    expect(data.outputType).toBe("custom-product-type");
    expect(JSON.parse(data.events.create.metadataJson)).toMatchObject({
      productCode: "CUSTOM-001",
      outputType: "custom-product-type",
      finishedGoodId: null,
    });
  });
});
