import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findFirstMock: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    product: {
      findFirst: mocks.findFirstMock,
    },
  },
}));

import { mapCommercialItemToOperationalRequirement } from "@/lib/operations/commercial-product-mapping";

describe("mapCommercialItemToOperationalRequirement", () => {
  beforeEach(() => {
    mocks.findFirstMock.mockReset();
  });

  it("resolves a published operational mapping instead of falling back to sticker", async () => {
    mocks.findFirstMock.mockResolvedValueOnce({
      name: "Pulsera PreRescatePTY",
      operationalMapping: {
        isPublished: true,
        finishedGoodId: "fg-1",
        productCode: "PRP-FG-PULSERA",
        finishedGood: {
          id: "fg-1",
          code: "PRP-FG-PULSERA",
          name: "Pulsera PreRescatePTY",
          productType: "PRP-FG-PULSERA",
          status: "active",
        },
      },
    });

    const result = await mapCommercialItemToOperationalRequirement({
      productType: "Pulsera PreRescatePTY",
      productName: "Pulsera PreRescatePTY",
      quantity: 2,
    });

    expect(result.operationalProductCode).toBe("PRP-FG-PULSERA");
    expect(result.operationalProductName).toBe("Pulsera PreRescatePTY");
    expect(result.operationalMappingStatus).toBe("mapped");
    expect(result.commercialQuantity).toBe(2);
  });

  it("keeps unresolved items explicit instead of forcing sticker", async () => {
    mocks.findFirstMock.mockResolvedValueOnce(null);
    mocks.findFirstMock.mockResolvedValueOnce(null);

    const result = await mapCommercialItemToOperationalRequirement({
      productType: "Pulsera PreRescatePTY",
      productName: "Pulsera PreRescatePTY",
      quantity: 1,
    });

    expect(result.operationalProductCode).toBe("Pulsera PreRescatePTY");
    expect(result.operationalProductName).toBe("Pulsera PreRescatePTY");
    expect(result.operationalMappingStatus).toBe("unmapped");
  });
});
