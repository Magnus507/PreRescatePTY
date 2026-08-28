import { beforeEach, describe, expect, it, vi } from "vitest";
import { mockPrisma, resetMockPrisma } from "../helpers/mock-prisma";

vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));

import { loadInventoryStockDetail } from "@/lib/operations/inventory-stock";

describe("inventory stock detail", () => {
  beforeEach(() => {
    resetMockPrisma();
  });

  it("returns QR, NFC and activation code details for printable units", async () => {
    const createdAt = new Date("2026-08-28T02:00:00.000Z");
    const updatedAt = new Date("2026-08-28T02:05:00.000Z");

    mockPrisma.operationFinishedGood.findMany.mockResolvedValue([
      {
        id: "fg-1",
        code: "PRP-FG-STICKER",
        name: "Sticker PreRescatePTY",
        productType: "sticker_prerescatepty",
        status: "active",
      },
    ] as never);
    mockPrisma.operationFinishedGoodUnit.findMany
      .mockResolvedValueOnce([
        {
          id: "unit-1",
          productCode: "PRP-FG-STICKER",
          productName: "Sticker PreRescatePTY",
          productType: "sticker_prerescatepty",
          status: "available",
          qaStatus: "passed",
          activationStatus: "not_activated",
          reservedOrderId: null,
          dispatchedAt: null,
          deliveredAt: null,
          updatedAt,
        },
      ] as never)
      .mockResolvedValueOnce([
        {
          id: "unit-1",
          internalLabel: "STK-PRP-FG-STICKER-561F02D8-0001",
          productCode: "PRP-FG-STICKER",
          productName: "Sticker PreRescatePTY",
          qaStatus: "passed",
          status: "available",
          activationStatus: "not_activated",
          reservedOrderId: null,
          dispatchedAt: null,
          deliveredAt: null,
          createdAt,
          updatedAt,
          dispatchItems: [],
          digitalBatchItem: {
            shortCode: "PUBLIC7NM42",
            productionOrderId: "production-1",
            qrUrl: "/api/public/qr?data=https%3A%2F%2Fwww.prerescatepty.com%2Fe%2FPUBLIC7NM42",
            nfcUrl: "https://www.prerescatepty.com/e/PUBLIC7NM42",
            activationUrl: "https://www.prerescatepty.com/activar/STK-PRP-FG-STICKER-561F02D8-0001",
          },
          chip: {
            shortCode: "PUBLIC7NM42",
            qrUrl: "/api/public/qr?data=https%3A%2F%2Fwww.prerescatepty.com%2Fe%2FPUBLIC7NM42",
            nfcUrl: "https://www.prerescatepty.com/e/PUBLIC7NM42",
            claimTokens: [{ activationCode: "ABCD-EFGH-JKLM", activationCodeLast4: "JKLM" }],
          },
        },
      ] as never);
    mockPrisma.product.findMany.mockResolvedValue([] as never);

    const detail = await loadInventoryStockDetail("PRP-FG-STICKER");

    expect(detail.units[0]).toEqual(
      expect.objectContaining({
        shortCode: "PUBLIC7NM42",
        qrUrl: "/api/public/qr?data=https%3A%2F%2Fwww.prerescatepty.com%2Fe%2FPUBLIC7NM42",
        nfcUrl: "https://www.prerescatepty.com/e/PUBLIC7NM42",
        activationUrl: "https://www.prerescatepty.com/activar/STK-PRP-FG-STICKER-561F02D8-0001",
        activationCode: "ABCD-EFGH-JKLM",
        activationCodeLast4: "JKLM",
      })
    );
  });
});
