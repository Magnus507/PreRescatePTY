import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(path, "utf8");
}

describe("lifetime rescue + manual-contact policy guardrails", () => {
  it("never gates the public rescue profile on legacy service expiry or paid corporate status", () => {
    const route = source("app/api/public/[shortCode]/route.ts");
    const resolver = source("lib/public-access/resolve-public-profile-by-chip.ts");

    expect(route).not.toContain('serviceStatus === "expired"');
    expect(route).not.toContain('corporateMember.corporateStatus !== "paid_active"');
    expect(route).not.toContain("Protocolo inactivo por falta de renovación");
    expect(resolver).not.toContain("serviceEndDate");
    expect(resolver).not.toContain("serviceStatus");
  });

  it("creates new activations without a time-based service end date", () => {
    const activation = source("app/api/chips/activate/route.ts");
    expect(activation).toContain("serviceEndDate: null");
    expect(activation).not.toContain("setMonth(serviceEndDate");
  });

  it("does not let the account-state layer resurrect historical expiry", () => {
    const accountState = source("domains/accounts/services/account-state.service.ts");
    expect(accountState).toContain('const ACCOUNT_STATE_CACHE_VERSION = "v4"');
    expect(accountState).toContain("const isExpired = false");
    expect(accountState).toContain("const serviceEndDate = null");
  });

  it("keeps scans telemetry-only and retires every server delivery entrypoint", () => {
    const scan = source("app/api/public/[shortCode]/scan/route.ts");
    const notify = source("app/api/public/[shortCode]/scan/[scanId]/notify/route.ts");
    const notifyCron = source("app/api/cron/notify/route.ts");
    const expireCron = source("app/api/cron/expire-chips/route.ts");

    expect(scan).not.toContain("@/lib/emergency-alerts");
    expect(scan).not.toContain("queueEmergencyNotificationsFromScan");
    expect(notify).toContain("{ status: 410 }");
    expect(notifyCron).not.toContain("processPendingEmergencyNotifications");
    expect(expireCron).not.toContain("prisma.chip.updateMany");
  });

  it("retires the automatic-alert preference API without deleting historical consent", () => {
    const preferences = source("app/api/users/alert-preferences/route.ts");

    expect(preferences).toContain("automaticAlertsAvailable: false");
    expect(preferences).toContain('deliveryMode: "manual_whatsapp"');
    expect(preferences).toContain("{ status: 410 }");
    expect(preferences).not.toContain("tx.consent.create");
    expect(preferences).not.toContain("tx.consent.updateMany");
  });

  it("mounts a public UI hardener that also catches late React href changes", () => {
    const page = source("app/(public)/e/[shortCode]/page.tsx");
    const hardener = source("app/(public)/e/[shortCode]/_components/ManualContactHardening.tsx");

    expect(page).toContain("ManualContactHardening");
    expect(hardener).toContain("buildManualRescueWhatsAppUrl");
    expect(hardener).toContain("lucide-bell-ring");
    expect(hardener).toContain('dataset.manualContact = "whatsapp"');
    expect(hardener).toContain("attributes: true");
    expect(hardener).toContain('attributeFilter: ["href"]');
  });

  it("hardens dashboard settings against obsolete automatic-alert and expiry UI", () => {
    const layout = source("app/(app)/dashboard/configuracion/layout.tsx");
    const hardener = source("app/(app)/dashboard/configuracion/_components/LifetimePolicyHardening.tsx");

    expect(layout).toContain("LifetimePolicyHardening");
    expect(hardener).toContain("avisar automáticamente al escanear");
    expect(hardener).toContain("Sin vencimiento por tiempo");
    expect(hardener).toContain("Estado del producto");
  });
});