import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { GENERAL_ADMIN_ROLES, requireRole } from "@/lib/rbac";
import { getAuditRequestId, writeAuditLog } from "@/lib/audit";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const auth = await requireRole(GENERAL_ADMIN_ROLES);
  if (!auth.authorized) return auth.response;

  const { id } = await params;
  const message = await prisma.supportMessage.findUnique({ where: { id } });
  if (!message) {
    return NextResponse.json({ error: "Mensaje no encontrado" }, { status: 404 });
  }

  return NextResponse.json({ message }, { headers: { "Cache-Control": "no-store" } });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const auth = await requireRole(GENERAL_ADMIN_ROLES);
  if (!auth.authorized) return auth.response;

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const action = String(body.action || "");
  if (!["mark-read", "mark-unread", "resolve", "reopen"].includes(action)) {
    return NextResponse.json({ error: "Acción inválida" }, { status: 400 });
  }

  const actorUserId = auth.session.user.id;
  const requestId = getAuditRequestId(req);

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const before = await tx.supportMessage.findUnique({
        where: { id },
        select: { id: true, readAt: true, resolvedAt: true },
      });
      if (!before) throw new Error("SUPPORT_MESSAGE_NOT_FOUND");

      const now = new Date();
      const data =
        action === "mark-read"
          ? { readAt: before.readAt ?? now, readByUserId: before.readAt ? undefined : actorUserId }
          : action === "mark-unread"
            ? { readAt: null, readByUserId: null }
            : action === "resolve"
              ? {
                  readAt: before.readAt ?? now,
                  readByUserId: before.readAt ? undefined : actorUserId,
                  resolvedAt: now,
                  resolvedByUserId: actorUserId,
                }
              : { resolvedAt: null, resolvedByUserId: null };

      const message = await tx.supportMessage.update({
        where: { id },
        data,
      });

      await writeAuditLog(tx, {
        actorUserId,
        accountId: auth.session.user.accountId ?? null,
        entityType: "SupportMessage",
        entityId: id,
        action: `support_message.${action}`,
        requestId,
        before: {
          read: Boolean(before.readAt),
          resolved: Boolean(before.resolvedAt),
        },
        after: {
          read: Boolean(message.readAt),
          resolved: Boolean(message.resolvedAt),
        },
      });

      return message;
    });

    return NextResponse.json({ message: updated });
  } catch (error) {
    if (error instanceof Error && error.message === "SUPPORT_MESSAGE_NOT_FOUND") {
      return NextResponse.json({ error: "Mensaje no encontrado" }, { status: 404 });
    }
    console.error("SUPPORT_MESSAGE_ADMIN_UPDATE_FAILED");
    return NextResponse.json({ error: "No se pudo actualizar el mensaje." }, { status: 500 });
  }
}
