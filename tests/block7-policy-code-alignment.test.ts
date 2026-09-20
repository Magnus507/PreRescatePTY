import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(path, "utf8");
}

describe("Block 7 policy-code alignment guardrails", () => {
  it("does not classify Sentry as optional analytics", () => {
    const cookies = source("app/(public)/legal/cookies/page.tsx");
    const consent = source("components/public/CookieConsent.tsx");

    expect(cookies).toContain("Sentry");
    expect(cookies).toContain("diagnóstico técnico");
    expect(cookies).toContain("Vercel Analytics");
    expect(consent).toContain("Vercel Analytics y Speed Insights");
    expect(consent).toContain("Sentry se utiliza");
    expect(consent).not.toContain("Vercel Analytics, Speed Insights y\n                      Sentry");
  });

  it("publishes the high-risk data categories and finite scan retention", () => {
    const privacy = source("app/(public)/legal/privacidad/page.tsx");
    for (const term of [
      "Perfil médico y de emergencia",
      "Escaneos",
      "Pagos y comprobantes",
      "Postventa",
      "Soporte",
      "Máximo 365 días",
      "SafeDelete",
    ]) {
      expect(privacy).toContain(term);
    }
  });

  it("persists support intake internally and requires WhatsApp", () => {
    const route = source("app/api/contacts/public/route.ts");
    const contact = source("app/(public)/contacto/ContactoContent.tsx");
    const admin = source("app/(admin)/admin/_components/sections/SupportMessagesSection.tsx");

    expect(route).toContain("prisma.supportMessage.create");
    expect(route).toContain("normalizeWhatsAppPhone");
    expect(route).not.toContain("resend.emails.send");
    expect(contact).toContain("WhatsApp obligatorio");
    expect(admin).toContain("Responder por WhatsApp");
    expect(admin).toContain("Marcar resuelto");
  });

  it("keeps checkout copy aligned with lifetime/manual-contact policy", () => {
    const upgrade = source("app/(app)/dashboard/upgrade/page.tsx");
    expect(upgrade).toContain("Servicio digital sin vencimiento por tiempo");
    expect(upgrade).toContain("Contacto de rescate manual desde el perfil público");
    expect(upgrade).not.toContain("Alertas Ilimitadas");
    expect(upgrade).not.toContain("Vigencia {pkg.serviceDurationMonths");
  });

  it("requires a current versioned legal consent before purchase when needed", () => {
    const orderRoute = source("app/api/orders/manual/route.ts");
    const checkout = source("app/(app)/dashboard/upgrade/page.tsx");
    const constants = source("domains/consents/consent.constants.ts");

    expect(constants).toContain("registration-terms-privacy-2026-09-19-v1.2");
    expect(orderRoute).toContain("LEGAL_ACCEPTANCE_REQUIRED");
    expect(orderRoute).toContain("CONSENT_TEXT_VERSION.TERMS_AND_PRIVACY");
    expect(checkout).toContain("acceptedTermsAndPrivacy");
    expect(checkout).toContain("Política de Privacidad");
  });

  it("keeps internal receipts distinct from fiscal invoices", () => {
    const terms = source("app/(public)/legal/terminos/page.tsx");
    const invoice = source("domains/invoices/services/invoice.service.ts");

    expect(terms).toContain("no deben confundirse");
    expect(terms).toContain("factura fiscal autorizada");
    expect(invoice).toContain('status: "pending_configuration"');
    expect(invoice).toContain("REC-");
  });
});
