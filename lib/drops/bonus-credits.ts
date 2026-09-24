import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import {
  BONUS_CREDIT_PATTERN,
  normalizeBonusCreditCode,
} from "@/lib/drops/rules";

function makeBonusEntryCode() {
  return `BE-${randomBytes(8).toString("hex").toUpperCase()}`;
}

export async function redeemBonusCredit(userId: string, rawCode: string) {
  const code = normalizeBonusCreditCode(rawCode);
  if (!BONUS_CREDIT_PATTERN.test(code)) {
    throw new Error("BONUS_CREDIT_INVALID");
  }

  return prisma.$transaction(async (tx) => {
    const candidate = await tx.dropBonusCredit.findUnique({
      where: { code },
      select: { id: true, dropId: true },
    });
    if (!candidate) throw new Error("BONUS_CREDIT_NOT_FOUND");

    const drops = await tx.$queryRaw<
      Array<{ id: string; status: string; title: string }>
    >`
      SELECT "id", "status"::text AS "status", "title"
      FROM "Drop"
      WHERE "id" = ${candidate.dropId}
      FOR UPDATE
    `;
    const drop = drops[0];
    if (!drop) throw new Error("DROP_NOT_FOUND");
    if (drop.status !== "active") throw new Error("BONUS_CREDIT_DROP_CLOSED");

    const rows = await tx.$queryRaw<Array<{
      id: string;
      dropId: string;
      campaign: string;
      createdByUserId: string;
      claimedByUserId: string | null;
      claimedAt: Date | null;
      revokedAt: Date | null;
    }>>`
      SELECT "id", "dropId", "campaign", "createdByUserId",
             "claimedByUserId", "claimedAt", "revokedAt"
      FROM "DropBonusCredit"
      WHERE "id" = ${candidate.id}
      FOR UPDATE
    `;

    const credit = rows[0];
    if (!credit) throw new Error("BONUS_CREDIT_NOT_FOUND");
    if (credit.revokedAt) throw new Error("BONUS_CREDIT_REVOKED");
    if (credit.claimedAt) throw new Error("BONUS_CREDIT_ALREADY_CLAIMED");

    const entry = await tx.dropBonusEntry.create({
      data: {
        code: makeBonusEntryCode(),
        dropId: credit.dropId,
        userId,
        reason: `Bonus Credit · ${credit.campaign}`,
        createdByUserId: credit.createdByUserId,
        sourceBonusCreditId: credit.id,
      },
      select: { id: true, code: true, reason: true, createdAt: true },
    });

    await tx.dropBonusCredit.update({
      where: { id: credit.id },
      data: {
        claimedByUserId: userId,
        claimedAt: new Date(),
      },
    });

    return {
      entry,
      drop: { id: drop.id, title: drop.title },
    };
  });
}
