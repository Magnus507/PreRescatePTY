import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { GENERAL_ADMIN_ROLES, requireRole } from "@/lib/rbac";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireRole(GENERAL_ADMIN_ROLES);
  if (!auth.authorized) return auth.response;

  const url = new URL(req.url);
  const state = url.searchParams.get("state") || "open";
  const q = (url.searchParams.get("q") || "").trim().toLowerCase();

  const conversations = await prisma.supportConversation.findMany({
    where:
      state === "all"
        ? {}
        : state === "resolved"
          ? { resolvedAt: { not: null } }
          : state === "closed"
            ? { closedAt: { not: null } }
            : { closedAt: null, resolvedAt: null },
    orderBy: { lastMessageAt: "desc" },
    take: 100,
  });

  const enriched = await Promise.all(conversations.map(async (conversation) => {
    const [opener, latestMessage, unread] = await Promise.all([
      prisma.user.findUnique({
        where: { id: conversation.openedByUserId },
        select: { email: true, phone: true },
      }),
      prisma.supportConversationMessage.findFirst({
        where: { conversationId: conversation.id, deletedAt: null, isInternalNote: false },
        orderBy: { createdAt: "desc" },
        select: { body: true, senderType: true, createdAt: true },
      }),
      prisma.supportConversationMessage.count({
        where: {
          conversationId: conversation.id,
          senderType: "client",
          deletedAt: null,
          ...(conversation.supportLastReadAt
            ? { createdAt: { gt: conversation.supportLastReadAt } }
            : {}),
        },
      }),
    ]);
    return { ...conversation, opener, latestMessage, unreadCount: unread };
  }));

  const filtered = q
    ? enriched.filter((conversation) =>
        conversation.subject.toLowerCase().includes(q) ||
        conversation.opener?.email?.toLowerCase().includes(q) ||
        conversation.latestMessage?.body?.toLowerCase().includes(q)
      )
    : enriched;

  return NextResponse.json(
    { conversations: filtered },
    { headers: { "Cache-Control": "private, no-store, max-age=0" } }
  );
}
