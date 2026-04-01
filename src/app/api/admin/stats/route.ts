import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

async function isAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return false;
  const role = (session.user as { role?: string }).role;
  return role === "admin" || role === "superadmin";
}

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const [
    totalUsers, totalChips, totalProfiles, totalScans, totalNotifications,
    activatedChips, inventoryChips, suspendedChips, soldChips,
    activeService, limitedService,
    recentScans,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.chip.count(),
    prisma.profile.count(),
    prisma.scanEvent.count(),
    prisma.notification.count(),
    prisma.chip.count({ where: { status: "activated" } }),
    prisma.chip.count({ where: { status: "inventory" } }),
    prisma.chip.count({ where: { status: "suspended" } }),
    prisma.chip.count({ where: { status: "sold" } }),
    prisma.chip.count({ where: { serviceStatus: "active", status: "activated" } }),
    prisma.chip.count({ where: { serviceStatus: "limited" } }),
    prisma.scanEvent.findMany({
      orderBy: { scannedAt: "desc" },
      take: 15,
      include: {
        chip: {
          select: { shortCode: true, serialPublic: true },
        },
      },
    }),
  ]);

  return NextResponse.json({
    stats: {
      totalUsers,
      totalChips,
      totalProfiles,
      totalScans,
      totalNotifications,
      chipsByStatus: {
        activated: activatedChips,
        inventory: inventoryChips,
        suspended: suspendedChips,
        sold: soldChips,
      },
      chipsByService: {
        active: activeService,
        limited: limitedService,
      },
    },
    recentScans,
  });
}
