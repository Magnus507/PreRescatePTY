import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { GENERAL_ADMIN_ROLES, requireRole } from "@/lib/rbac";
import { getAuditRequestId, writeAuditLog } from "@/lib/audit";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const auth = await requireRole(GENERAL_ADMIN_ROLES);
  if (!auth.authorized) return auth.response;

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  if (typeof body.visible !== "boolean") {
    return NextResponse.json({ error: "Visibilidad inválida." }, { status: 400 });
  }

  const requestId = getAuditRequestId(req);

  try {
    const founder = await prisma.$transaction(async (tx) => {
      const current = await tx.foundingMember.findUnique({ where: { id } });
      if (!current) throw new Error("FOUNDER_NOT_FOUND");

      const updated = await tx.foundingMember.update({
        where: { id },
        data: { visible: body.visible },
      });

      await writeAuditLog(tx, {
        actorUserId: auth.session.user.id,
        accountId: auth.session.user.accountId ?? null,
        entityType: "FoundingMember",
        entityId: id,
        action: "reward.founder.visibility",
        requestId,
        before: { visible: current.visible },
        after: { visible: updated.visible },
      });

      return updated;
    });

    return NextResponse.json({ founder });
  } catch (error) {
    const key = error instanceof Error ? error.message : "";
    if (key === "FOUNDER_NOT_FOUND") {
      return NextResponse.json({ error: "Founding Member no encontrado." }, { status: 404 });
    }
    console.error("FOUNDING_MEMBER_VISIBILITY_FAILED", error);
    return NextResponse.json(
      { error: "No se pudo actualizar Founding Member." },
      { status: 500 }
    );
  }
}
