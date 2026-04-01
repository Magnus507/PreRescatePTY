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

  const chipIds = chips.map((c) => c.id);

  // Get scan events for user's chips
  const scans = await prisma.scanEvent.findMany({
    where: { chipId: { in: chipIds } },
    orderBy: { scannedAt: "desc" },
    take: 50,
    include: {
      chip: {
        select: { shortCode: true, serialPublic: true },
      },
    },
  });

  return NextResponse.json({ scans });
}
