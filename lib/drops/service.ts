import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { calculateEarnedDropPasses, pickWinnerIndex } from "@/lib/drops/rules";

function makeCode(prefix: "DP" | "BE") {
  return `${prefix}-${randomBytes(8).toString("hex").toUpperCase()}`;
}

export async function syncPurchaseDropPasses(userId: string) {
  const orders = await prisma.order.findMany({
    where: {
      userId,
      paymentStatus: "paid",
      orderStatus: { not: "cancelled" },
      OR: [{ provider: "yappy" }, { adminReviewStatus: "approved" }],
    },
    select: { id: true, amount: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  let created = 0;

  for (const order of orders) {
    const expected = calculateEarnedDropPasses(order.amount);
    if (expected <= 0) continue;

    const existing = await prisma.dropPass.findMany({
      where: { sourceOrderId: order.id },
      select: { sourceOrdinal: true },
    });
    const ordinals = new Set(existing.map((row) => row.sourceOrdinal));
    const missing = Array.from({ length: expected }, (_, index) => index + 1)
      .filter((ordinal) => !ordinals.has(ordinal));

    if (missing.length === 0) continue;

    const result = await prisma.dropPass.createMany({
      data: missing.map((sourceOrdinal) => ({
        code: makeCode("DP"),
        userId,
        sourceOrderId: order.id,
        sourceOrdinal,
        earnedAt: order.createdAt,
      })),
      skipDuplicates: true,
    });
    created += result.count;
  }

  return { created };
}

export async function getUserDropsSnapshot(userId: string) {
  await syncPurchaseDropPasses(userId);

  const [drops, passes, bonusEntries] = await Promise.all([
    prisma.drop.findMany({
      where: {
        status: { in: ["active", "goal_reached", "closed", "drawn", "finalized"] },
      },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      select: {
        id: true,
        slug: true,
        title: true,
        description: true,
        prizeLabel: true,
        imageUrl: true,
        targetPasses: true,
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
  ]);

  return {
    availablePassCount: passes.filter((pass) => pass.status === "available").length,
    drops: drops.map((drop) => ({
      id: drop.id,
      slug: drop.slug,
      title: drop.title,
      description: drop.description,
      prizeLabel: drop.prizeLabel,
      imageUrl: drop.imageUrl,
      targetPasses: drop.targetPasses,
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
  dropId: string
) {
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
  });
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
