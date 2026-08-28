import { describe, expect, it } from "vitest";
import {
  buildAdminOperationsUrl,
  getLegacyAdminTabTarget,
  parseOperationsTab,
} from "@/lib/admin/operations-routing";

describe("admin operations routing", () => {
  it("uses Pedidos as the default operational stage", () => {
    expect(parseOperationsTab(null)).toBe("commercial");
    expect(parseOperationsTab("unknown")).toBe("commercial");
  });

  it("accepts every canonical operational stage", () => {
    expect(parseOperationsTab("production")).toBe("production");
    expect(parseOperationsTab("inventory")).toBe("inventory");
    expect(parseOperationsTab("dispatch")).toBe("dispatch");
    expect(parseOperationsTab("postsales")).toBe("postsales");
    expect(parseOperationsTab("history")).toBe("history");
  });

  it("builds one canonical admin URL for each operational stage", () => {
    expect(buildAdminOperationsUrl("commercial")).toBe("/admin?tab=inventory&op=commercial");
    expect(buildAdminOperationsUrl("production")).toBe("/admin?tab=inventory&op=production");
    expect(buildAdminOperationsUrl("dispatch", "PR-1001")).toBe("/admin?tab=inventory&op=dispatch&q=PR-1001");
  });

  it("maps only proven legacy admin tabs into the operations center", () => {
    expect(getLegacyAdminTabTarget("pedidos")).toBe("commercial");
    expect(getLegacyAdminTabTarget("tienda")).toBe("inventory");
    expect(getLegacyAdminTabTarget("chips")).toBeNull();
    expect(getLegacyAdminTabTarget("users")).toBeNull();
  });
});
