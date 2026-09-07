import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(path, "utf8");
}

describe("lifetime rescue + finite service + manual-contact policy guardrails", () => {
  it("never gates the public rescue profile on service expiry or paid corporate status", () => {
    const route = source("app/api/public/[shortCode]/route.ts");
    const resolver = source("lib/public-access/resolve-public-profile-by-chip.ts");

    expect(route).not.toContain('serviceStatus === "expired"');
    expect(route).not.toContain('corporateMember.corporateStatus !== "paid_active"');
    expect(route).not.toContain("Protocolo inactivo por falta de renovación");
    expect(resolver).not.toContain("serviceEndDate");
    expect(resolver).not.toContain("serviceStatus");
  });

  it("creates a finite commercial service term on activation", () => {
    const activation = source("app/api/chips/activate/route.ts");
    expect(activation).toContain("initialServiceEndDate(now, state.serviceDurationMonths)");
    expect(activation).toContain("serviceEndDate,");
    expect(activation).not.toContain("serviceEndDate: null");
  });

  it("lets account state report commercial expiry without imposing a personal chip cap", () => {
    const accountState = source("domains/accounts/services/account-state.service.ts");
    expect(accountState).toContain('const ACCOUNT_STATE_CACHE_VERSION = "v4"');
    expect(accountState).toContain('const isExpired = serviceEndDate ? serviceEndDate < new Date() : false');
    expect(accountState).toContain('isExpired ? "expired"');
    expect(accountState).toContain("BUSINESS_RULES.DEFAULT_SERVICE_DURATION_MONTHS");
    expect(accountState).toContain("!isCorporate || (!isInactive && activeChipsCount < maxChipsLimit)");
  });

  it("keeps medical profile correction possible after commercial service expiry", () => {
    const detail = source("app/api/users/perfiles-medicos/[profileId]/route.ts");
    expect(detail).toContain("Unrestricted editing of medical profiles ensures data integrity");
    expect(detail).not.toContain("state.isExpired");
    expect(detail).not.toContain('serviceStatus === "expired"');
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

  it("keeps the legacy emergency-alert module fail-safe and unable to reach providers", () => {
    const engine = source("lib/emergency-alerts.ts");
    expect(engine).toContain('reason: "automatic_delivery_retired"');
    expect(engine).toContain("claimed: 0");
    expect(engine).toContain("sent: 0");
    expect(engine).not.toContain('from "@/lib/notifications"');
    expect(engine).not.toContain("sendEmergencyNotification(");
    expect(engine).not.toContain("db.notification.create(");
    expect(engine).not.toContain("db.notification.updateMany(");
    expect(engine).not.toContain("db.notification.findMany(");
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

  it("removes obsolete automatic-alert UI without erasing finite service dates", () => {
    const layout = source("app/(app)/dashboard/configuracion/layout.tsx");
    const hardener = source("app/(app)/dashboard/configuracion/_components/LifetimePolicyHardening.tsx");
    expect(layout).toContain("LifetimePolicyHardening");
    expect(hardener).toContain("avisar automáticamente al escanear");
    expect(hardener).toContain("Estado del servicio");
    expect(hardener).not.toContain("Sin vencimiento por tiempo");
    expect(hardener).not.toContain("Válido hasta:.*");
  });
});
