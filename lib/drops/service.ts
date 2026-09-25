import { createHash, randomBytes } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { calculateEarnedDropPasses, pickWinnerIndex } from "@/lib/drops/rules";

type DropDb = Prisma.TransactionClient | typeof prisma;


function makePurchasePassCode(sourceOrderId: string, sourceOrdinal: number) {
  const digest = createHash("sha256")
    .update(`${sourceOrderId}:${sourceOrdinal}`)
    .digest("hex")
    .slice(0, 16)
    .toUpperCase();
  return `DP-${digest}`;
}

export async function ensurePurchaseDropPassesForOrder(
  db: DropDb,
  input: {
    orderId: string;
    userId: string | null | undefined;
    amount: unknown;
    confirmedAt: Date;
  }
) {
  if (!input.userId) return { expected: 0, created: 0 };

  const firstLaunch = await db.drop.findFirst({
    where: { opensAt: { not: null } },
    orderBy: { opensAt: "asc" },
    select: { opensAt: true },
  });
  if (!firstLaunch?.opensAt || input.confirmedAt < firstLaunch.opensAt) {
    return { expected: 0, created: 0 };
  }

  const expected = calculateEarnedDropPasses(input.amount);
  if (expected <= 0) return { expected: 0, created: 0 };

  const existing = await db.dropPass.findMany({
    where: { sourceOrderId: input.orderId },
    select: { sourceOrdinal: true },
  });
  const ordinals = new Set(existing.map((row) => row.sourceOrdinal));
  const missing = Array.from({ length: expected }, (_, index) => index + 1).filter(
    (ordinal) => !ordinals.has(ordinal)
  );
  if (missing.length === 0) return { expected, created: 0 };

  const result = await db.dropPass.createMany({
    data: missing.map((sourceOrdinal) => ({
      code: makePurchasePassCode(input.orderId, sourceOrdinal),
      userId: input.userId!,
      sourceOrderId: input.orderId,
      sourceOrdinal,
      earnedAt: input.confirmedAt,
    })),
    skipDuplicates: true,
  });

  return { expected, created: result.count };
}

