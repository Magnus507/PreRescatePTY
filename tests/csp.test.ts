import { describe, expect, it } from "vitest";
import {
  buildContentSecurityPolicy,
  isProtectedAppRoute,
} from "@/lib/security/csp";

function getDirective(policy: string, name: string) {
  return policy
    .split(";")
    .map((directive) => directive.trim())
    .find((directive) => directive.startsWith(`${name} `));
}

describe("Content Security Policy", () => {
  it("uses a nonce and strict-dynamic without unsafe script execution in production", () => {
    const policy = buildContentSecurityPolicy("test-nonce", false);
    const scriptSrc = getDirective(policy, "script-src");

    expect(scriptSrc).toContain("'nonce-test-nonce'");
    expect(scriptSrc).toContain("'strict-dynamic'");
    expect(scriptSrc).not.toContain("'unsafe-inline'");
    expect(scriptSrc).not.toContain("'unsafe-eval'");
  });

  it("keeps unsafe-eval limited to development", () => {
    const policy = buildContentSecurityPolicy("dev-nonce", true);
    const scriptSrc = getDirective(policy, "script-src");

    expect(scriptSrc).toContain("'unsafe-eval'");
    expect(scriptSrc).not.toContain("'unsafe-inline'");
  });

  it("preserves the required Yappy script and API origins", () => {
    const policy = buildContentSecurityPolicy("payment-nonce", false);
    const scriptSrc = getDirective(policy, "script-src");
    const connectSrc = getDirective(policy, "connect-src");

    expect(scriptSrc).toContain("https://bt-cdn.yappy.cloud");
    expect(scriptSrc).toContain("https://bt-cdn-uat.yappycloud.com");
    expect(connectSrc).toContain("https://apipagosbg.bgeneral.cloud");
    expect(connectSrc).toContain("https://api-comecom-uat.yappycloud.com");
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
});
