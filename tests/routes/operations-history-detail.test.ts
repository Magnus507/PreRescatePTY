import { beforeEach, describe, expect, it, vi } from "vitest";
import { mockPrisma, resetMockPrisma } from "../helpers/mock-prisma";

const role = vi.hoisted(() => vi.fn());

vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/lib/rbac", () => ({
  GENERAL_ADMIN_ROLES: ["admin", "superadmin"],
  requireRole: role,
}));

import { GET } from "@/app/api/admin/operations/history/[id]/route";
import { deriveCommercialHistoryStatus } from "@/lib/operations/commercial-order-history-detail";

describe("operations historical order dossier", () => {
  beforeEach(() => {
    resetMockPrisma();
    role.mockResolvedValue({ authorized: true, session: { user: { id: "admin-1" } } });
  });

  it("treats a delivered dispatch as authoritative over a stale processing order", () => {
    expect(
      deriveCommercialHistoryStatus({
        orderStatus: "processing",
        fulfillmentStatus: "dispatch_pending",
        dispatchStatus: "delivered",
        deliveredAt: new Date("2026-09-07T00:11:14.813Z"),
      })
    ).toBe("delivered");
  });

  it("returns the consolidated delivered unit without selecting activation credentials", async () => {
    mockPrisma.operationCommercialOrder.findUnique.mockResolvedValue({
      id: "op-order-1",
      code: "OP-CLI-PR-2026-000136",
      sourceType: "customer_order",
      sourceId: "order-1",
      status: "processing",
      customerType: "customer",
      customerName: "Cliente Prueba",
      customerEmail: "cliente@example.test",
      customerPhone: "60000000",
      customerReference: null,
      salesChannel: "web",
      paymentStatus: "paid",
      fulfillmentStatus: "dispatch_pending",
      totalAmount: 25,
      currency: "USD",
      createdAt: new Date("2026-09-06T20:00:00.000Z"),
      updatedAt: new Date("2026-09-07T00:11:14.813Z"),
      items: [
        {
          id: "item-1",
          productCode: "PRI-001",
          productName: "STICKER",
          quantity: 1,
          unitPrice: 25,
          totalPrice: 25,
          unit: "unit",
          createdAt: new Date("2026-09-06T20:00:00.000Z"),
        },
      ],
      dispatch: {
        id: "dispatch-1",
        code: "DSP-OP-CLI-PR-2026-000136",
        status: "delivered",
        destinationType: "customer",
        destinationName: "Cliente Prueba",
        destinationReference: null,
        destinationAddress: "Panamá",
        carrierName: null,
        trackingReference: null,
        scheduledAt: null,
        sentAt: new Date("2026-09-06T23:00:00.000Z"),
        dispatchedAt: new Date("2026-09-06T23:00:00.000Z"),
        deliveredAt: new Date("2026-09-07T00:11:14.813Z"),
        createdAt: new Date("2026-09-06T22:00:00.000Z"),
        updatedAt: new Date("2026-09-07T00:11:14.813Z"),
        items: [
          {
            id: "dispatch-item-1",
            internalLabel: "STK-PRI-001-TEST-0001",
            productCode: "PRI-001",
            productName: "STICKER",
            quantity: 1,
            unit: "unit",
            status: "delivered",
            pickedAt: new Date("2026-09-06T22:10:00.000Z"),
            packedAt: new Date("2026-09-06T22:20:00.000Z"),
            dispatchedAt: new Date("2026-09-06T23:00:00.000Z"),
            deliveredAt: new Date("2026-09-07T00:11:14.813Z"),
            unitRecord: {
              id: "unit-1",
              internalLabel: "STK-PRI-001-TEST-0001",
              productCode: "PRI-001",
              productName: "STICKER",
              productType: "sticker_nfc_qr",
              status: "delivered",
              qaStatus: "passed",
              activationStatus: "not_activated",
              reservedAt: new Date("2026-09-06T21:00:00.000Z"),
              dispatchedAt: new Date("2026-09-06T23:00:00.000Z"),
              deliveredAt: new Date("2026-09-07T00:11:14.813Z"),
              activatedAt: null,
              createdAt: new Date("2026-09-06T19:00:00.000Z"),
              chip: {
                serialPublic: "PUBLIC-SERIAL",
                shortCode: "PUBLIC-SHORTCODE",
                nfcUrl: "https://www.prerescatepty.com/e/PUBLIC-SHORTCODE",
                qrUrl: "/api/public/qr?data=public",
                status: "inventory",
                serviceStatus: "active",
                activatedAt: null,
              },
            },
          },
        ],
      },
    } as never);

    const response = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ id: "op-order-1" }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.detail.order.effectiveStatus).toBe("delivered");
    expect(body.detail.order.fulfillmentStatus).toBe("delivered");
    expect(body.detail.dispatch.code).toBe("DSP-OP-CLI-PR-2026-000136");
    expect(body.detail.dispatch.items[0].unitRecord.internalLabel).toBe("STK-PRI-001-TEST-0001");
    expect(body.detail.dispatch.items[0].unitRecord.chip.shortCode).toBe("PUBLIC-SHORTCODE");

    const query = mockPrisma.operationCommercialOrder.findUnique.mock.calls[0]?.[0];
    expect(JSON.stringify(query)).not.toContain("activationCode");
    expect(JSON.stringify(query)).not.toContain("activationUrl");
    expect(JSON.stringify(body)).not.toContain("activationCode");
  });

  it("denies unauthorized users before reading history detail", async () => {
    role.mockResolvedValue({ authorized: false, response: new Response("", { status: 403 }) });

    const response = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ id: "op-order-1" }),
    });

    expect(response.status).toBe(403);
    expect(mockPrisma.operationCommercialOrder.findUnique).not.toHaveBeenCalled();
  });
});
