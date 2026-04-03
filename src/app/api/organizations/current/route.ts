import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session || !(session.user as any).accountId) {
    return NextResponse.json({ error: "No autorizado o sin cuenta vinculada" }, { status: 401 });
  }

  const accountId = (session.user as any).accountId;

  try {
    // 1. Fetch Organization and its associated Account limits
    const organization = await prisma.organization.findFirst({
      where: { accountId },
      include: {
        account: {
          include: {
            package: true
          }
        }
      }
    });

    if (!organization) {
      return NextResponse.json({ error: "Organización no encontrada" }, { status: 404 });
    }

    // 2. Fetch Members (all users linked to this account)
    const members = await prisma.user.findMany({
      where: { accountId },
      include: {
        profile: {
          include: {
            assignedChips: true
          }
        }
      },
      orderBy: { createdAt: "asc" }
    });

    // 3. Fetch Chips assigned to this account
    const chips = await prisma.chip.findMany({
      where: { accountId },
      orderBy: { createdAt: "desc" }
    });

    return NextResponse.json({
      organization,
      members,
      chips,
      stats: {
        totalMembers: members.length,
        totalChips: chips.length,
        chipsActivated: chips.filter(c => c.status === "activated").length,
        chipsInventory: chips.filter(c => c.status === "inventory").length,
      }
    });
  } catch (error) {
    console.error("Error fetching organization data:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
