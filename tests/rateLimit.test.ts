import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("rateLimit backend policy", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");
    vi.stubEnv("VERCEL_ENV", "development");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("allows up to the limit in the isolated development store", async () => {
    const { rateLimit } = await import("@/lib/rateLimit");
    const id = "test-ip";
    const namespace = "unittest";

    for (let i = 1; i <= 3; i += 1) {
      await expect(
        rateLimit(namespace, id, { limit: 3, windowMs: 60_000 })
      ).resolves.toMatchObject({ allowed: true, backend: "memory" });
    }

    await expect(
      rateLimit(namespace, id, { limit: 3, windowMs: 60_000 })
    ).resolves.toMatchObject({ allowed: false, backend: "memory" });
  });

  it("fails closed in production when the distributed backend is unavailable", async () => {
    vi.stubEnv("VERCEL_ENV", "production");
    const { rateLimit } = await import("@/lib/rateLimit");

    await expect(
      rateLimit("login", "test-ip", { limit: 5, windowMs: 60_000 })
    ).resolves.toMatchObject({ allowed: false, backend: "unavailable" });
  });

  it("uses explicit memory degradation only for availability-sensitive routes", async () => {
    vi.stubEnv("VERCEL_ENV", "production");
    const { rateLimit } = await import("@/lib/rateLimit");

    await expect(
      rateLimit("public-image", "test-ip", {
        limit: 5,
        windowMs: 60_000,
        productionFailureMode: "memory",
      })
    ).resolves.toMatchObject({ allowed: true, backend: "memory" });
  });
});
