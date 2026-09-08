import { describe, expect, it } from "vitest";
import {
  buildContentSecurityPolicy,
  buildStaticPublicContentSecurityPolicy,
  isProtectedAppRoute,
  isStaticPublicRoute,
  requiresNonceCsp,
} from "@/lib/security/csp";

function getDirective(policy: string, name: string) {
  return policy
    .split(";")
    .map((directive) => directive.trim())
    .find((directive) => directive.startsWith(`${name} `));
}

describe("Content Security Policy", () => {
  it("uses a nonce and strict-dynamic without unsafe script execution on sensitive routes", () => {
    const policy = buildContentSecurityPolicy("test-nonce", false);
    const scriptSrc = getDirective(policy, "script-src");

    expect(scriptSrc).toContain("'nonce-test-nonce'");
    expect(scriptSrc).toContain("'strict-dynamic'");
    expect(scriptSrc).not.toContain("'unsafe-inline'");
    expect(scriptSrc).not.toContain("'unsafe-eval'");
  });

  it("keeps unsafe-eval limited to development for nonce CSP", () => {
    const policy = buildContentSecurityPolicy("dev-nonce", true);
    const scriptSrc = getDirective(policy, "script-src");

    expect(scriptSrc).toContain("'unsafe-eval'");
    expect(scriptSrc).not.toContain("'unsafe-inline'");
  });

  it("allows only the static public policy to use inline Next bootstrap scripts", () => {
    const policy = buildStaticPublicContentSecurityPolicy(false);
    const scriptSrc = getDirective(policy, "script-src");

    expect(scriptSrc).toContain("'unsafe-inline'");
    expect(scriptSrc).not.toContain("'nonce-");
    expect(scriptSrc).not.toContain("'strict-dynamic'");
    expect(scriptSrc).not.toContain("'unsafe-eval'");
  });

  it("preserves the required Yappy script and API origins in both policies", () => {
    for (const policy of [
      buildContentSecurityPolicy("payment-nonce", false),
      buildStaticPublicContentSecurityPolicy(false),
    ]) {
      const scriptSrc = getDirective(policy, "script-src");
      const connectSrc = getDirective(policy, "connect-src");

      expect(scriptSrc).toContain("https://bt-cdn.yappy.cloud");
      expect(scriptSrc).toContain("https://bt-cdn-uat.yappycloud.com");
      expect(connectSrc).toContain("https://apipagosbg.bgeneral.cloud");
      expect(connectSrc).toContain("https://api-comecom-uat.yappycloud.com");
    }
  });

  it("only marks dashboard and admin pages as authenticated application routes", () => {
    expect(isProtectedAppRoute("/dashboard")).toBe(true);
    expect(isProtectedAppRoute("/dashboard/profile")).toBe(true);
    expect(isProtectedAppRoute("/admin")).toBe(true);
    expect(isProtectedAppRoute("/admin/orders")).toBe(true);

    expect(isProtectedAppRoute("/")).toBe(false);
    expect(isProtectedAppRoute("/login")).toBe(false);
    expect(isProtectedAppRoute("/products")).toBe(false);
    expect(isProtectedAppRoute("/api/payments/yappy/ipn")).toBe(false);
  });

  it("keeps explicit marketing pages eligible for static rendering", () => {
    for (const pathname of [
      "/",
      "/como-funciona",
      "/faq",
      "/contacto",
      "/demo",
      "/empresa",
      "/empresas",
      "/para-quien-es",
      "/legal",
      "/legal/privacidad",
    ]) {
      expect(isStaticPublicRoute(pathname), pathname).toBe(true);
      expect(requiresNonceCsp(pathname), pathname).toBe(false);
    }
  });

  it("keeps auth, checkout, emergency, dashboard and admin routes on per-request nonce CSP", () => {
    for (const pathname of [
      "/activar",
      "/activar/ABC123",
      "/comprar",
      "/e/ABC12345",
      "/forgot-password",
      "/login",
      "/registro",
      "/reset-password",
      "/dashboard",
      "/dashboard/profile",
      "/admin",
      "/admin/orders",
    ]) {
      expect(requiresNonceCsp(pathname), pathname).toBe(true);
      expect(isStaticPublicRoute(pathname), pathname).toBe(false);
    }
  });
});
