import { readFileSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { createIntegrationPrismaClient, assertIntegrationDatabaseReady } from "./integration-db";

const db = createIntegrationPrismaClient();
const VERIFIED_BASELINE_LAST_MIGRATION = "20260904170000_harden_storage_cleanup_outbox";
const POST_BASELINE_SCHEMA = [
  // Rewards and Drops were introduced after the verified 2026-09-05 baseline.
  // Remove only their disposable CI objects in dependency order so the
  // historical fingerprint is reconstructed exactly; the enclosing
  // transaction rolls everything back afterward.
  'DROP TABLE IF EXISTS public."CommunityUnlock"',
  'DROP TABLE IF EXISTS public."RewardCreditLedger"',
  'DROP TABLE IF EXISTS public."RewardMissionCompletion"',
  'DROP TABLE IF EXISTS public."RewardMission"',
  'DROP TABLE IF EXISTS public."FoundingMember"',
  'DROP TABLE IF EXISTS public."DropDraw"',
  'DROP TABLE IF EXISTS public."DropBonusEntry"',
  'DROP TABLE IF EXISTS public."DropBonusCredit"',
  'DROP TABLE IF EXISTS public."DropPass"',
  'DROP TABLE IF EXISTS public."Drop"',
  'DROP TYPE IF EXISTS public."DropPassStatus"',
  'DROP TYPE IF EXISTS public."DropStatus"',
  'DROP INDEX IF EXISTS public."Chip_assignedProfileId_idx"',
  'DROP INDEX IF EXISTS public."ChipClaimToken_chipId_idx"',
  'DROP INDEX IF EXISTS public."ChipClaimToken_orderId_idx"',
  'DROP INDEX IF EXISTS public."ChipClaimToken_one_open_active_per_chip"',
  'ALTER TABLE public."Chip" DROP CONSTRAINT IF EXISTS "Chip_activated_identity_check"',
  'ALTER TABLE public."OperationFinishedGoodUnit" DROP CONSTRAINT IF EXISTS "OperationFinishedGoodUnit_activation_check"',
  'ALTER TABLE public."ChipClaimToken" ALTER COLUMN "activationCodeHash" DROP NOT NULL, ALTER COLUMN "activationCodeLast4" DROP NOT NULL',
];

async function restoreVerifiedBaselineShape(tx: { $executeRawUnsafe(query: string): Promise<unknown> }) {
  for (const statement of POST_BASELINE_SCHEMA) {
    await tx.$executeRawUnsafe(statement);
  }
}

describe("Verified migration history reconciliation", () => {
  afterAll(async () => db.$disconnect());
  it("reconstructs exact checksums without replaying DDL; refuses an existing history", async () => {
    await assertIntegrationDatabaseReady(db);
    const sql = readFileSync("prisma/baselines/20260905_verified_history.sql", "utf8");
    const rollback = new Error("rollback isolated baseline fixture");
    try {
      await db.$transaction(async tx => {
        // Move only disposable CI bookkeeping, preserve it through rollback.
        await tx.$executeRawUnsafe('ALTER TABLE public._prisma_migrations SET SCHEMA storage');

        // The verified 2026-09-05 baseline intentionally predates later schema
        // additions. Recreate that historical shape inside this rollback-only
        // transaction before checking the baseline fingerprint.
        await tx.$executeRawUnsafe('DROP TABLE IF EXISTS public."SupportMessage"');
        await tx.$executeRawUnsafe(`
          ALTER TABLE public."Profile"
            DROP COLUMN IF EXISTS "minorModuleEnabled",
            DROP COLUMN IF EXISTS "minorModuleData",
            DROP COLUMN IF EXISTS "elderModuleEnabled",
            DROP COLUMN IF EXISTS "elderModuleData",
            DROP COLUMN IF EXISTS "specialNeedsModuleEnabled",
            DROP COLUMN IF EXISTS "specialNeedsModuleData",
            DROP COLUMN IF EXISTS "petModuleEnabled",
            DROP COLUMN IF EXISTS "petModuleData",
            DROP COLUMN IF EXISTS "workModuleEnabled",
            DROP COLUMN IF EXISTS "workModuleData",
            DROP COLUMN IF EXISTS "safeReturnModuleEnabled",
            DROP COLUMN IF EXISTS "safeReturnModuleData"
        `);
        await restoreVerifiedBaselineShape(tx);

        await tx.$executeRawUnsafe(sql);
        const actual = await tx.$queryRaw<Array<{ migration_name: string; checksum: string }>>`SELECT migration_name, checksum FROM public._prisma_migrations ORDER BY migration_name`;
        const expected = readdirSync("prisma/migrations", { withFileTypes: true })
          .filter(entry => entry.isDirectory() && entry.name <= VERIFIED_BASELINE_LAST_MIGRATION)
          .map(entry => ({
            migration_name: entry.name,
            checksum: createHash("sha256")
              .update(readFileSync(`prisma/migrations/${entry.name}/migration.sql`))
              .digest("hex"),
          }))
          .sort((a, b) => a.migration_name.localeCompare(b.migration_name));
        expect(actual).toEqual(expected);
        expect(actual).toHaveLength(38);
        throw rollback;
      });
    } catch (error) { if (error !== rollback) throw error; }
    await expect(
      db.$transaction(async tx => {
        await tx.$executeRawUnsafe('DROP TABLE IF EXISTS public."SupportMessage"');
        await tx.$executeRawUnsafe(`
          ALTER TABLE public."Profile"
            DROP COLUMN IF EXISTS "minorModuleEnabled",
            DROP COLUMN IF EXISTS "minorModuleData",
            DROP COLUMN IF EXISTS "elderModuleEnabled",
            DROP COLUMN IF EXISTS "elderModuleData",
            DROP COLUMN IF EXISTS "specialNeedsModuleEnabled",
            DROP COLUMN IF EXISTS "specialNeedsModuleData",
            DROP COLUMN IF EXISTS "petModuleEnabled",
            DROP COLUMN IF EXISTS "petModuleData",
            DROP COLUMN IF EXISTS "workModuleEnabled",
            DROP COLUMN IF EXISTS "workModuleData",
            DROP COLUMN IF EXISTS "safeReturnModuleEnabled",
            DROP COLUMN IF EXISTS "safeReturnModuleData"
        `);
        await restoreVerifiedBaselineShape(tx);
        await tx.$executeRawUnsafe(sql);
      })
    ).rejects.toThrow(/already exists/);
    // The rollback restores the current CI migration history, including Block 3.
    const migrationCount = readdirSync("prisma/migrations", { withFileTypes: true }).filter(entry => entry.isDirectory()).length;
    expect(await db.$queryRaw<Array<{ count: bigint }>>`SELECT count(*) FROM public._prisma_migrations`).toEqual([{ count: BigInt(migrationCount) }]);
  });
});
