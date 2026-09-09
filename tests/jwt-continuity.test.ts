import { describe, expect, it } from "vitest";
import { decode, encode } from "next-auth/jwt";

describe("Block 2 JWT continuity", () => {
  it("decodes an existing JWT with the same secret and fails with a rotated secret", async () => {
    const stableSecret = "block2-ci-stable-secret-at-least-32-characters";
    const rotatedSecret = "block2-ci-rotated-secret-at-least-32-characters";
    const token = await encode({
      secret: stableSecret,
      token: {
        id: "user-1",
        sub: "user-1",
        role: "admin",
        accountId: null,
        sessionVersion: 9,
      },
      maxAge: 60 * 60,
    });

    const continued = await decode({ secret: stableSecret, token });
    expect(continued?.sub).toBe("user-1");
    expect(continued?.sessionVersion).toBe(9);

    await expect(decode({ secret: rotatedSecret, token })).rejects.toBeTruthy();
  });
});
