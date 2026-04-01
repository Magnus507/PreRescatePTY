import { NextRequest, NextResponse } from "next/server";
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

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ chipId: string }> }
) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { chipId } = await params;

  const chip = await prisma.chip.findUnique({
    where: { id: chipId },
    include: {
      owner: {
        select: { email: true, phone: true, createdAt: true },
      },
      assignedProfile: {
        select: {
          firstName: true,
          lastName: true,
          bloodType: true,
          allergies: true,
          chronicConditions: true,
          medications: true,
          additionalNotes: true,
          emergencyContacts: {
            where: { active: true },
            orderBy: { priorityOrder: "asc" },
            select: {
              fullName: true,
              relationship: true,
              phone: true,
              email: true,
            },
          },
        },
      },
      claimTokens: {
        select: { activationCode: true, usedAt: true, expiresAt: true },
      },
      scanEvents: {
        orderBy: { scannedAt: "desc" },
        take: 10,
        select: {
          id: true,
          scannedAt: true,
          sourceType: true,
          ipAddress: true,
          city: true,
          country: true,
          notificationStatus: true,
        },
      },
      _count: {
        select: { scanEvents: true, notifications: true },
      },
    },
  });

  if (!chip) {
    return NextResponse.json({ error: "Chip no encontrado" }, { status: 404 });
  }

  return NextResponse.json({ chip });
}
