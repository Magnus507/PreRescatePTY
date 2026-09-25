import { randomBytes } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  communityProgressPercent,
  type CommunityMetricType,
  type RewardMissionKind,
} from "@/lib/rewards/rules";

type DbClient = Prisma.TransactionClient | typeof prisma;

function makeBonusEntryCode() {
  return `BE-${randomBytes(8).toString("hex").toUpperCase()}`;
}

function missionIsInWindow(mission: {
  startsAt: Date | null;
  endsAt: Date | null;
}) {
  const now = Date.now();
  if (mission.startsAt && mission.startsAt.getTime() > now) return false;
  if (mission.endsAt && mission.endsAt.getTime() <= now) return false;
  return true;
}

export async function getMissionEligibility(
  db: DbClient,
  userId: string,
  kind: RewardMissionKind
) {
  if (kind === "profile_complete") {
    const profile = await db.profile.findUnique({
      where: { userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        bloodType: true,
      },
    });
    if (
      !profile ||
      !profile.firstName.trim() ||
      !profile.lastName.trim() ||
      !profile.bloodType.trim()
    ) {
      return false;
    }

    const activeContacts = await db.profileContact.count({
      where: { profileId: profile.id, active: true },
    });
    return activeContacts > 0;
  }

  if (kind === "first_device_activated") {
    const count = await db.chip.count({
      where: {
        ownerUserId: userId,
        activatedAt: { not: null },
      },
    });
    return count > 0;
  }

  if (kind === "first_paid_order") {
    const count = await db.order.count({
      where: {
        userId,
        paymentStatus: "paid",
        orderStatus: { not: "cancelled" },
      },
    });
    return count > 0;
  }

  return false;
}

export async function getRewardCreditBalance(
  userId: string,
  db: DbClient = prisma
) {
  const result = await db.rewardCreditLedger.aggregate({
    where: { userId },
    _sum: { amount: true },
  });
  return result._sum.amount ?? 0;
}

export async function claimMission(userId: string, missionId: string) {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`
      SELECT pg_advisory_xact_lock(hashtext(${`reward-mission:${userId}:${missionId}`}))
    `;

    const mission = await tx.rewardMission.findUnique({
      where: { id: missionId },
    });
    if (!mission) throw new Error("MISSION_NOT_FOUND");
    if (mission.status !== "active" || !missionIsInWindow(mission)) {
      throw new Error("MISSION_NOT_ACTIVE");
    }

    const existing = await tx.rewardMissionCompletion.findUnique({
      where: {
        missionId_userId: { missionId, userId },
      },
      select: { id: true },
    });
    if (existing) throw new Error("MISSION_ALREADY_COMPLETED");

    const eligible = await getMissionEligibility(
      tx,
      userId,
      mission.kind as RewardMissionKind
    );
    if (!eligible) throw new Error("MISSION_NOT_ELIGIBLE");

    const completion = await tx.rewardMissionCompletion.create({
      data: { missionId, userId },
      select: { id: true, completedAt: true },
    });

    await tx.rewardCreditLedger.create({
      data: {
        userId,
        amount: mission.rewardCredits,
        sourceKey: `mission:${completion.id}`,
        sourceType: "mission",
        sourceId: mission.id,
        description: `Misión completada · ${mission.title}`,
        createdByUserId: userId,
      },
    });

    const balance = await getRewardCreditBalance(userId, tx);
    return {
      completion,
      mission: {
        id: mission.id,
        title: mission.title,
        rewardCredits: mission.rewardCredits,
      },
      balance,
    };
  });
}

export async function spendRewardCredit(
  userId: string,
  dropId: string,
  actorUserId: string = userId,
  reason = "Reward Credit · Misiones",
  transaction?: Prisma.TransactionClient
) {
  const execute = async (tx: Prisma.TransactionClient) => {
    await tx.$executeRaw`
      SELECT pg_advisory_xact_lock(hashtext(${`reward-credit:${userId}`}))
    `;

    const rows = await tx.$queryRaw<
      Array<{ id: string; status: string; title: string }>
    >`
      SELECT "id", "status"::text AS "status", "title", "archivedAt"
      FROM "Drop"
      WHERE "id" = ${dropId}
      FOR UPDATE
    `;
    const drop = rows[0] as
      | { id: string; status: string; title: string; archivedAt: Date | null }
      | undefined;
    if (!drop) throw new Error("DROP_NOT_FOUND");
    if (drop.status !== "active" || drop.archivedAt) throw new Error("DROP_NOT_OPEN");

    const balance = await getRewardCreditBalance(userId, tx);
    if (balance < 1) throw new Error("REWARD_CREDIT_INSUFFICIENT");

    const entry = await tx.dropBonusEntry.create({
      data: {
        code: makeBonusEntryCode(),
        dropId,
        userId,
        reason,
        createdByUserId: actorUserId,
      },
      select: {
        id: true,
        code: true,
        reason: true,
        createdAt: true,
      },
    });

    await tx.rewardCreditLedger.create({
      data: {
        userId,
        amount: -1,
        sourceKey: `spend:${entry.id}`,
        sourceType: "spend",
        sourceId: drop.id,
        description: `Bonus Entry para ${drop.title} · ${reason}`,
        createdByUserId: actorUserId,
        dropBonusEntryId: entry.id,
      },
    });

    return {
      entry,
      drop: { id: drop.id, title: drop.title },
      balance: balance - 1,
    };
  };

  return transaction ? execute(transaction) : prisma.$transaction(execute);
}

