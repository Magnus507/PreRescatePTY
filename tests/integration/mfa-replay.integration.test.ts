import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  assertIntegrationDatabaseReady,
  createIntegrationPrismaClient,
  prepareIntegrationEnvironment,
} from "./integration-db";
import {
  consumeMfaRecoveryCode,
  consumeVerifiedMfaTotp,
  generateMfaRecoveryCodes,
  replaceMfaRecoveryCodes,
} from "@/domains/users/services/mfa.service";

const db = createIntegrationPrismaClient();
const run = `block2-mfa-${Date.now()}-${Math.random().toString(36).slice(2)}`;
const totpUser = `${run}-totp`;
const recoveryUser = `${run}-recovery`;

describe("real PostgreSQL MFA replay serialization", () => {
  beforeAll(async () => {
    prepareIntegrationEnvironment();
    await assertIntegrationDatabaseReady(db);
  });

  afterAll(async () => {
    await db.systemConfig.deleteMany({
      where: {
        key: {
          in: [
            `security:mfa:totp:${totpUser}`,
            `security:mfa:recovery:${recoveryUser}`,
          ],
        },
      },
    });
    await db.$disconnect();
  });

  it("allows exactly one concurrent consumer for the same TOTP", async () => {
    const acceptedAt = new Date("2026-09-09T15:30:00.000Z");
    const results = await Promise.all([
      db.$transaction((tx) => consumeVerifiedMfaTotp(tx, totpUser, "123456", acceptedAt)),
      db.$transaction((tx) => consumeVerifiedMfaTotp(tx, totpUser, "123456", acceptedAt)),
    ]);
    expect(results.sort()).toEqual([false, true]);

    const replay = await db.$transaction((tx) =>
      consumeVerifiedMfaTotp(tx, totpUser, "123456", new Date(acceptedAt.getTime() + 30_000))
    );
    expect(replay).toBe(false);
  });

  it("allows exactly one concurrent consumer for the same recovery code", async () => {
    const [code] = generateMfaRecoveryCodes(1);
    await db.$transaction((tx) => replaceMfaRecoveryCodes(tx, recoveryUser, [code]));

    const results = await Promise.all([
      db.$transaction((tx) => consumeMfaRecoveryCode(tx, recoveryUser, code)),
      db.$transaction((tx) => consumeMfaRecoveryCode(tx, recoveryUser, code)),
    ]);
    expect(results.sort()).toEqual([false, true]);
  });
});
