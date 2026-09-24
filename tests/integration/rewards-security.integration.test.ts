import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  assertIntegrationDatabaseReady,
  createIntegrationPrismaClient,
  prepareIntegrationEnvironment,
} from "./integration-db";

const db = createIntegrationPrismaClient();
const run = `rewards-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

describe("Pre-Rescate Rewards PostgreSQL invariants", () => {
  beforeAll(async () => {
    prepareIntegrationEnvironment();
    await assertIntegrationDatabaseReady(db);
  });

  afterAll(async () => {
    await db.$disconnect();
  });

  it("allows only one completion of the same mission per user", async () => {
    const slug = `${run}-mission-once`;

    await expect(
      db.$transaction(async (tx) => {
        const mission = await tx.rewardMission.create({
          data: {
            slug,
            title: "Mission once",
            kind: "profile_complete",
            rewardCredits: 1,
            createdByUserId: `${run}-admin`,
          },
        });

        await tx.rewardMissionCompletion.create({
          data: {
            missionId: mission.id,
            userId: `${run}-user`,
          },
        });

        await tx.rewardMissionCompletion.create({
          data: {
            missionId: mission.id,
            userId: `${run}-user`,
          },
        });
      })
    ).rejects.toThrow();

    expect(await db.rewardMission.count({ where: { slug } })).toBe(0);
  });

  it("rejects zero-value Reward ledger movements", async () => {
    await expect(
      db.rewardCreditLedger.create({
        data: {
          userId: `${run}-ledger-user`,
          amount: 0,
          sourceKey: `${run}-zero`,
          sourceType: "mission",
          description: "Invalid zero movement",
        },
      })
    ).rejects.toThrow();
  });

  it("keeps Founding Member identity immutable once assigned", async () => {
    await expect(
      db.$transaction(async (tx) => {
        const founder = await tx.foundingMember.create({
          data: {
            userId: `${run}-founder-user`,
            grantedByUserId: `${run}-admin`,
          },
        });

        await tx.foundingMember.update({
          where: { id: founder.id },
          data: { founderNumber: founder.founderNumber + 1000 },
        });
      })
    ).rejects.toThrow(/immutable once assigned/i);
  });

  it("allows changing Founding Member visibility without changing identity", async () => {
    const userId = `${run}-founder-visible`;
    const founder = await db.foundingMember.create({
      data: {
        userId,
        grantedByUserId: `${run}-admin-visible`,
      },
    });

    const updated = await db.foundingMember.update({
      where: { id: founder.id },
      data: { visible: false },
    });

    expect(updated.userId).toBe(userId);
    expect(updated.founderNumber).toBe(founder.founderNumber);
    expect(updated.visible).toBe(false);

    await expect(
      db.foundingMember.delete({ where: { id: founder.id } })
    ).rejects.toThrow(/permanent once assigned/i);
  });

  it("requires a linked Drop for Community Drop unlocks", async () => {
    await expect(
      db.communityUnlock.create({
        data: {
          slug: `${run}-community-without-drop`,
          title: "Community Drop invalid",
          metricType: "activated_units",
          target: 100,
          unlockType: "community_drop",
          rewardTitle: "Special Drop",
          createdByUserId: `${run}-admin`,
        },
      })
    ).rejects.toThrow();
  });

  it("rejects non-positive Community Unlock targets", async () => {
    await expect(
      db.communityUnlock.create({
        data: {
          slug: `${run}-community-zero`,
          title: "Invalid target",
          metricType: "activated_units",
          target: 0,
          unlockType: "event",
          rewardTitle: "Community event",
          createdByUserId: `${run}-admin`,
        },
      })
    ).rejects.toThrow();
  });

  it("denies direct anon access to every Rewards table", async () => {
    for (const table of [
      "RewardMission",
      "RewardMissionCompletion",
      "RewardCreditLedger",
      "FoundingMember",
      "CommunityUnlock",
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
