import { describe, expect, it } from "vitest";
import { orderCreateSchema } from "@/lib/validations";

const baseOrder = {
  customerEmail: "cliente@example.com",
  shippingAddress: "Calle 1",
  shippingCity: "Panamá",
  paymentMethod: "yappy" as const,
  items: [{ productType: "product-id", quantity: 1, unitPrice: 25 }],
};

describe("orderCreateSchema customerName fallback", () => {
  it("uses a safe fallback when a legacy profile produces a blank name", () => {
    const result = orderCreateSchema.parse({ ...baseOrder, customerName: " " });
    expect(result.customerName).toBe("Cliente");
  });

  it("trims and preserves a valid customer name", () => {
    const result = orderCreateSchema.parse({ ...baseOrder, customerName: "  Gean Cusatti  " });
    expect(result.customerName).toBe("Gean Cusatti");
  });
});
