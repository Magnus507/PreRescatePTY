import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { GENERAL_ADMIN_ROLES, requireRole } from "@/lib/rbac";
import { getAuditRequestId, writeAuditLog } from "@/lib/audit";
import { makeDropPassGrantCode } from "@/lib/drops/rules";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireRole(GENERAL_ADMIN_ROLES);
  if (!auth.authorized) return auth.response;

  const codes = await prisma.dropPassGrantCode.findMany({
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
      redeemedPass: {
        select: { id: true, code: true, userId: true, status: true, dropId: true },
      },
    },
  });

  return NextResponse.json(
    { codes },
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

  if (!campaign || !Number.isInteger(count) || count < 1 || count > 100) {
    return NextResponse.json(
      { error: "Datos del código especial inválidos." },
      { status: 400 }
    );
  }

  const requestId = getAuditRequestId(req);
  const created = await prisma.$transaction(async (tx) => {
    const codes: Array<{ id: string; code: string }> = [];

    for (let index = 0; index < count; index += 1) {
      let saved = false;
      for (let attempt = 0; attempt < 5 && !saved; attempt += 1) {
        try {
          const row = await tx.dropPassGrantCode.create({
            data: {
              code: makeDropPassGrantCode(),
              campaign,
              createdByUserId: auth.session.user.id,
            },
            select: { id: true, code: true },
          });
          codes.push(row);
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
      entityType: "DropPassGrantCode",
      entityId: codes[0]?.id ?? "batch",
      action: "drop.pass_code_generate",
      requestId,
      after: { count: codes.length, campaign },
    });

    return codes;
  });

  return NextResponse.json({ codes: created }, { status: 201 });
}
