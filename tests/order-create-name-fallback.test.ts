import { describe, expect, it } from "vitest";
import { orderCreateSchema } from "@/lib/validations";

const baseOrder = {
  customerEmail: "cliente@example.com",
  customerPhone: "6000-0000",
  shippingAddress: "Calle 1, Casa 20",
  shippingCity: "Panamá",
  paymentMethod: "yappy" as const,
  items: [{ productType: "product-id", quantity: 1, unitPrice: 25 }],
};

describe("orderCreateSchema delivery snapshot", () => {
  it("rejects a blank delivery recipient instead of inventing a generic customer", () => {
    expect(() => orderCreateSchema.parse({ ...baseOrder, customerName: " " }))
      .toThrow("Nombre de quien recibe requerido");
  });

  it("trims and preserves the recipient selected at checkout", () => {
    const result = orderCreateSchema.parse({
      ...baseOrder,
      customerName: "  Gean Cusatti  ",
      customerPhone: "  6000-0000  ",
      shippingAddress: "  Calle 1, Casa 20  ",
      shippingCity: "  Panamá  ",
    });

    expect(result.customerName).toBe("Gean Cusatti");
    expect(result.customerPhone).toBe("6000-0000");
    expect(result.shippingAddress).toBe("Calle 1, Casa 20");
    expect(result.shippingCity).toBe("Panamá");
  });

  it("requires a delivery phone and address for fulfillment", () => {
    expect(() => orderCreateSchema.parse({ ...baseOrder, customerName: "Gean Cusatti", customerPhone: "" }))
      .toThrow("Teléfono de contacto requerido");

    expect(() => orderCreateSchema.parse({ ...baseOrder, customerName: "Gean Cusatti", shippingAddress: "" }))
      .toThrow("Dirección de entrega requerida");
  });
});
