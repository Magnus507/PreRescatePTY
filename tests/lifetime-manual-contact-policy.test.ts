import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(path, "utf8");
}

describe("permanent service + manual-contact policy guardrails", () => {
  it("never gates the public rescue profile on time expiry or paid corporate status", () => {
    const route = source("app/api/public/[shortCode]/route.ts");
    const resolver = source("lib/public-access/resolve-public-profile-by-chip.ts");

    expect(route).not.toContain('serviceStatus === "expired"');
    expect(route).not.toContain('corporateMember.corporateStatus !== "paid_active"');
    expect(resolver).not.toContain("serviceEndDate");
    expect(resolver).not.toContain("serviceStatus");
  });

  it("activates purchased personal and corporate identifiers with no time-based expiry", () => {
    const activation = source("app/api/chips/activate/route.ts");
    const corporateActivation = source("app/api/organizations/corporate-chip/activate/route.ts");

    for (const route of [activation, corporateActivation]) {
      expect(route).toContain("serviceEndDate: null");
      expect(route).toContain("lifetimeService: true");
      expect(route).not.toContain("grantForPhysicalUnitActivation");
      expect(route).not.toContain("initialServiceEndDate");
      expect(route).not.toContain('serviceStatus === "expired"');
    }
  });

  it("keeps account service permanent while enforcing the ten-profile cap", () => {
    const accountState = source("domains/accounts/services/account-state.service.ts");
    const policy = source("domains/accounts/account-policy.ts");

    expect(accountState).toContain('const ACCOUNT_STATE_CACHE_VERSION = "v8"');
    expect(accountState).toContain("serviceEndDate: null");
    expect(accountState).toContain("serviceDurationMonths: null");
    expect(accountState).toContain("isExpired: false");
    expect(accountState).not.toContain("resolveAccountAccessMode");
    expect(accountState).not.toContain("ESSENTIAL");
    expect(accountState).not.toContain("PENDING_ACTIVATION");
    expect(accountState).toContain('activatedAt: { not: null }');
    expect(accountState).toContain("hasEverActivatedChip");
    expect(accountState).toContain("canAddFamilyMember: !isCorporate && isOwner && hasEverActivatedChip");
    expect(accountState).toContain("canCreateProfiles: !isCorporate && isOwner && hasEverActivatedChip");
    expect(accountState).toContain("canEditProfiles: isOwner");
    expect(accountState).toContain("canManageDeviceAssignments: isOwner");
    expect(accountState).toContain("canReactivateDevices: isOwner");
    expect(accountState).toContain("canUseSupport: true");
    expect(policy).toContain("PERSONAL_PROFILE_LIMIT = 10");
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

  it("keeps medical profile editing available without a renewal gate", () => {
    const detail = source("app/api/users/perfiles-medicos/[profileId]/route.ts");
    const profiles = source("app/api/users/perfiles-medicos/route.ts");

    expect(detail).not.toContain("ANNUAL_ACCESS_REQUIRED");
    expect(detail).not.toContain("state.canEditProfiles");
    expect(profiles).not.toContain("ESSENTIAL");
    expect(profiles).toContain("PERSONAL_PROFILE_LIMIT");
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

  it("hides legacy renewal controls and rewrites stale expiry copy", () => {
    const hardener = source("app/(app)/dashboard/configuracion/_components/LifetimePolicyHardening.tsx");

    expect(hardener).toContain("Servicio sin vencimiento");
    expect(hardener).toContain("retiredServiceRenewal");
    expect(hardener).toContain('label.includes("renovar servicio")');
  });

  it("keeps purchase and legal copy aligned with payment-once permanent service", () => {
    const buy = source("app/(public)/comprar/ComprarContent.tsx");
    const faq = source("app/(public)/faq/FAQContent.tsx");
    const how = source("app/(public)/como-funciona/ComoFuncionaContent.tsx");
    const terms = source("app/(public)/legal/terminos/page.tsx");
    const warranty = source("app/(public)/legal/garantia/page.tsx");

    expect(buy).toContain("un único pago");
    expect(buy).toContain("no tiene mensualidades ni vencimiento por tiempo");
    expect(faq).toContain("No. El servicio digital se adquiere con un único pago");
    expect(faq).toContain("No. No existe renovación periódica");
    expect(how).toContain("Servicio sin vencimiento");
    expect(terms).toContain("La compra personal es de pago único");
    expect(warranty).toContain("El servicio digital no vence por tiempo");

    const combined = [buy, faq, how, terms, warranty].join("\n").toLowerCase();
    expect(combined).not.toContain("12 meses de administración");
    expect(combined).not.toContain("renovación anual");
  });

  it("contains no annual renewal runtime surface", () => {
    const schema = source("prisma/schema.prisma");
    const yappy = source("app/api/payments/yappy/ipn/route.ts");

    expect(schema).not.toContain("ServiceEntitlement");
    expect(schema).not.toContain("RenewalPayment");
    expect(schema).not.toContain("grantsAnnualAccess");
    expect(yappy).not.toContain("renewalPayment");
    expect(yappy).not.toContain("grantForConfirmedRenewalPayment");
  });
});
