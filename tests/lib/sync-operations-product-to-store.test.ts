import { beforeEach, describe, expect, it, vi } from "vitest";
import { mockPrisma } from "../helpers/mock-prisma";
import { resetAllMocks } from "../helpers/reset-mocks";

vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

import { syncOperationsProductToStore } from "@/lib/operations/sync-operations-product-to-store";

describe("syncOperationsProductToStore", () => {
  beforeEach(() => {
    resetAllMocks();
    mockPrisma.product.findFirst.mockResolvedValue(null);
    mockPrisma.productOperationalMapping.findFirst.mockResolvedValue(null);
  });

  it("creates a store product with an operational mapping from the base product", async () => {
    mockPrisma.product.create.mockResolvedValue({
      id: "store-1",
      name: "Sticker PreRescatePTY",
      description: "Sticker visible\n[operationsProductCode:PRP-FG-STICKER]",
      isActive: true,
    } as never);
    mockPrisma.productOperationalMapping.create.mockResolvedValue({
      id: "mapping-1",
      productId: "store-1",
      finishedGoodId: "fg-1",
      productCode: "PRP-FG-STICKER",
      isPublished: true,
    } as never);

    const result = await syncOperationsProductToStore({
      finishedGoodId: "fg-1",
      operationsProductCode: "PRP-FG-STICKER",
      operationsProductName: "Sticker PreRescatePTY",
      productType: "PRP-FG-STICKER",
      defaultPrice: 25,
      category: "Accesorios",
      description: "Sticker visible",
      isActive: true,
    });

    expect(mockPrisma.product.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: "Sticker PreRescatePTY",
          productType: "PRP-FG-STICKER",
          isActive: true,
        }),
      })
    );
    expect(mockPrisma.productOperationalMapping.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          productId: "store-1",
          finishedGoodId: "fg-1",
          productCode: "PRP-FG-STICKER",
          storeSection: "personal_devices",
          purchaseFlow: "direct_purchase",
          activationFlow: "personal_profile",
          isPublished: true,
        }),
      })
    );
    expect(result.storeProductId).toBe("store-1");
    expect(result.operationalMappingId).toBe("mapping-1");
    expect(result.markerPresent).toBe(true);
  });

  it("updates the product attached to an existing mapping", async () => {
    mockPrisma.productOperationalMapping.findFirst.mockResolvedValue({
      id: "mapping-1",
      productId: "store-1",
      product: {
        id: "store-1",
        name: "Sticker PreRescatePTY",
        description: "Old text",
        price: 20,
        category: "Viejo",
        productType: "old",
        isActive: false,
        image: null,
      },
    } as never);
    mockPrisma.product.update.mockResolvedValue({
      id: "store-1",
      name: "Sticker PreRescatePTY",
      description: "Updated\n[operationsProductCode:PRP-FG-STICKER]",
      isActive: true,
    } as never);
    mockPrisma.productOperationalMapping.upsert.mockResolvedValue({
      id: "mapping-1",
      productId: "store-1",
      finishedGoodId: "fg-1",
      productCode: "PRP-FG-STICKER",
      isPublished: true,
    } as never);

    const result = await syncOperationsProductToStore({
      finishedGoodId: "fg-1",
      operationsProductCode: "PRP-FG-STICKER",
      operationsProductName: "Sticker PreRescatePTY",
      productType: "PRP-FG-STICKER",
      description: "Updated",
      isActive: true,
    });

    expect(mockPrisma.product.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "store-1" } })
    );
    expect(mockPrisma.productOperationalMapping.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { productId: "store-1" },
        update: expect.objectContaining({
          finishedGoodId: "fg-1",
          productCode: "PRP-FG-STICKER",
          isPublished: true,
        }),
      })
    );
    expect(result.matchStrategy).toBe("mapping");
  });
});
