import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";
import {
  DROP_PASS_GRANT_CODE_PATTERN,
  normalizeDropPassGrantCode,
} from "@/lib/drops/rules";

function redeemedPassCode(code: string) {
  return `DP-${createHash("sha256")
    .update(`support-pass:${code}`)
    .digest("hex")
    .slice(0, 16)
    .toUpperCase()}`;
}

export async function redeemDropPassGrantCode(userId: string, rawCode: string) {
  const code = normalizeDropPassGrantCode(rawCode);
  if (!DROP_PASS_GRANT_CODE_PATTERN.test(code)) {
    throw new Error("DROP_PASS_GRANT_CODE_INVALID");
  }

  return prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<
      Array<{
        id: string;
        code: string;
        campaign: string;
        claimedByUserId: string | null;
        claimedAt: Date | null;
        redeemedPassId: string | null;
        revokedAt: Date | null;
      }>
    >`
      SELECT "id", "code", "campaign", "claimedByUserId", "claimedAt",
             "redeemedPassId", "revokedAt"
      FROM "DropPassGrantCode"
      WHERE "code" = ${code}
      FOR UPDATE
    `;
    const grant = rows[0];
    if (!grant) throw new Error("DROP_PASS_GRANT_CODE_NOT_FOUND");
    if (grant.revokedAt) throw new Error("DROP_PASS_GRANT_CODE_REVOKED");
    if (grant.claimedAt || grant.redeemedPassId) {
      throw new Error("DROP_PASS_GRANT_CODE_ALREADY_CLAIMED");
    }

    const pass = await tx.dropPass.create({
      data: {
        code: redeemedPassCode(grant.code),
        userId,
        sourceOrderId: `support:${grant.id}`,
        sourceOrdinal: 1,
        earnedAt: new Date(),
      },
      select: {
        id: true,
        code: true,
        status: true,
        earnedAt: true,
      },
    });

    await tx.dropPassGrantCode.update({
      where: { id: grant.id },
      data: {
        claimedByUserId: userId,
        claimedAt: new Date(),
        redeemedPassId: pass.id,
      },
    });

    return { pass, campaign: grant.campaign };
  });
}
