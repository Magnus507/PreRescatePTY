import { describe, expect, it } from "vitest";
import { buildOperationsOrderViewModel } from "@/lib/operations/operations-order-view-model";

describe("buildOperationsOrderViewModel", () => {
  it("does not expose Reservar etiqueta interna for direct sticker orders that are in backorder", () => {
    const order = buildOperationsOrderViewModel({
      id: "order-1",
      orderNumber: "PR-2026-000310",
      provider: "manual",
      providerReference: "PR-2026-000310",
      customerName: "Cliente Demo",
      customerEmail: "demo@example.com",
      customerPhone: "555-1234",
      paymentStatus: "paid",
      paymentMethod: "manual",
      paymentProofUrl: "/proof.png",
      manualPaymentReference: null,
      adminReviewStatus: "approved",
      adminReviewNotes: "Stock/backorder calculado automáticamente.\nTiene backorder: sí.\nProducción estimada: 14 días.",
      orderStatus: "processing",
      orderType: "manual",
      amount: 25,
      currency: "USD",
      createdAt: new Date("2026-07-13T10:00:00Z"),
      updatedAt: new Date("2026-07-13T10:00:00Z"),
      shippingAddress: null,
      shippingCity: null,
      shippingNotes: null,
      customerDocument: null,
      user: null,
      dispatch: null,
      reservedUnits: [],
      items: [
        {
          productType: "Sticker PreRescatePTY",
          quantity: 1,
          totalPrice: 25,
          unitPrice: 25,
        },
      ],
    });

    expect(order.canReserveInternalLabel).toBe(false);
    expect(order.canSendToProduction).toBe(true);
    expect(order.pendingCategory).toBe("production_required");
    expect(order.pendingReasonLabel).toBe("Producción requerida");
  });
});
