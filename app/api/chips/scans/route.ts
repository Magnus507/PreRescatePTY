import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;

  // Get user's chips
  const chips = await prisma.chip.findMany({
    where: { ownerUserId: userId },
    select: { id: true },
  });

  const chipIds = chips.map((c: any) => c.id);

  // Get scan events for user's chips
  const scans = await prisma.scanEvent.findMany({
    where: { chipId: { in: chipIds } },
    orderBy: { scannedAt: "desc" },
    take: 50,
    include: {
      chip: {
        select: { shortCode: true, serialPublic: true, chipAlias: true },
      },
    },
  });

  // Manual Enrichment: Fetch notifications for these scans since the relation is not in schema
  const scanIds = scans.map(s => s.id);
  const notifications = await prisma.notification.findMany({
    where: { eventId: { in: scanIds } },
    select: { eventId: true, channel: true, recipient: true, status: true, sentAt: true }
  });

  const enrichedScans = scans.map(scan => ({
    ...scan,
    notifications: notifications.filter(n => n.eventId === scan.id)
  }));

  return NextResponse.json({ scans: enrichedScans });
}
