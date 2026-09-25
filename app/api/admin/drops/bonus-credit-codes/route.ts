import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { GENERAL_ADMIN_ROLES, requireRole } from "@/lib/rbac";
import { getAuditRequestId, writeAuditLog } from "@/lib/audit";
import { makeBonusCreditCode } from "@/lib/drops/rules";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireRole(GENERAL_ADMIN_ROLES);
  if (!auth.authorized) return auth.response;

  const credits = await prisma.dropBonusCredit.findMany({
    where: { dropId: null },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      code: true,
      campaign: true,
      creditAmount: true,
      claimedByUserId: true,
      claimedAt: true,
      revokedAt: true,
      createdAt: true,
    },
  });

  return NextResponse.json(
    { credits },
    { headers: { "Cache-Control": "no-store" } }
  );
}

export async function POST(req: NextRequest) {
  const auth = await requireRole(GENERAL_ADMIN_ROLES);
  if (!auth.authorized) return auth.response;

  const body = await req.json().catch(() => ({}));
  const campaign =
    typeof body.campaign === "string"
      ? body.campaign.trim().slice(0, 160)
      : "";
  const count = Number(body.count ?? 1);
  const creditAmount = Number(body.creditAmount ?? 1);

  if (
    !campaign ||
    !Number.isInteger(count) ||
    count < 1 ||
    count > 100 ||
    !Number.isInteger(creditAmount) ||
    creditAmount < 1 ||
    creditAmount > 100
  ) {
    return NextResponse.json(
      { error: "Datos de Bonus Credit general inválidos." },
      { status: 400 }
    );
  }

  const requestId = getAuditRequestId(req);
  const created = await prisma.$transaction(async (tx) => {
    const credits: Array<{ id: string; code: string; creditAmount: number }> = [];

    for (let index = 0; index < count; index += 1) {
      let saved = false;
      for (let attempt = 0; attempt < 5 && !saved; attempt += 1) {
        try {
          const row = await tx.dropBonusCredit.create({
            data: {
              code: makeBonusCreditCode(),
              dropId: null,
              campaign,
              creditAmount,
              createdByUserId: auth.session.user.id,
            },
            select: { id: true, code: true, creditAmount: true },
          });
          credits.push(row);
          saved = true;
        } catch (error) {
          const collision =
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === "P2002";
          if (!collision || attempt === 4) throw error;
        }
      }
    }

    await writeAuditLog(tx, {
      actorUserId: auth.session.user.id,
      accountId: auth.session.user.accountId ?? null,
      entityType: "DropBonusCredit",
      entityId: credits[0]?.id ?? "batch",
      action: "drop.bonus_credit_general_generate",
      requestId,
      after: {
        count: credits.length,
        campaign,
        creditAmount,
      },
    });

    return credits;
  });

  return NextResponse.json({ credits: created }, { status: 201 });
}
