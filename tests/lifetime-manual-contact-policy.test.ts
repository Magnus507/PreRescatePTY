import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(path, "utf8");
}

describe("lifetime service + lifetime rescue + manual-contact policy guardrails", () => {
  it("never gates the public rescue profile on service expiry or paid corporate status", () => {
    const route = source("app/api/public/[shortCode]/route.ts");
    const resolver = source("lib/public-access/resolve-public-profile-by-chip.ts");

    expect(route).not.toContain('serviceStatus === "expired"');
    expect(route).not.toContain('corporateMember.corporateStatus !== "paid_active"');
    expect(route).not.toContain("Protocolo inactivo por falta de renovación");
    expect(resolver).not.toContain("serviceEndDate");
    expect(resolver).not.toContain("serviceStatus");
  });

  it("activates purchased identifiers with no time-based service expiry", () => {
    const activation = source("app/api/chips/activate/route.ts");
    expect(activation).toContain("serviceEndDate: null");
    expect(activation).toContain("lifetimeService: true");
    expect(activation).not.toContain("initialServiceEndDate");
    expect(activation).not.toContain("serviceDurationMonths");
    expect(activation).not.toContain("24-month");
  });

  it("keeps account service active regardless of legacy expiry dates and preserves personal unlimited activation", () => {
    const accountState = source("domains/accounts/services/account-state.service.ts");
    expect(accountState).toContain('const ACCOUNT_STATE_CACHE_VERSION = "v5"');
    expect(accountState).toContain("serviceEndDate: null");
    expect(accountState).toContain("serviceDurationMonths: null");
    expect(accountState).toContain("isExpired: false");
    expect(accountState).not.toContain("serviceEndDate < new Date()");
    expect(accountState).not.toContain('isExpired ? "expired"');
    expect(accountState).not.toContain("DEFAULT_SERVICE_DURATION_MONTHS");
    expect(accountState).toContain("!isCorporate || (!isInactive && activeChipsCount < maxChipsLimit)");
  });

  it("does not expose or accept a finite duration through package APIs", () => {
    const publicRoute = source("app/api/public/packages/route.ts");
    const adminRoute = source("app/api/admin/packages/route.ts");
    expect(publicRoute).toContain("serviceDurationMonths");
    expect(publicRoute).toContain("publicPackage");
    expect(publicRoute).toContain("void serviceDurationMonths");
    expect(adminRoute).toContain("LEGACY_LIFETIME_DURATION_MARKER = 0");
    expect(adminRoute).toContain("void serviceDurationMonths");
    expect(adminRoute).not.toContain("serviceDurationMonths ?? 24");
  });

  it("keeps medical profile correction possible for lifetime service", () => {
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

  it("removes obsolete automatic-alert and renewal UI from settings", () => {
    const layout = source("app/(app)/dashboard/configuracion/layout.tsx");
    const hardener = source("app/(app)/dashboard/configuracion/_components/LifetimePolicyHardening.tsx");
    expect(layout).toContain("LifetimePolicyHardening");
    expect(hardener).toContain("avisar automáticamente al escanear");
    expect(hardener).toContain("Servicio sin vencimiento por tiempo");
    expect(hardener).toContain("retiredServiceRenewal");
  });

  it("never advertises a finite service term or renewal on the purchase page", () => {
    const buy = source("app/(public)/comprar/ComprarContent.tsx");
    const guarantee = source("app/(public)/legal/garantia/page.tsx");
    expect(buy).not.toContain("serviceDurationMonths");
    expect(buy).not.toContain("24 meses");
    expect(buy.toLowerCase()).not.toContain("renovable");
    expect(buy.toLowerCase()).not.toContain("renovación");
    expect(buy).toContain("sin vencimiento por tiempo");
    expect(guarantee).not.toContain("24 meses");
    expect(guarantee.toLowerCase()).not.toContain("renovarse");
    expect(guarantee).toContain("servicio digital no vence por tiempo");
  });
});
