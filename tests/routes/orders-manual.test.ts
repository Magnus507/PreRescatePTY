import { describe, expect, it } from "vitest";
import { POST } from "@/app/api/orders/manual/route";

describe("POST /api/orders/manual", () => {
  it("retires legacy package checkout and directs purchases to individual devices", async () => {
    const response = await POST();
    const json = await response.json();

    expect(response.status).toBe(410);
    expect(json).toEqual({
      error: "El checkout por paquetes fue retirado. Compra dispositivos individuales desde la tienda.",
      code: "PACKAGE_CHECKOUT_RETIRED",
    });
  });
});
