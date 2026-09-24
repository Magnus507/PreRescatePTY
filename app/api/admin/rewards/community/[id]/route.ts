import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { GENERAL_ADMIN_ROLES, requireRole } from "@/lib/rbac";
import { getAuditRequestId, writeAuditLog } from "@/lib/audit";
import { refreshCommunityUnlocks } from "@/lib/rewards/service";

type Params = { params: Promise<{ id: string }> };

const statusActions: Record<string, string> = {
  activate: "active",
  deactivate: "draft",
  archive: "archived",
};

export async function PATCH(req: NextRequest, { params }: Params) {
  const auth = await requireRole(GENERAL_ADMIN_ROLES);
  if (!auth.authorized) return auth.response;

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const action = typeof body.action === "string" ? body.action : "";
  const nextStatus = statusActions[action];
  if (!nextStatus) {
    return NextResponse.json({ error: "Acción comunitaria inválida." }, { status: 400 });
  }

  const requestId = getAuditRequestId(req);
  try {
    const unlock = await prisma.$transaction(async (tx) => {
      const current = await tx.communityUnlock.findUnique({
        where: { id },
        include: { linkedDrop: { select: { status: true, title: true } } },
      });
      if (!current) throw new Error("COMMUNITY_NOT_FOUND");
      if (current.status === "unlocked") throw new Error("COMMUNITY_ALREADY_UNLOCKED");
      if (current.status === "archived" && action !== "archive") {
        throw new Error("COMMUNITY_ARCHIVED");
      }
      if (
        action === "activate" &&
        current.unlockType === "community_drop" &&
        current.linkedDrop?.status !== "draft"
      ) {
        throw new Error("COMMUNITY_DROP_NOT_DRAFT");
      }

      const updated = await tx.communityUnlock.update({
        where: { id },
        data: { status: nextStatus },
      });

      await writeAuditLog(tx, {
        actorUserId: auth.session.user.id,
        accountId: auth.session.user.accountId ?? null,
        entityType: "CommunityUnlock",
        entityId: id,
        action: `reward.community.${action}`,
        requestId,
        before: { status: current.status },
        after: { status: updated.status },
      });

      return updated;
    });

    if (action === "activate") {
      await refreshCommunityUnlocks();
    }

    return NextResponse.json({ unlock });
  } catch (error) {
    const key = error instanceof Error ? error.message : "";
    const map: Record<string, [string, number]> = {
      COMMUNITY_NOT_FOUND: ["Community Unlock no encontrado.", 404],
      COMMUNITY_ALREADY_UNLOCKED: ["Un Community Unlock alcanzado ya no puede modificarse.", 409],
      COMMUNITY_ARCHIVED: ["Un Community Unlock archivado no puede reactivarse.", 409],
      COMMUNITY_DROP_NOT_DRAFT: ["El Drop vinculado ya no está en borrador.", 409],
    };
    const [message, status] = map[key] || ["No se pudo actualizar Community Unlock.", 500];
    if (status === 500) console.error("COMMUNITY_STATUS_FAILED", error);
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const auth = await requireRole(GENERAL_ADMIN_ROLES);
  if (!auth.authorized) return auth.response;

  const { id } = await params;
  const requestId = getAuditRequestId(req);

  try {
    await prisma.$transaction(async (tx) => {
      const current = await tx.communityUnlock.findUnique({ where: { id } });
      if (!current) throw new Error("COMMUNITY_NOT_FOUND");
      if (current.status !== "draft") throw new Error("COMMUNITY_DELETE_LOCKED");

      await writeAuditLog(tx, {
        actorUserId: auth.session.user.id,
        accountId: auth.session.user.accountId ?? null,
        entityType: "CommunityUnlock",
        entityId: id,
        action: "reward.community.delete",
        requestId,
        before: { title: current.title, status: current.status },
      });

      await tx.communityUnlock.delete({ where: { id } });
    });

    return NextResponse.json({ deleted: true });
  } catch (error) {
    const key = error instanceof Error ? error.message : "";
    if (key === "COMMUNITY_NOT_FOUND") {
      return NextResponse.json({ error: "Community Unlock no encontrado." }, { status: 404 });
    }
    if (key === "COMMUNITY_DELETE_LOCKED") {
      return NextResponse.json(
        { error: "Solo se puede eliminar un Community Unlock que siga en borrador." },
        { status: 409 }
      );
    }
    console.error("COMMUNITY_DELETE_FAILED", error);
    return NextResponse.json({ error: "No se pudo eliminar Community Unlock." }, { status: 500 });
  }
}
