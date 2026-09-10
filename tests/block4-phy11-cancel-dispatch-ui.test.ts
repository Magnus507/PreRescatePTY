import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(path, "utf8");
}

describe("Block 4 PHY-11 dispatch cancellation UI guardrail", () => {
  it("exposes the backend canCancel capability through the admin dispatch UI", () => {
    const dispatchUi = source("app/(admin)/admin/_components/sections/DirectDispatchSection.tsx");

    expect(dispatchUi).toContain("dispatch.canCancel");
    expect(dispatchUi).toContain("/api/admin/operations/dispatches/${dispatch.id}/cancel");
    expect(dispatchUi).toContain("Cancelar");
    expect(dispatchUi).toContain("window.confirm");
    expect(dispatchUi).toContain("data-testid={`dispatch-cancel-${dispatch.id}`}");
  });

  it("keeps cancellation eligibility sourced from the dispatch view model", () => {
    const viewModel = source("lib/operations/dispatch-view-model.ts");

    expect(viewModel).toContain("canCancel: boolean");
    expect(viewModel).toContain("const canCancel = cancellable");
    expect(viewModel).toContain("canCancel,");
  });

  it("keeps inventory release in the dedicated cancellation endpoint", () => {
    const cancelRoute = source("app/api/admin/operations/dispatches/[id]/cancel/route.ts");

    expect(cancelRoute).toContain("releaseEligibleOrderReservations");
    expect(cancelRoute).toContain('data: { unitId: null, status: "cancelled" }');
    expect(cancelRoute).toContain("DISPATCH_ALREADY_COMMITTED");
  });
});
