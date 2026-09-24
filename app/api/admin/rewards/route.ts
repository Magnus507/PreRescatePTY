import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { GENERAL_ADMIN_ROLES, requireRole } from "@/lib/rbac";
import {
  getCommunityMetricValue,
  refreshCommunityUnlocks,
} from "@/lib/rewards/service";
import {
  communityProgressPercent,
  type CommunityMetricType,
} from "@/lib/rewards/rules";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireRole(GENERAL_ADMIN_ROLES);
  if (!auth.authorized) return auth.response;

  await refreshCommunityUnlocks();

  const [missions, founders, community, drops] = await Promise.all([
    prisma.rewardMission.findMany({
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { completions: true } } },
    }),
    prisma.foundingMember.findMany({
      orderBy: { founderNumber: "asc" },
    }),
    prisma.communityUnlock.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        linkedDrop: {
          select: { id: true, title: true, status: true, prizeLabel: true },
        },
      },
    }),
    prisma.drop.findMany({
      where: { status: { in: ["draft", "active"] } },
      orderBy: { createdAt: "desc" },
      select: { id: true, title: true, status: true, prizeLabel: true },
    }),
  ]);

  const userIds = founders.map((row) => row.userId);
  const users = userIds.length
    ? await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, email: true },
      })
    : [];
  const emailById = new Map(users.map((user) => [user.id, user.email]));

  const communityWithProgress = [];
  for (const item of community) {
    const current = await getCommunityMetricValue(
      item.metricType as CommunityMetricType
    );
    communityWithProgress.push({
      ...item,
      current,
      progressPercent: communityProgressPercent(current, item.target),
    });
  }

  return NextResponse.json(
    {
      missions: missions.map((mission) => ({
        ...mission,
        completionCount: mission._count.completions,
        _count: undefined,
      })),
      founders: founders.map((founder) => ({
        ...founder,
        email: emailById.get(founder.userId) ?? "Usuario no disponible",
      })),
      community: communityWithProgress,
      drops,
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
