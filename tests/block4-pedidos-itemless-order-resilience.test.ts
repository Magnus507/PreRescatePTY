import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Block 4 Pedidos itemless-order resilience", () => {
  it("keeps the admin orders API and UI contract safe when normalized item fields are empty", () => {
    const route = readFileSync("app/api/admin/orders/route.ts", "utf8");
    const ui = readFileSync("app/(admin)/admin/_components/sections/PedidosSection.tsx", "utf8");

    expect(route).toContain("items: order.items");
    expect(ui).not.toContain("order.items[0]?.");
    expect(ui.match(/order\.items\?\.\[0\]\?\./g)?.length).toBeGreaterThanOrEqual(3);
  });
});
