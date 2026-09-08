import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { isCommercialOrderEligibleForReservation } from "@/lib/operations/commercial-order-reservation";

function source(path: string) {
  return readFileSync(path, "utf8");
}

describe("admin E2E regression guardrails", () => {
  it("only exposes editable admin config keys and keeps cron heartbeat keys out of the form payload", () => {
    const route = source("app/api/admin/config/route.ts");
    expect(route).toContain("CONFIG_KEYS.map((key) => [key, allConfigs[key] ?? \"\"])");
    expect(route).not.toContain("return NextResponse.json({ configs: await ConfigRepository.getAll() })");
  });

  it("provides a deterministic way to leave a history detail and return to the history list", () => {
    const operations = source("app/(admin)/admin/_components/sections/OperationsCenterSection.tsx");
    expect(operations).toContain("Volver al historial");
    expect(operations).toContain("setHistoryResetKey((current) => current + 1)");
    expect(operations).toContain("<HistorySection key={historyResetKey} />");
  });

  it("allows a paid order waiting for produced stock to be reserved once QC passes", () => {
    expect(isCommercialOrderEligibleForReservation({ status: "needs_production", paymentStatus: "paid" })).toBe(true);
    expect(isCommercialOrderEligibleForReservation({ status: "pending_stock", paymentStatus: "paid" })).toBe(true);
    expect(isCommercialOrderEligibleForReservation({ status: "accepted", paymentStatus: "paid" })).toBe(true);
    expect(isCommercialOrderEligibleForReservation({ status: "needs_production", paymentStatus: "pending" })).toBe(false);
    expect(isCommercialOrderEligibleForReservation({ status: "stock_reserved", paymentStatus: "paid" })).toBe(false);
  });
});
