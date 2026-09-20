import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { GENERAL_ADMIN_ROLES, requireRole } from "@/lib/rbac";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

export async function GET(req: NextRequest) {
  const auth = await requireRole(GENERAL_ADMIN_ROLES);
  if (!auth.authorized) return auth.response;

  const url = new URL(req.url);
  const q = (url.searchParams.get("q") || "").trim().slice(0, 200);
  const state = url.searchParams.get("state") || "open";

  const where = {
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" as const } },
            { email: { contains: q, mode: "insensitive" as const } },
            { whatsappPhone: { contains: q } },
            { message: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
    ...(state === "unread" ? { readAt: null, resolvedAt: null } : {}),
    ...(state === "read" ? { readAt: { not: null }, resolvedAt: null } : {}),
    ...(state === "resolved" ? { resolvedAt: { not: null } } : {}),
    ...(state === "open" ? { resolvedAt: null } : {}),
  };

  const [messages, total, unread, open, resolved] = await Promise.all([
    prisma.supportMessage.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE,
      select: {
        id: true,
        name: true,
        email: true,
        whatsappPhone: true,
        message: true,
        readAt: true,
        readByUserId: true,
        resolvedAt: true,
        resolvedByUserId: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.supportMessage.count({ where }),
    prisma.supportMessage.count({ where: { readAt: null, resolvedAt: null } }),
    prisma.supportMessage.count({ where: { resolvedAt: null } }),
    prisma.supportMessage.count({ where: { resolvedAt: { not: null } } }),
  ]);

  return NextResponse.json({
    messages,
    total,
    counts: { unread, open, resolved },
    limit: PAGE_SIZE,
  }, { headers: { "Cache-Control": "no-store" } });
}
