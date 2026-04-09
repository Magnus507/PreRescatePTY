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
    const organization = await prisma.organization.findFirst({
      where: { accountId },
      include: {
        account: {
          include: {
            package: true,
          },
        },
      },
    });

    if (!organization) {
      return NextResponse.json({ error: "Organización no encontrada" }, { status: 404 });
    }

    // Fetch members with profile + org member data (department, position)
    const users = await prisma.user.findMany({
      where: { accountId },
      include: {
        profile: {
          include: {
            assignedChips: {
              select: { id: true, shortCode: true, serialPublic: true, status: true },
            },
            organizationMembers: {
              where: { organizationId: organization.id },
              select: { department: true, position: true, memberStatus: true, internalCode: true },
            },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    // Flatten org member data to the top level for easier access in the UI
    const members = users.map((u) => {
      const orgMember = u.profile?.organizationMembers?.[0];
      return {
        ...u,
        department: orgMember?.department ?? null,
        position: orgMember?.position ?? null,
        memberStatus: orgMember?.memberStatus ?? "active",
        internalCode: orgMember?.internalCode ?? null,
      };
    });

    const chips = await prisma.chip.findMany({
      where: { accountId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      organization,
      members,
      chips,
      stats: {
        totalMembers: members.length,
        totalChips: chips.length,
        chipsActivated: chips.filter((c) => c.status === "activated").length,
        chipsInventory: chips.filter((c) => c.status === "inventory").length,
      },
    });
  } catch (error) {
    console.error("Error fetching organization data:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