export async function getCommunityMetricValue(
  metricType: CommunityMetricType,
  db: DbClient = prisma
) {
  if (metricType === "activated_units") {
    return db.chip.count({ where: { activatedAt: { not: null } } });
  }

  const members = await db.chip.findMany({
    where: {
      activatedAt: { not: null },
      ownerUserId: { not: null },
    },
    distinct: ["ownerUserId"],
    select: { ownerUserId: true },
  });
  return members.length;
}

export async function refreshCommunityUnlocks() {
  const unlocks = await prisma.communityUnlock.findMany({
    where: { status: "active" },
    select: {
      id: true,
      metricType: true,
      target: true,
      unlockType: true,
      linkedDropId: true,
      startsAt: true,
      endsAt: true,
    },
  });

  const now = new Date();
  for (const unlock of unlocks) {
    if (unlock.startsAt && unlock.startsAt > now) continue;
    if (unlock.endsAt && unlock.endsAt <= now) continue;

    const current = await getCommunityMetricValue(
      unlock.metricType as CommunityMetricType
    );
    if (current < unlock.target) continue;

    await prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<Array<{ id: string; status: string }>>`
        SELECT "id", "status"
        FROM "CommunityUnlock"
        WHERE "id" = ${unlock.id}
        FOR UPDATE
      `;
      if (!rows[0] || rows[0].status !== "active") return;

      await tx.communityUnlock.update({
        where: { id: unlock.id },
        data: { status: "unlocked", unlockedAt: now },
      });

      if (unlock.unlockType === "community_drop" && unlock.linkedDropId) {
        const dropRows = await tx.$queryRaw<
          Array<{ id: string; status: string; opensAt: Date | null }>
        >`
          SELECT "id", "status"::text AS "status", "opensAt"
          FROM "Drop"
          WHERE "id" = ${unlock.linkedDropId}
          FOR UPDATE
        `;
        const drop = dropRows[0];
        if (drop?.status === "draft") {
          await tx.drop.update({
            where: { id: drop.id },
            data: { status: "active", opensAt: drop.opensAt ?? now },
          });
        }
      }
    });
  }
}

export async function getRewardsSnapshot(userId: string) {
  await refreshCommunityUnlocks();

  const now = new Date();
  const [missions, completions, founder, ledger, unlocks, activeDrops, balance] =
    await Promise.all([
      prisma.rewardMission.findMany({
        where: {
          status: "active",
          AND: [
            { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
            { OR: [{ endsAt: null }, { endsAt: { gt: now } }] },
          ],
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.rewardMissionCompletion.findMany({
        where: { userId },
        select: { missionId: true, completedAt: true },
      }),
      prisma.foundingMember.findUnique({
        where: { userId },
        select: {
          founderNumber: true,
          visible: true,
          grantedAt: true,
        },
      }),
      prisma.rewardCreditLedger.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 30,
        select: {
          id: true,
          amount: true,
          sourceType: true,
          description: true,
          createdAt: true,
        },
      }),
      prisma.communityUnlock.findMany({
        where: { status: { in: ["active", "unlocked"] } },
        orderBy: { createdAt: "desc" },
      }),
      prisma.drop.findMany({
        where: { status: "active", archivedAt: null },
        orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
        select: { id: true, title: true, prizeLabel: true },
      }),
      getRewardCreditBalance(userId),
    ]);

  const completedMap = new Map(
    completions.map((row) => [row.missionId, row.completedAt])
  );

  const missionRows = [];
  for (const mission of missions) {
    const completedAt = completedMap.get(mission.id) ?? null;
    const eligible = completedAt
      ? true
      : await getMissionEligibility(
          prisma,
          userId,
          mission.kind as RewardMissionKind
        );
    missionRows.push({
      id: mission.id,
      slug: mission.slug,
      title: mission.title,
      description: mission.description,
      imageUrl: mission.imageUrl,
      kind: mission.kind,
      rewardCredits: mission.rewardCredits,
      completedAt,
      eligible,
    });
  }

  const communityRows = [];
  for (const unlock of unlocks) {
    const current = await getCommunityMetricValue(
      unlock.metricType as CommunityMetricType
    );
    communityRows.push({
      id: unlock.id,
      slug: unlock.slug,
      title: unlock.title,
      description: unlock.description,
      metricType: unlock.metricType,
      target: unlock.target,
      current,
      progressPercent: communityProgressPercent(current, unlock.target),
      unlockType: unlock.unlockType,
      rewardTitle: unlock.rewardTitle,
      rewardDescription: unlock.rewardDescription,
      status: unlock.status,
      unlockedAt: unlock.unlockedAt,
    });
  }

  return {
    balance,
    founder: founder?.visible ? founder : null,
    missions: missionRows,
    ledger,
    community: communityRows,
    activeDrops,
  };
}