export async function syncPurchaseDropPasses(userId: string) {
  const firstLaunch = await prisma.drop.findFirst({
    where: { opensAt: { not: null } },
    orderBy: { opensAt: "asc" },
    select: { opensAt: true },
  });

  if (!firstLaunch?.opensAt) return { created: 0 };

  const orders = await prisma.order.findMany({
    where: {
      userId,
      paymentStatus: "paid",
      orderStatus: { not: "cancelled" },
      OR: [
        {
          provider: "yappy",
          paymentAttempts: {
            some: {
              status: "succeeded",
              confirmedAt: { gte: firstLaunch.opensAt },
            },
          },
        },
        {
          adminReviewStatus: "approved",
          adminReviewedAt: { gte: firstLaunch.opensAt },
        },
      ],
    },
    select: {
      id: true,
      amount: true,
      createdAt: true,
      adminReviewedAt: true,
      paymentAttempts: {
        where: {
          status: "succeeded",
          confirmedAt: { gte: firstLaunch.opensAt },
        },
        orderBy: { confirmedAt: "asc" },
        take: 1,
        select: { confirmedAt: true },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  let created = 0;

  for (const order of orders) {
    const confirmedAt =
      order.adminReviewedAt ??
      order.paymentAttempts[0]?.confirmedAt ??
      order.createdAt;
    const result = await ensurePurchaseDropPassesForOrder(prisma, {
      orderId: order.id,
      userId,
      amount: order.amount,
      confirmedAt,
    });
    created += result.created;
  }

  return { created };
}

export async function getUserDropsSnapshot(userId: string) {
  await syncPurchaseDropPasses(userId);

  const [drops, passes, bonusEntries, rewardBalance] = await Promise.all([
    prisma.drop.findMany({
      where: {
        archivedAt: null,
        status: { in: ["active", "goal_reached", "closed", "drawn", "finalized"] },
      },
      orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        slug: true,
        title: true,
        description: true,
        prizeLabel: true,
        imageUrl: true,
        targetPasses: true,
        displayOrder: true,
        status: true,
        opensAt: true,
        goalReachedAt: true,
        closedAt: true,
        createdAt: true,
        _count: {
          select: {
            passes: { where: { status: "assigned" } },
            bonusEntries: { where: { revokedAt: null } },
          },
        },
        draw: {
          select: {
            winnerEntryCode: true,
            drawnAt: true,
          },
        },
      },
    }),
    prisma.dropPass.findMany({
      where: { userId, status: { in: ["available", "assigned"] } },
      orderBy: { earnedAt: "desc" },
      select: {
        id: true,
        code: true,
        status: true,
        earnedAt: true,
        assignedAt: true,
        drop: { select: { id: true, title: true, prizeLabel: true } },
      },
    }),
    prisma.dropBonusEntry.findMany({
      where: { userId, revokedAt: null },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        code: true,
        reason: true,
        createdAt: true,
        drop: { select: { id: true, title: true, prizeLabel: true } },
      },
    }),
    prisma.rewardCreditLedger.aggregate({
      where: { userId },
      _sum: { amount: true },
    }),
  ]);

  return {
    availablePassCount: passes.filter((pass) => pass.status === "available").length,
    bonusCreditBalance: rewardBalance._sum.amount ?? 0,
    drops: drops.map((drop) => ({
      id: drop.id,
      slug: drop.slug,
      title: drop.title,
      description: drop.description,
      prizeLabel: drop.prizeLabel,
      imageUrl: drop.imageUrl,
      targetPasses: drop.targetPasses,
      displayOrder: drop.displayOrder,
      status: drop.status,
      opensAt: drop.opensAt,
      goalReachedAt: drop.goalReachedAt,
      closedAt: drop.closedAt,
      createdAt: drop.createdAt,
      assignedPurchasePasses: drop._count.passes,
      bonusEntries: drop._count.bonusEntries,
      progressPercent: Math.min(
        100,
        Math.round((drop._count.passes / drop.targetPasses) * 100)
      ),
      draw: drop.draw,
    })),
    passes,
    bonusEntries,
  };
}

export async function assignDropPassToDrop(
  userId: string,
  passId: string,
  dropId: string,
  transaction?: Prisma.TransactionClient
) {
  const execute = async (tx: Prisma.TransactionClient) => {
    const locked = await tx.$queryRaw<
      Array<{ id: string; status: string; targetPasses: number }>
    >`
      SELECT "id", "status"::text AS "status", "targetPasses"
      FROM "Drop"
      WHERE "id" = ${dropId}
      FOR UPDATE
    `;
    const drop = locked[0];
    if (!drop) throw new Error("DROP_NOT_FOUND");
    if (drop.status !== "active") throw new Error("DROP_NOT_OPEN");

    const assignedCount = await tx.dropPass.count({
      where: { dropId, status: "assigned" },
    });

    if (assignedCount >= drop.targetPasses) {
      await tx.drop.update({
        where: { id: dropId },
        data: { status: "goal_reached", goalReachedAt: new Date() },
      });
      throw new Error("DROP_GOAL_REACHED");
    }

    const claimed = await tx.dropPass.updateMany({
      where: {
        id: passId,
        userId,
        status: "available",
        dropId: null,
      },
      data: {
        status: "assigned",
        dropId,
        assignedAt: new Date(),
      },
    });

    if (claimed.count !== 1) throw new Error("DROP_PASS_NOT_AVAILABLE");

    const nextCount = assignedCount + 1;
    if (nextCount >= drop.targetPasses) {
      await tx.drop.update({
        where: { id: dropId },
        data: { status: "goal_reached", goalReachedAt: new Date() },
      });
    }

    return {
      assignedCount: nextCount,
      goalReached: nextCount >= drop.targetPasses,
    };
  };

  return transaction ? execute(transaction) : prisma.$transaction(execute);
}

type DrawEntry = {
  kind: "purchase" | "bonus";
  id: string;
  code: string;
  userId: string;
};

export async function executeDropDraw(dropId: string, drawnByUserId: string) {
  return prisma.$transaction(async (tx) => {
    const locked = await tx.$queryRaw<
      Array<{ id: string; status: string; targetPasses: number }>
    >`
      SELECT "id", "status"::text AS "status", "targetPasses"
      FROM "Drop"
      WHERE "id" = ${dropId}
      FOR UPDATE
    `;

    const drop = locked[0];
    if (!drop) throw new Error("DROP_NOT_FOUND");
    if (drop.status !== "closed") {
      throw new Error("DROP_NOT_READY_FOR_DRAW");
    }

    const existingDraw = await tx.dropDraw.findUnique({ where: { dropId } });
    if (existingDraw) throw new Error("DROP_ALREADY_DRAWN");

    const [purchaseRows, bonusRows] = await Promise.all([
      tx.dropPass.findMany({
        where: { dropId, status: "assigned" },
        orderBy: { code: "asc" },
        select: { id: true, code: true, userId: true },
      }),
      tx.dropBonusEntry.findMany({
        where: { dropId, revokedAt: null },
        orderBy: { code: "asc" },
        select: { id: true, code: true, userId: true },
      }),
    ]);

    if (purchaseRows.length < drop.targetPasses) {
      throw new Error("DROP_GOAL_NOT_VERIFIED");
    }

    const entries: DrawEntry[] = [
      ...purchaseRows.map((entry) => ({ kind: "purchase" as const, ...entry })),
      ...bonusRows.map((entry) => ({ kind: "bonus" as const, ...entry })),
    ].sort((a, b) =>
      `${a.kind}:${a.code}`.localeCompare(`${b.kind}:${b.code}`)
    );

    const manifest = entries
      .map((entry) => `${entry.kind}|${entry.id}|${entry.code}|${entry.userId}`)
      .join("\n");
    const manifestHash = createHash("sha256").update(manifest).digest("hex");
    const randomHex = randomBytes(32).toString("hex");
    const winnerIndex = pickWinnerIndex(randomHex, entries.length);
    const winner = entries[winnerIndex];

    const draw = await tx.dropDraw.create({
      data: {
        dropId,
        entryCount: entries.length,
        purchaseEntryCount: purchaseRows.length,
        bonusEntryCount: bonusRows.length,
        manifestHash,
        randomHex,
        winnerIndex,
        winnerEntryKind: winner.kind,
        winnerEntryId: winner.id,
        winnerEntryCode: winner.code,
        winnerUserId: winner.userId,
        drawnByUserId,
      },
    });

    await tx.drop.update({
      where: { id: dropId },
      data: { status: "drawn", closedAt: new Date() },
    });

    return draw;
  });
}
