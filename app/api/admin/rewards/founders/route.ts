import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { GENERAL_ADMIN_ROLES, requireRole } from "@/lib/rbac";
import { getAuditRequestId, writeAuditLog } from "@/lib/audit";

export async function POST(req: NextRequest) {
  const auth = await requireRole(GENERAL_ADMIN_ROLES);
  if (!auth.authorized) return auth.response;

  const body = await req.json().catch(() => ({}));
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const note = typeof body.note === "string" ? body.note.trim().slice(0, 300) || null : null;

  if (!email) {
    return NextResponse.json({ error: "Ingresa el correo del cliente." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true },
  });
  if (!user) {
    return NextResponse.json({ error: "No existe un usuario con ese correo." }, { status: 404 });
  }

  const requestId = getAuditRequestId(req);

  try {
    const founder = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('founding-member-sequence'))`;

      const existing = await tx.foundingMember.findUnique({
        where: { userId: user.id },
      });
      if (existing) throw new Error("FOUNDER_ALREADY_ASSIGNED");

      const created = await tx.foundingMember.create({
        data: {
          userId: user.id,
          note,
          grantedByUserId: auth.session.user.id,
        },
      });

      await writeAuditLog(tx, {
        actorUserId: auth.session.user.id,
        accountId: auth.session.user.accountId ?? null,
        entityType: "FoundingMember",
        entityId: created.id,
        action: "reward.founder.grant",
        requestId,
        after: {
          userId: user.id,
          founderNumber: created.founderNumber,
          visible: created.visible,
        },
      });

      return created;
    });

    return NextResponse.json(
      { founder: { ...founder, email: user.email } },
      { status: 201 }
    );
  } catch (error) {
    const key = error instanceof Error ? error.message : "";
    if (key === "FOUNDER_ALREADY_ASSIGNED") {
      return NextResponse.json(
        { error: "Ese cliente ya tiene un Founding Member asignado." },
        { status: 409 }
      );
    }
    console.error("FOUNDING_MEMBER_GRANT_FAILED", error);
    return NextResponse.json(
      { error: "No se pudo asignar Founding Member." },
      { status: 500 }
    );
  }
}
