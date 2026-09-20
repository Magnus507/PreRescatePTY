import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };
const messageSchema = z.object({ body: z.string().trim().min(1).max(5000) });

async function authorizeConversation(userId: string, conversationId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { accountId: true, status: true, deletedAt: true },
  });
  if (!user?.accountId || user.deletedAt || user.status !== "active") return null;
  const conversation = await prisma.supportConversation.findFirst({
    where: { id: conversationId, accountId: user.accountId },
  });
  return conversation ? { user, conversation } : null;
}

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;
  const authorized = await authorizeConversation(session.user.id, id);
  if (!authorized) return NextResponse.json({ error: "Conversación no encontrada" }, { status: 404 });

  const messages = await prisma.supportConversationMessage.findMany({
    where: {
      conversationId: id,
      isInternalNote: false,
      deletedAt: null,
    },
    orderBy: { createdAt: "asc" },
    take: 200,
  });

  await prisma.supportConversation.update({
    where: { id },
    data: { clientLastReadAt: new Date() },
  });

  return NextResponse.json(
    { conversation: authorized.conversation, messages },
    { headers: { "Cache-Control": "private, no-store, max-age=0" } }
  );
}

export async function POST(req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;
  const authorized = await authorizeConversation(session.user.id, id);
  if (!authorized) return NextResponse.json({ error: "Conversación no encontrada" }, { status: 404 });
  if (authorized.conversation.closedAt) {
    return NextResponse.json({ error: "Esta conversación está cerrada." }, { status: 409 });
  }

  const limiter = await rateLimit("support-conversation-message", session.user.id, {
    limit: 30,
    windowMs: 60_000,
  });
  if (!limiter.allowed) {
    return NextResponse.json({ error: "Estás enviando mensajes demasiado rápido." }, { status: 429 });
  }

  const parsed = messageSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Mensaje inválido" }, { status: 400 });

  const now = new Date();
  const message = await prisma.$transaction(async (tx) => {
    const created = await tx.supportConversationMessage.create({
      data: {
        conversationId: id,
        senderType: "client",
        senderUserId: session.user.id,
        body: parsed.data.body,
        isInternalNote: false,
        createdAt: now,
      },
    });
    await tx.supportConversation.update({
      where: { id },
      data: {
        lastMessageAt: now,
        clientLastReadAt: now,
        status: authorized.conversation.resolvedAt ? "open" : authorized.conversation.status,
        resolvedAt: authorized.conversation.resolvedAt ? null : authorized.conversation.resolvedAt,
      },
    });
    if (authorized.conversation.resolvedAt) {
      await tx.supportEvent.create({
        data: {
          conversationId: id,
          actorUserId: session.user.id,
          eventType: "reopened_by_client",
          beforeJson: { status: authorized.conversation.status, resolvedAt: authorized.conversation.resolvedAt },
          afterJson: { status: "open", resolvedAt: null },
        },
      });
    }
    return created;
  });

  return NextResponse.json({ message }, { status: 201 });
}
