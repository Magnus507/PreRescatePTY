import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { GENERAL_ADMIN_ROLES, requireRole } from "@/lib/rbac";
import { getAuditRequestId, writeAuditLog } from "@/lib/audit";

type Params = { params: Promise<{ id: string }> };

const transitions: Record<string, Record<string, "active" | "closed" | "finalized">> = {
  draft: { activate: "active" },
  goal_reached: { close: "closed" },
  drawn: { finalize: "finalized" },
};

export async function PATCH(req: NextRequest, { params }: Params) {
  const auth = await requireRole(GENERAL_ADMIN_ROLES);
  if (!auth.authorized) return auth.response;

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const action = typeof body.action === "string" ? body.action : "";
  const requestId = getAuditRequestId(req);

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const current = await tx.drop.findUnique({ where: { id } });
      if (!current) throw new Error("DROP_NOT_FOUND");

      const next = transitions[current.status]?.[action];
      if (!next) throw new Error("DROP_TRANSITION_INVALID");

      const now = new Date();
      const drop = await tx.drop.update({
        where: { id },
        data: {
          status: next,
          ...(action === "activate" ? { opensAt: current.opensAt ?? now } : {}),
          ...(action === "close" ? { closedAt: current.closedAt ?? now } : {}),
        },
      });

      await writeAuditLog(tx, {
        actorUserId: auth.session.user.id,
        accountId: auth.session.user.accountId ?? null,
        entityType: "Drop",
        entityId: id,
        action: `drop.${action}`,
        requestId,
        before: { status: current.status },
        after: { status: drop.status },
      });

      return drop;
    });

    return NextResponse.json({ drop: updated });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (code === "DROP_NOT_FOUND") {
      return NextResponse.json({ error: "Drop no encontrado." }, { status: 404 });
    }
    if (code === "DROP_TRANSITION_INVALID") {
      return NextResponse.json(
        { error: "Transición de estado no permitida." },
        { status: 409 }
      );
    }
    console.error("DROP_STATUS_UPDATE_FAILED");
    return NextResponse.json(
      { error: "No se pudo actualizar el Drop." },
      { status: 500 }
    );
  }
}
