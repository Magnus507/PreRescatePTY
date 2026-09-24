import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  assertIntegrationDatabaseReady,
  createIntegrationPrismaClient,
  prepareIntegrationEnvironment,
} from "./integration-db";

const db = createIntegrationPrismaClient();
const run = `drops-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

describe("Pre-Rescate Drops PostgreSQL invariants", () => {
  beforeAll(async () => {
    prepareIntegrationEnvironment();
    await assertIntegrationDatabaseReady(db);
  });

  afterAll(async () => {
    await db.$disconnect();
  });

  it("rejects invalid non-positive Drop targets at the database boundary", async () => {
    await expect(
      db.drop.create({
        data: {
          slug: `${run}-invalid-target`,
          title: "Invalid target",
          prizeLabel: "$1",
          targetPasses: 0,
        },
      })
    ).rejects.toThrow();

    expect(
      await db.drop.count({ where: { slug: `${run}-invalid-target` } })
    ).toBe(0);
  });

  it("rolls back any attempt to mutate a persisted draw result", async () => {
    const slug = `${run}-update-immutable`;

    await expect(
      db.$transaction(async (tx) => {
        const drop = await tx.drop.create({
          data: {
            slug,
            title: "Immutable update",
            prizeLabel: "$400",
            targetPasses: 1,
            status: "closed",
          },
        });

        const draw = await tx.dropDraw.create({
          data: {
            dropId: drop.id,
            entryCount: 1,
            purchaseEntryCount: 1,
            bonusEntryCount: 0,
            manifestHash: "a".repeat(64),
            randomHex: "b".repeat(64),
            winnerIndex: 0,
            winnerEntryKind: "purchase",
            winnerEntryId: `${run}-entry`,
            winnerEntryCode: `DP-${run}`,
            winnerUserId: `${run}-user`,
            drawnByUserId: `${run}-admin`,
          },
        });

        await tx.dropDraw.update({
          where: { id: draw.id },
          data: { winnerEntryCode: "DP-TAMPERED" },
        });
      })
    ).rejects.toThrow(/immutable once created/i);

    expect(await db.drop.count({ where: { slug } })).toBe(0);
  });

  it("rolls back any attempt to delete a persisted draw result", async () => {
    const slug = `${run}-delete-immutable`;

    await expect(
      db.$transaction(async (tx) => {
        const drop = await tx.drop.create({
          data: {
            slug,
            title: "Immutable delete",
            prizeLabel: "$400",
            targetPasses: 1,
            status: "closed",
          },
        });

        const draw = await tx.dropDraw.create({
          data: {
            dropId: drop.id,
            entryCount: 1,
            purchaseEntryCount: 1,
            bonusEntryCount: 0,
            manifestHash: "c".repeat(64),
            randomHex: "d".repeat(64),
            winnerIndex: 0,
            winnerEntryKind: "purchase",
            winnerEntryId: `${run}-entry-delete`,
            winnerEntryCode: `DP-${run}-DELETE`,
            winnerUserId: `${run}-user-delete`,
            drawnByUserId: `${run}-admin-delete`,
          },
        });

        await tx.dropDraw.delete({ where: { id: draw.id } });
      })
    ).rejects.toThrow(/immutable once created/i);

    expect(await db.drop.count({ where: { slug } })).toBe(0);
  });

  it("rejects inconsistent Bonus Credit claim state", async () => {
    const slug = `${run}-bonus-credit-state`;
    await expect(
      db.$transaction(async (tx) => {
        const drop = await tx.drop.create({
          data: {
            slug,
            title: "Bonus Credit state",
            prizeLabel: "$400",
            targetPasses: 1,
          },
        });

        await tx.dropBonusCredit.create({
          data: {
            code: `BC-STATE-${run}`,
            dropId: drop.id,
            campaign: "State test",
            createdByUserId: `${run}-admin`,
            claimedAt: new Date(),
          },
        });
      })
    ).rejects.toThrow();

    expect(await db.drop.count({ where: { slug } })).toBe(0);
  });

  it("rejects inconsistent special Drop Pass grant-code claim state", async () => {
    await expect(
      db.dropPassGrantCode.create({
        data: {
          code: `DPG-STATE-${run}`,
          campaign: "Support state test",
          createdByUserId: `${run}-admin`,
          claimedAt: new Date(),
        },
      })
    ).rejects.toThrow();

    expect(
      await db.dropPassGrantCode.count({
        where: { code: `DPG-STATE-${run}` },
      })
    ).toBe(0);
  });

  it("enforces one Bonus Credit to one Bonus Entry", async () => {
    const slug = `${run}-bonus-credit-once`;

    await expect(
      db.$transaction(async (tx) => {
        const drop = await tx.drop.create({
          data: {
            slug,
            title: "One credit one entry",
            prizeLabel: "$400",
            targetPasses: 1,
            status: "active",
          },
        });

        const credit = await tx.dropBonusCredit.create({
          data: {
            code: `BC-ONCE-${run}`,
            dropId: drop.id,
            campaign: "Once",
            createdByUserId: `${run}-admin`,
          },
        });

        await tx.dropBonusEntry.create({
          data: {
            code: `BE-ONCE-A-${run}`,
            dropId: drop.id,
            userId: `${run}-user-a`,
            reason: "Bonus Credit · Once",
            createdByUserId: `${run}-admin`,
            sourceBonusCreditId: credit.id,
          },
        });

        await tx.dropBonusEntry.create({
          data: {
            code: `BE-ONCE-B-${run}`,
            dropId: drop.id,
            userId: `${run}-user-b`,
            reason: "Bonus Credit · Once",
            createdByUserId: `${run}-admin`,
            sourceBonusCreditId: credit.id,
          },
        });
      })
    ).rejects.toThrow();

    expect(await db.drop.count({ where: { slug } })).toBe(0);
  });

  it("denies direct anon access to every Drops table", async () => {
    for (const table of [
      "Drop",
      "DropPass",
      "DropBonusCredit",
      "DropBonusEntry",
      "DropDraw",
      "DropPassGrantCode",
    ]) {
      await expect(
        db.$transaction(async (tx) => {
          await tx.$executeRawUnsafe("SET LOCAL ROLE anon");
          await tx.$queryRawUnsafe(`SELECT * FROM public."${table}" LIMIT 1`);
        })
      ).rejects.toThrow(/permission denied|row-level security/i);
    }
  });
});
