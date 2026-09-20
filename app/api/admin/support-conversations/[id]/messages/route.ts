import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { GENERAL_ADMIN_ROLES, requireRole } from "@/lib/rbac";
import { rateLimit } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";
type Params = { params: Promise<{ id: string }> };

const messageSchema = z.object({
  body: z.string().trim().min(1).max(5000),
  isInternalNote: z.boolean().optional().default(false),
});

export async function GET(_req: NextRequest, { params }: Params) {
  const auth = await requireRole(GENERAL_ADMIN_ROLES);
  if (!auth.authorized) return auth.response;
  const { id } = await params;

  const conversation = await prisma.supportConversation.findUnique({ where: { id } });
  if (!conversation) return NextResponse.json({ error: "Conversación no encontrada" }, { status: 404 });

  const messages = await prisma.supportConversationMessage.findMany({
    where: { conversationId: id, deletedAt: null },
    orderBy: { createdAt: "asc" },
    take: 300,
  });

  await prisma.supportConversation.update({
    where: { id },
    data: { supportLastReadAt: new Date() },
  });

  return NextResponse.json(
    { conversation, messages },
    { headers: { "Cache-Control": "private, no-store, max-age=0" } }
  );
}

export async function POST(req: NextRequest, { params }: Params) {
  const auth = await requireRole(GENERAL_ADMIN_ROLES);
  if (!auth.authorized) return auth.response;
  const { id } = await params;

  const conversation = await prisma.supportConversation.findUnique({ where: { id } });
  if (!conversation) return NextResponse.json({ error: "Conversación no encontrada" }, { status: 404 });
  if (conversation.closedAt) return NextResponse.json({ error: "La conversación está cerrada." }, { status: 409 });

  const actorUserId = auth.session.user.id;
  const limiter = await rateLimit("admin-support-conversation-message", actorUserId, {
    limit: 60,
    windowMs: 60_000,
  });
  if (!limiter.allowed) return NextResponse.json({ error: "Demasiados mensajes." }, { status: 429 });

  const parsed = messageSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Mensaje inválido" }, { status: 400 });

  const now = new Date();
  const message = await prisma.$transaction(async (tx) => {
    const created = await tx.supportConversationMessage.create({
      data: {
        conversationId: id,
        senderType: "agent",
        senderUserId: actorUserId,
        body: parsed.data.body,
        isInternalNote: parsed.data.isInternalNote,
        createdAt: now,
      },
    });

    await tx.supportConversation.update({
      where: { id },
      data: {
        ...(parsed.data.isInternalNote ? {} : { lastMessageAt: now }),
        supportLastReadAt: now,
        status: parsed.data.isInternalNote ? conversation.status : "awaiting_client",
        assignedToUserId: conversation.assignedToUserId ?? actorUserId,
      },
    });

    await tx.supportEvent.create({
      data: {
        conversationId: id,
        actorUserId,
        eventType: parsed.data.isInternalNote ? "internal_note_added" : "agent_message",
        afterJson: parsed.data.isInternalNote ? { internal: true } : { status: "awaiting_client" },
      },
    });
    return created;
  });

  return NextResponse.json({ message }, { status: 201 });
}
