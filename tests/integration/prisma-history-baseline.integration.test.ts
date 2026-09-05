import { readFileSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { createIntegrationPrismaClient, assertIntegrationDatabaseReady } from "./integration-db";

const db = createIntegrationPrismaClient();
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
        await tx.$executeRawUnsafe(sql);
        const actual = await tx.$queryRaw<Array<{ migration_name: string; checksum: string }>>`SELECT migration_name, checksum FROM public._prisma_migrations ORDER BY migration_name`;
        const expected = readdirSync("prisma/migrations", { withFileTypes: true }).filter(entry => entry.isDirectory()).map(entry => ({ migration_name: entry.name, checksum: createHash("sha256").update(readFileSync(`prisma/migrations/${entry.name}/migration.sql`)).digest("hex") })).sort((a, b) => a.migration_name.localeCompare(b.migration_name));
        expect(actual).toEqual(expected);
        expect(actual).toHaveLength(38);
        throw rollback;
      });
    } catch (error) { if (error !== rollback) throw error; }
    await expect(db.$executeRawUnsafe(sql)).rejects.toThrow(/already exists/);
    expect(await db.$queryRaw<Array<{ count: bigint }>>`SELECT count(*) FROM public._prisma_migrations`).toEqual([{ count: 38n }]);
  });
});
