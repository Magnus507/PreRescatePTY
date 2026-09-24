import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { GENERAL_ADMIN_ROLES, requireRole } from "@/lib/rbac";
import { getAuditRequestId, writeAuditLog } from "@/lib/audit";

type Params = { params: Promise<{ id: string }> };

const statusActions: Record<string, string> = {
  activate: "active",
  pause: "paused",
  archive: "archived",
  draft: "draft",
};

export async function PATCH(req: NextRequest, { params }: Params) {
  const auth = await requireRole(GENERAL_ADMIN_ROLES);
  if (!auth.authorized) return auth.response;

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const action = typeof body.action === "string" ? body.action : "";
  const nextStatus = statusActions[action];
  if (!nextStatus) {
    return NextResponse.json({ error: "Acción de misión inválida." }, { status: 400 });
  }

  const requestId = getAuditRequestId(req);
  try {
    const mission = await prisma.$transaction(async (tx) => {
      const current = await tx.rewardMission.findUnique({
        where: { id },
        include: { _count: { select: { completions: true } } },
      });
      if (!current) throw new Error("MISSION_NOT_FOUND");
      if (current.status === "archived" && nextStatus !== "archived") {
        throw new Error("MISSION_ARCHIVED");
      }

      const updated = await tx.rewardMission.update({
        where: { id },
        data: { status: nextStatus },
      });

      await writeAuditLog(tx, {
        actorUserId: auth.session.user.id,
        accountId: auth.session.user.accountId ?? null,
        entityType: "RewardMission",
        entityId: id,
        action: `reward.mission.${action}`,
        requestId,
        before: { status: current.status },
        after: { status: updated.status, completionCount: current._count.completions },
      });

      return updated;
    });

    return NextResponse.json({ mission });
  } catch (error) {
    const key = error instanceof Error ? error.message : "";
    if (key === "MISSION_NOT_FOUND") {
      return NextResponse.json({ error: "Misión no encontrada." }, { status: 404 });
    }
    if (key === "MISSION_ARCHIVED") {
      return NextResponse.json({ error: "Una misión archivada no puede reactivarse." }, { status: 409 });
    }
    console.error("REWARD_MISSION_STATUS_FAILED", error);
    return NextResponse.json({ error: "No se pudo actualizar la misión." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const auth = await requireRole(GENERAL_ADMIN_ROLES);
  if (!auth.authorized) return auth.response;

  const { id } = await params;
  const requestId = getAuditRequestId(req);

  try {
    await prisma.$transaction(async (tx) => {
      const current = await tx.rewardMission.findUnique({
        where: { id },
        include: { _count: { select: { completions: true } } },
      });
      if (!current) throw new Error("MISSION_NOT_FOUND");
      if (current.status === "active" || current._count.completions > 0) {
        throw new Error("MISSION_DELETE_LOCKED");
      }

      await writeAuditLog(tx, {
        actorUserId: auth.session.user.id,
        accountId: auth.session.user.accountId ?? null,
        entityType: "RewardMission",
        entityId: id,
        action: "reward.mission.delete",
        requestId,
        before: { title: current.title, status: current.status },
      });

      await tx.rewardMission.delete({ where: { id } });
    });

    return NextResponse.json({ deleted: true });
  } catch (error) {
    const key = error instanceof Error ? error.message : "";
    if (key === "MISSION_NOT_FOUND") {
      return NextResponse.json({ error: "Misión no encontrada." }, { status: 404 });
    }
    if (key === "MISSION_DELETE_LOCKED") {
      return NextResponse.json(
        { error: "Solo se eliminan misiones sin completaciones y que no estén activas." },
        { status: 409 }
      );
    }
    console.error("REWARD_MISSION_DELETE_FAILED", error);
    return NextResponse.json({ error: "No se pudo eliminar la misión." }, { status: 500 });
  }
}
