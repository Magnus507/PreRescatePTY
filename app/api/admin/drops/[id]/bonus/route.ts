import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { GENERAL_ADMIN_ROLES, requireRole } from "@/lib/rbac";
import { getAuditRequestId, writeAuditLog } from "@/lib/audit";

type Params = { params: Promise<{ id: string }> };

function bonusCode() {
  return `BE-${randomBytes(8).toString("hex").toUpperCase()}`;
}

export async function POST(req: NextRequest, { params }: Params) {
  const auth = await requireRole(GENERAL_ADMIN_ROLES);
  if (!auth.authorized) return auth.response;

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const email =
    typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const reason =
    typeof body.reason === "string" ? body.reason.trim().slice(0, 300) : "";
  const count = Number(body.count ?? 1);

  if (
    !email ||
    !reason ||
    !Number.isInteger(count) ||
    count < 1 ||
    count > 20
  ) {
    return NextResponse.json(
      { error: "Datos del bonus inválidos." },
      { status: 400 }
    );
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true },
  });
  if (!user) {
    return NextResponse.json({ error: "Usuario no encontrado." }, { status: 404 });
  }

  const requestId = getAuditRequestId(req);
  try {
    const created = await prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<
        Array<{ id: string; status: string; title: string }>
      >`
        SELECT "id", "status"::text AS "status", "title"
        FROM "Drop"
        WHERE "id" = ${id}
        FOR UPDATE
      `;
      const drop = rows[0];
      if (!drop) throw new Error("DROP_NOT_FOUND");
      if (drop.status !== "active") throw new Error("DROP_NOT_OPEN");

      const entries = [];
    for (let index = 0; index < count; index += 1) {
      entries.push(
        await tx.dropBonusEntry.create({
          data: {
            code: bonusCode(),
            dropId: id,
            userId: user.id,
            reason,
            createdByUserId: auth.session.user.id,
          },
        })
      );
    }

    await writeAuditLog(tx, {
      actorUserId: auth.session.user.id,
      accountId: auth.session.user.accountId ?? null,
      entityType: "Drop",
      entityId: id,
      action: "drop.bonus_grant",
      requestId,
      after: { userId: user.id, count, reason },
    });

      return entries;
    });

    return NextResponse.json({ count: created.length }, { status: 201 });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (code === "DROP_NOT_FOUND") {
      return NextResponse.json({ error: "Drop no encontrado." }, { status: 404 });
    }
    if (code === "DROP_NOT_OPEN") {
      return NextResponse.json(
        { error: "Solo se pueden agregar bonus a un Drop activo." },
        { status: 409 }
      );
    }
    console.error("DROP_DIRECT_BONUS_FAILED");
    return NextResponse.json(
      { error: "No se pudo otorgar el Bonus Entry." },
      { status: 500 }
    );
  }
}
