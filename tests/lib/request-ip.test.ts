import { afterEach, describe, expect, it } from "vitest";
import { getClientIp } from "@/lib/request-ip";

const originalVercel = process.env.VERCEL;

afterEach(() => {
  if (originalVercel === undefined) delete process.env.VERCEL;
  else process.env.VERCEL = originalVercel;
});

describe("getClientIp", () => {
  it("prefers the Vercel-controlled forwarding header", () => {
    process.env.VERCEL = "1";
    const request = new Request("https://example.test", {
      headers: {
        "x-vercel-forwarded-for": "203.0.113.10",
        "x-forwarded-for": "198.51.100.9",
      },
    });

    expect(getClientIp(request, "test")).toBe("203.0.113.10");
  });

  it("ignores spoofable forwarding headers outside the trusted platform", () => {
    delete process.env.VERCEL;
    const request = new Request("https://example.test", {
      headers: { "x-forwarded-for": "203.0.113.10" },
    });

    expect(getClientIp(request, "auth-login")).toBe("missing-ip:auth-login");
  });

  it("rejects malformed values supplied in a forwarding chain", () => {
    process.env.VERCEL = "1";
    const request = new Request("https://example.test", {
      headers: { "x-vercel-forwarded-for": "spoofed, 2001:db8::1" },
    });

    expect(getClientIp(request, "test")).toBe("2001:db8::1");
  });
});
