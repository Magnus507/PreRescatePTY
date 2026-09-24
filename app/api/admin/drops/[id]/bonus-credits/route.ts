import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { GENERAL_ADMIN_ROLES, requireRole } from "@/lib/rbac";
import { getAuditRequestId, writeAuditLog } from "@/lib/audit";
import { makeBonusCreditCode } from "@/lib/drops/bonus-credits";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const auth = await requireRole(GENERAL_ADMIN_ROLES);
  if (!auth.authorized) return auth.response;

  const { id } = await params;
  const credits = await prisma.dropBonusCredit.findMany({
    where: { dropId: id },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      code: true,
      campaign: true,
      claimedByUserId: true,
      claimedAt: true,
      revokedAt: true,
      createdAt: true,
    },
  });
  return NextResponse.json({ credits }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: NextRequest, { params }: Params) {
  const auth = await requireRole(GENERAL_ADMIN_ROLES);
  if (!auth.authorized) return auth.response;

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const campaign =
    typeof body.campaign === "string" ? body.campaign.trim().slice(0, 160) : "";
  const count = Number(body.count ?? 1);

  if (!campaign || !Number.isInteger(count) || count < 1 || count > 100) {
    return NextResponse.json({ error: "Datos de Bonus Credit inválidos." }, { status: 400 });
  }

  const drop = await prisma.drop.findUnique({
    where: { id },
    select: { id: true, title: true, status: true },
  });
  if (!drop) return NextResponse.json({ error: "Drop no encontrado." }, { status: 404 });
  if (!["draft", "active"].includes(drop.status)) {
    return NextResponse.json(
      { error: "Los Bonus Credits solo se generan en Drops en borrador o activos." },
      { status: 409 }
    );
  }

  const requestId = getAuditRequestId(req);
  const created = await prisma.$transaction(async (tx) => {
    const credits: Array<{ id: string; code: string }> = [];

    for (let index = 0; index < count; index += 1) {
      let saved = false;
      for (let attempt = 0; attempt < 5 && !saved; attempt += 1) {
        try {
          const row = await tx.dropBonusCredit.create({
            data: {
              code: makeBonusCreditCode(),
              dropId: id,
              campaign,
              createdByUserId: auth.session.user.id,
            },
            select: { id: true, code: true },
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
      entityType: "Drop",
      entityId: id,
      action: "drop.bonus_credit_generate",
      requestId,
      after: { count: credits.length, campaign },
    });

    return credits;
  });

  return NextResponse.json({ credits: created }, { status: 201 });
}
