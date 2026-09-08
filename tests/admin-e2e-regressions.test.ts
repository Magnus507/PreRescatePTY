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

  it("persists the finished-good code on customer backorder production", () => {
    const production = source("lib/operations/customer-order-production.ts");
    expect(production).toContain("input.productCode?.trim() || input.outputType.trim()");
    expect(production).toContain("productCode,");
  });

  it("resolves legacy production output as an exact finished-good code before generic fallbacks", () => {
    const assembly = source("app/api/admin/operations/production-orders/[id]/unit-assembly/[preparationId]/complete/route.ts");
    expect(assembly).toContain("where: { code: item.batch.productType }");
    expect(assembly).toContain("exactFinishedGood || legacyFinishedGoodByCode");
  });

  it("reconciles already-passed QC instead of returning before reservation", () => {
    const qa = source("app/api/admin/operations/production-orders/[id]/qa/[unitId]/pass/route.ts");
    expect(qa).toContain("reconcileCustomerProducedUnitReservation");
    expect(qa).toContain("PRODUCT_IDENTITY_RECONCILED");
    expect(qa).not.toContain("if (unit.qaStatus === \"passed\") return { unit, reservation: null }");
  });

  it("claims the produced unit for its exact source order and blocks cross-order/SKU mismatches", () => {
    const reconciliation = source("lib/operations/customer-produced-unit-reservation.ts");
    expect(reconciliation).toContain("PRODUCED_UNIT_PRODUCT_MISMATCH");
    expect(reconciliation).toContain("PRODUCED_UNIT_RESERVED_TO_OTHER_ORDER");
    expect(reconciliation).toContain("reservationSource: \"customer_production_qc\"");
    expect(reconciliation).toContain("id: unit.id");
  });

  it("runs historical post-QC recovery from the already-monitored commerce sync worker", () => {
    const cron = source("app/api/cron/commerce-order-sync/route.ts");
    expect(cron).toContain("recoverStrandedCustomerProducedUnits");
    expect(cron).toContain("customerProductionRecovery");
    expect(cron).toContain("recordCronSuccess");
  });

  it("historical recovery only claims untouched customer-produced QC units and never creates dispatch", () => {
    const recovery = source("lib/operations/stranded-customer-production-recovery.ts");
    expect(recovery).toContain('metadataJson: { contains: "\\\"sourceType\\\":\\\"customer_order\\\"" }');
    expect(recovery).toContain('status: "available"');
    expect(recovery).toContain('qaStatus: "passed"');
    expect(recovery).toContain('activationStatus: "not_activated"');
    expect(recovery).toContain('reservedOrderId: null');
    expect(recovery).toContain('dispatchItems: { none: {} }');
    expect(recovery).toContain("reconcileCustomerProducedUnitReservation");
    expect(recovery).toContain('eventType: "CUSTOMER_UNIT_RECOVERED"');
    expect(recovery).not.toContain("operationDispatch.create");
    expect(recovery).not.toContain("operationDispatchItem.create");
  });

  it("separates legitimate historical outbox lifecycle events from simultaneous active overlap", () => {
    const cron = source("app/api/cron/commerce-order-sync/route.ts");
    expect(cron).toContain('historicalMultiEventSourcePairs');
    expect(cron).toContain('activeOverlappingSourcePairs');
    expect(cron).toContain("WHERE status IN ('pending', 'processing', 'retrying')");
    expect(cron).toContain('duplicateSourcePairs: activeOverlappingSourcePairs');
    expect(cron).not.toContain('HAVING COUNT(*) > 1');
  });

  it("serializes QA pass and fail decisions on the production-order row before loading the unit", () => {
    const routes = [
      source("app/api/admin/operations/production-orders/[id]/qa/[unitId]/pass/route.ts"),
      source("app/api/admin/operations/production-orders/[id]/qa/[unitId]/fail/route.ts"),
    ];

    for (const route of routes) {
      const lockIndex = route.indexOf("const productionOrderLock = await tx.operationProductionOrder.updateMany");
      const unitReadIndex = route.indexOf("tx.operationFinishedGoodUnit.findUnique");
      expect(route).toContain("prisma.$transaction");
      expect(route).toContain("if (productionOrderLock.count !== 1) return null");
      expect(lockIndex).toBeGreaterThan(-1);
      expect(unitReadIndex).toBeGreaterThan(lockIndex);
    }
  });

  it("keeps QA failure unit/event and production-order state changes atomic", () => {
    const fail = source("app/api/admin/operations/production-orders/[id]/qa/[unitId]/fail/route.ts");
    expect(fail).toContain("const result = await prisma.$transaction");
    expect(fail).toContain("await tx.operationFinishedGoodUnit.update");
    expect(fail).toContain("await tx.operationProductionOrder.update");
    expect(fail).not.toContain("await prisma.operationFinishedGoodUnit.update");
    expect(fail).not.toContain("await prisma.operationProductionOrder.update");
  });
});
