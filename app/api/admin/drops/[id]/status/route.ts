import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { GENERAL_ADMIN_ROLES, requireRole } from "@/lib/rbac";
import { getAuditRequestId, writeAuditLog } from "@/lib/audit";

type Params = { params: Promise<{ id: string }> };

const transitions: Record<
  string,
  Record<string, "draft" | "active" | "closed" | "finalized">
> = {
  draft: { activate: "active" },
  active: { deactivate: "draft" },
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

      if (action === "deactivate") {
        const [assignedPasses, bonusEntries, claimedCredits, draw, earliestOther] =
          await Promise.all([
            tx.dropPass.count({ where: { dropId: id, status: "assigned" } }),
            tx.dropBonusEntry.count({ where: { dropId: id, revokedAt: null } }),
            tx.dropBonusCredit.count({
              where: { dropId: id, claimedAt: { not: null } },
            }),
            tx.dropDraw.findUnique({
              where: { dropId: id },
              select: { id: true },
            }),
            tx.drop.findFirst({
              where: { id: { not: id }, opensAt: { not: null } },
              orderBy: { opensAt: "asc" },
              select: { opensAt: true },
            }),
          ]);

        if (assignedPasses > 0 || bonusEntries > 0 || claimedCredits > 0 || draw) {
          throw new Error("DROP_DEACTIVATE_NOT_EMPTY");
        }

        const isEarliestLaunch =
          Boolean(current.opensAt) &&
          (!earliestOther?.opensAt ||
            current.opensAt!.getTime() <= earliestOther.opensAt.getTime());

        if (isEarliestLaunch) {
          const globalPasses = await tx.dropPass.count();
          if (globalPasses > 0) {
            throw new Error("DROP_DEACTIVATE_PROGRAM_STARTED");
          }
        }

        await tx.dropBonusCredit.updateMany({
          where: {
            dropId: id,
            claimedAt: null,
            revokedAt: null,
          },
          data: { revokedAt: now },
        });
      }

      const drop = await tx.drop.update({
        where: { id },
        data: {
          status: next,
          ...(action === "activate" ? { opensAt: current.opensAt ?? now } : {}),
          ...(action === "deactivate"
            ? { opensAt: null, goalReachedAt: null, closedAt: null }
            : {}),
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
    if (code === "DROP_DEACTIVATE_NOT_EMPTY") {
      return NextResponse.json(
        { error: "No se puede desactivar un Drop que ya tenga participación real." },
        { status: 409 }
      );
    }
    if (code === "DROP_DEACTIVATE_PROGRAM_STARTED") {
      return NextResponse.json(
        {
          error:
            "Este Drop marcó el inicio del programa y ya existen Drop Passes. No puede desactivarse.",
        },
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
