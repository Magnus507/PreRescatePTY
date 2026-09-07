import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("global public metadata lifetime policy", () => {
  it("never advertises the retired finite service term", () => {
    const layout = readFileSync("app/layout.tsx", "utf8");

    expect(layout).toContain("Pago único y servicio digital sin vencimiento por tiempo");
    expect(layout.toLowerCase()).not.toContain("2 años de vigencia");
    expect(layout.toLowerCase()).not.toContain("vigencia de 2 años");
  });
});
