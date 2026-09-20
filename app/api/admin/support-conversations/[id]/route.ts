import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { GENERAL_ADMIN_ROLES, requireRole } from "@/lib/rbac";

export const dynamic = "force-dynamic";
type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const auth = await requireRole(GENERAL_ADMIN_ROLES);
  if (!auth.authorized) return auth.response;
  const { id } = await params;
  const action = String((await req.json().catch(() => ({}))).action || "");
  if (!["resolve", "reopen", "close"].includes(action)) {
    return NextResponse.json({ error: "Acción inválida" }, { status: 400 });
  }

  const before = await prisma.supportConversation.findUnique({ where: { id } });
  if (!before) return NextResponse.json({ error: "Conversación no encontrada" }, { status: 404 });

  const actorUserId = auth.session.user.id;
  const now = new Date();
  const conversation = await prisma.$transaction(async (tx) => {
    const data =
      action === "resolve"
        ? { status: "resolved", resolvedAt: now, closedAt: null }
        : action === "reopen"
          ? { status: "open", resolvedAt: null, closedAt: null }
          : { status: "closed", closedAt: now };

    const updated = await tx.supportConversation.update({
      where: { id },
      data,
    });
    await tx.supportEvent.create({
      data: {
        conversationId: id,
        actorUserId,
        eventType: action,
        beforeJson: {
          status: before.status,
          resolvedAt: before.resolvedAt,
          closedAt: before.closedAt,
        },
        afterJson: {
          status: updated.status,
          resolvedAt: updated.resolvedAt,
          closedAt: updated.closedAt,
        },
      },
    });
    return updated;
  });

  return NextResponse.json({ conversation });
}
