import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";

const ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

export function normalizeBonusCreditCode(value: string) {
  return value.trim().toUpperCase().replace(/\s+/g, "");
}

export function makeBonusCreditCode() {
  const bytes = randomBytes(12);
  let payload = "";
  for (let i = 0; i < 12; i += 1) {
    payload += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return `BC-${payload.slice(0, 4)}-${payload.slice(4, 8)}-${payload.slice(8, 12)}`;
}

function makeBonusEntryCode() {
  return `BE-${randomBytes(8).toString("hex").toUpperCase()}`;
}

export async function redeemBonusCredit(userId: string, rawCode: string) {
  const code = normalizeBonusCreditCode(rawCode);
  if (!/^BC-[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4}$/.test(code)) {
    throw new Error("BONUS_CREDIT_INVALID");
  }

  return prisma.$transaction(async (tx) => {
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
      WHERE "code" = ${code}
      FOR UPDATE
    `;

    const credit = rows[0];
    if (!credit) throw new Error("BONUS_CREDIT_NOT_FOUND");
    if (credit.revokedAt) throw new Error("BONUS_CREDIT_REVOKED");
    if (credit.claimedAt) throw new Error("BONUS_CREDIT_ALREADY_CLAIMED");

    const drop = await tx.drop.findUnique({
      where: { id: credit.dropId },
      select: { id: true, status: true, title: true },
    });
    if (!drop) throw new Error("DROP_NOT_FOUND");
    if (drop.status !== "active") throw new Error("BONUS_CREDIT_DROP_CLOSED");

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
