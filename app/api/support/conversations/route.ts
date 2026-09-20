import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

const createConversationSchema = z.object({
  category: z.enum(["general", "order", "device", "account", "billing"]).default("general"),
  subject: z.string().trim().min(3).max(160),
  body: z.string().trim().min(1).max(5000),
});

async function getCurrentAccountUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  return prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, accountId: true, status: true, deletedAt: true },
  });
}

export async function GET() {
  const user = await getCurrentAccountUser();
  if (!user?.accountId || user.deletedAt || user.status !== "active") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const conversations = await prisma.supportConversation.findMany({
    where: { accountId: user.accountId },
    orderBy: { lastMessageAt: "desc" },
    take: 50,
  });

  const enriched = await Promise.all(conversations.map(async (conversation) => {
    const [latestMessage, unread] = await Promise.all([
      prisma.supportConversationMessage.findFirst({
        where: {
          conversationId: conversation.id,
          isInternalNote: false,
          deletedAt: null,
        },
        orderBy: { createdAt: "desc" },
        select: { body: true, senderType: true, createdAt: true },
      }),
      prisma.supportConversationMessage.count({
        where: {
          conversationId: conversation.id,
          senderType: "agent",
          isInternalNote: false,
          deletedAt: null,
          ...(conversation.clientLastReadAt
            ? { createdAt: { gt: conversation.clientLastReadAt } }
            : {}),
        },
      }),
    ]);
    return { ...conversation, latestMessage, unreadCount: unread };
  }));

  return NextResponse.json(
    { conversations: enriched },
    { headers: { "Cache-Control": "private, no-store, max-age=0" } }
  );
}

export async function POST(req: NextRequest) {
  const user = await getCurrentAccountUser();
  if (!user?.accountId || user.deletedAt || user.status !== "active") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const limiter = await rateLimit("support-conversation-create", user.id, {
    limit: 10,
    windowMs: 60_000 * 15,
  });
  if (!limiter.allowed) {
    return NextResponse.json({ error: "Demasiados mensajes. Intenta nuevamente más tarde." }, { status: 429 });
  }

  const parsed = createConversationSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos de soporte inválidos", details: parsed.error.flatten() }, { status: 400 });
  }

  const now = new Date();
  const conversation = await prisma.$transaction(async (tx) => {
    const created = await tx.supportConversation.create({
      data: {
        accountId: user.accountId as string,
        openedByUserId: user.id,
        category: parsed.data.category,
        subject: parsed.data.subject,
        status: "open",
        lastMessageAt: now,
        clientLastReadAt: now,
      },
    });
    await tx.supportConversationMessage.create({
      data: {
        conversationId: created.id,
        senderType: "client",
        senderUserId: user.id,
        body: parsed.data.body,
        isInternalNote: false,
        createdAt: now,
      },
    });
    await tx.supportEvent.create({
      data: {
        conversationId: created.id,
        actorUserId: user.id,
        eventType: "opened",
        afterJson: { status: "open", category: parsed.data.category },
      },
    });
    return created;
  });

  return NextResponse.json({ conversation }, { status: 201 });
}
