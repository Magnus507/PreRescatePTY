import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(path, "utf8");
}

describe("annual administration + continuous rescue + manual-contact policy guardrails", () => {
  it("never gates the public rescue profile on annual administration expiry or paid corporate status", () => {
    const route = source("app/api/public/[shortCode]/route.ts");
    const resolver = source("lib/public-access/resolve-public-profile-by-chip.ts");

    expect(route).not.toContain('serviceStatus === "expired"');
    expect(route).not.toContain('corporateMember.corporateStatus !== "paid_active"');
    expect(resolver).not.toContain("serviceEndDate");
    expect(resolver).not.toContain("serviceStatus");
  });

  it("keeps rescue identifiers active while granting annual administration separately", () => {
    const activation = source("app/api/chips/activate/route.ts");
    const corporateActivation = source("app/api/organizations/corporate-chip/activate/route.ts");

    for (const route of [activation, corporateActivation]) {
      expect(route).toContain("serviceEndDate: null");
      expect(route).toContain("grantForPhysicalUnitActivation");
      expect(route).not.toContain("initialServiceEndDate");
      expect(route).not.toContain('serviceStatus === "expired"');
    }
  });

  it("uses account-level annual access modes and preserves safety actions after expiry", () => {
    const accountState = source("domains/accounts/services/account-state.service.ts");

    expect(accountState).toContain('const ACCOUNT_STATE_CACHE_VERSION = "v6"');
    expect(accountState).toContain("serviceDurationMonths: 12");
    expect(accountState).toContain("resolveAccountAccessMode");
    expect(accountState).toContain('const isExpired = accessMode === "ESSENTIAL"');
    expect(accountState).toContain('canEditProfiles: isOwner && accessMode !== "ESSENTIAL"');
    expect(accountState).toContain('canManageDeviceAssignments: isOwner && accessMode === "FULL"');
    expect(accountState).toContain("canSuspendLostOrStolen: isOwner");
    expect(accountState).toContain("canUseSupport: true");
  });

  it("retires package sales while preserving historical package records", () => {
    const publicPackages = source("app/api/public/packages/route.ts");
    const manualCheckout = source("app/api/orders/manual/route.ts");
    const adminPackages = source("app/api/admin/packages/route.ts");

    expect(publicPackages).toContain("{ packages: [], deprecated: true }");
    expect(manualCheckout).toContain("PACKAGE_CHECKOUT_RETIRED");
    expect(manualCheckout).toContain("{ status: 410 }");
    expect(adminPackages).toContain("LEGACY_LIFETIME_DURATION_MARKER = 0");
  });

  it("requires active annual administration for profile edits without affecting public rescue", () => {
    const detail = source("app/api/users/perfiles-medicos/[profileId]/route.ts");

    expect(detail).toContain("AccountStateService.getAccountState");
    expect(detail).toContain("state.canEditProfiles");
    expect(detail).toContain("ANNUAL_ACCESS_REQUIRED");
  });

  it("keeps scans telemetry-only and retires every automatic server delivery entrypoint", () => {
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
  });

  it("does not let the settings hardener hide or rewrite annual renewal", () => {
    const hardener = source("app/(app)/dashboard/configuracion/_components/LifetimePolicyHardening.tsx");

    expect(hardener).toContain("Annual access and");
    expect(hardener).not.toContain("retiredServiceRenewal");
    expect(hardener).not.toContain('label.includes("renovar servicio")');
    expect(hardener).not.toContain("Servicio sin vencimiento por tiempo");
  });

  it("explains the annual model on the purchase page without claiming rescue stops at expiry", () => {
    const buy = source("app/(public)/comprar/ComprarContent.tsx");

    expect(buy).toContain("Cada unidad física elegible que compres y actives añade 12 meses");
    expect(buy).toContain("Tu QR/NFC de rescate no depende de esa renovación");
    expect(buy).not.toContain("paquetes disponibles");
  });

  it("keeps public and legal copy aligned with annual administration plus rescue continuity", () => {
    const hero = source("components/public/sections/HeroSection.tsx");
    const faq = source("app/(public)/faq/FAQContent.tsx");
    const how = source("app/(public)/como-funciona/ComoFuncionaContent.tsx");
    const terms = source("app/(public)/legal/terminos/page.tsx");
    const warranty = source("app/(public)/legal/garantia/page.tsx");

    expect(hero).toContain("QR/NFC de rescate continuo");
    expect(faq).toContain("12 meses de administración");
    expect(faq).toContain("El QR/NFC y la ficha pública siguen funcionando");
    expect(how).toContain("Rescate continuo, administración anual");
    expect(terms).toContain("añade 12 meses de administración de perfiles y dispositivos");
    expect(terms).toContain("Un reemplazo de garantía o");
    expect(warranty).toContain("no añade automáticamente otros");
    expect(warranty).toContain("12 meses de administración");

    const combined = [faq, how, terms, warranty].join("\n").toLowerCase();
    expect(combined).not.toContain("no existe renovación periódica");
    expect(combined).not.toContain("servicio digital no vence por tiempo");
  });
});
