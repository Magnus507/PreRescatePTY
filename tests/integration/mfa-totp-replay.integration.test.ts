import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  assertIntegrationDatabaseReady,
  createIntegrationPrismaClient,
  prepareIntegrationEnvironment,
} from "./integration-db";
import { consumeVerifiedMfaTotp } from "@/domains/users/services/mfa.service";

const db = createIntegrationPrismaClient();
const run = `mfa-replay-${Date.now()}-${Math.random().toString(36).slice(2)}`;

describe("real PostgreSQL MFA TOTP replay serialization", () => {
  beforeAll(async () => {
    prepareIntegrationEnvironment();
    await assertIntegrationDatabaseReady(db);
  });

  afterAll(async () => {
    await db.systemConfig.deleteMany({ where: { key: `security:mfa:totp:${run}` } });
    await db.$disconnect();
  });

  it("allows exactly one concurrent consumer for the same already-verified TOTP", async () => {
    const acceptedAt = new Date("2026-09-08T20:30:00.000Z");

    const results = await Promise.all([
      db.$transaction((tx) => consumeVerifiedMfaTotp(tx, run, "123456", acceptedAt)),
      db.$transaction((tx) => consumeVerifiedMfaTotp(tx, run, "123456", acceptedAt)),
    ]);

    expect(results.sort()).toEqual([false, true]);

    const replay = await db.$transaction((tx) =>
      consumeVerifiedMfaTotp(tx, run, "123456", new Date(acceptedAt.getTime() + 30_000))
    );
    expect(replay).toBe(false);

    const nextToken = await db.$transaction((tx) =>
      consumeVerifiedMfaTotp(tx, run, "654321", new Date(acceptedAt.getTime() + 30_000))
    );
    expect(nextToken).toBe(true);

    const stored = await db.systemConfig.findUniqueOrThrow({
      where: { key: `security:mfa:totp:${run}` },
    });
    expect(stored.value).not.toContain("123456");
    expect(stored.value).not.toContain("654321");
  });
});
