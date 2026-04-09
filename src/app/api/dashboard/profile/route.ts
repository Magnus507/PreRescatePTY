import { NextRequest, NextResponse } from "next/server";
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

  const profile = await prisma.profile.findUnique({
    where: { userId },
  });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      email: true,
      phone: true,
      role: true,
      accountId: true,
      account: {
        select: {
          accountType: true,
          package: { select: { name: true } },
          organizations: { select: { legalName: true } }
        }
      }
    },
  });

  let isServiceActive = true;
  if (user?.accountId) {
    const activeChips = await prisma.chip.findMany({
      where: { accountId: user.accountId, status: { in: ["activated", "suspended"] } },
      select: { serviceStatus: true, serviceEndDate: true },
    });
    // If they have chips, check if at least one is active. If 0 chips, they just haven't bought yet, so allow edits.
    if (activeChips.length > 0) {
      isServiceActive = activeChips.some(c => 
        c.serviceStatus === "active" && (!c.serviceEndDate || c.serviceEndDate > new Date())
      );
    }
  }

  return NextResponse.json({ profile, user, isServiceActive });
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  const body = await req.json();

  const {
    firstName, lastName, displayNamePublic, birthDate, sex,
    bloodType, allergies, chronicConditions, medications,
    additionalNotes, profileVisibilityStatus,
  } = body;

  try {
    const userForCheck = await prisma.user.findUnique({ where: { id: userId }, select: { accountId: true } });
    if (userForCheck?.accountId) {
      const activeChips = await prisma.chip.findMany({
        where: { accountId: userForCheck.accountId, status: { in: ["activated", "suspended"] } },
        select: { serviceStatus: true, serviceEndDate: true },
      });
      if (activeChips.length > 0) {
        const hasActiveService = activeChips.some(c => 
          c.serviceStatus === "active" && 
          (!c.serviceEndDate || c.serviceEndDate > new Date())
        );
        if (!hasActiveService) {
          return NextResponse.json({ error: "Servicio expirado. Renueva para editar tu perfil." }, { status: 403 });
        }
      }
    }
    // Get old values for audit
    const oldProfile = await prisma.profile.findUnique({ where: { userId } });

    const profile = await prisma.profile.upsert({
      where: { userId },
      update: {
        firstName, lastName, displayNamePublic, birthDate, sex,
        bloodType, allergies, chronicConditions, medications,
        additionalNotes, profileVisibilityStatus,
      },
      create: {
        userId,
        firstName: firstName || "",
        lastName: lastName || "",
        displayNamePublic,
        birthDate,
        sex,
        bloodType: bloodType || "O+",
        allergies: allergies || "",
        chronicConditions: chronicConditions || "",
        medications: medications || "",
        additionalNotes: additionalNotes || "",
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        actorUserId: userId,
        entityType: "profile",
        entityId: profile.id,
        action: oldProfile ? "update" : "create",
        oldValuesJson: oldProfile ? JSON.stringify(oldProfile) : null,
        newValuesJson: JSON.stringify(body),
      },
    });

    return NextResponse.json({ profile });
  } catch (error) {
    console.error("Profile update error:", error);
    return NextResponse.json(
      { error: "Error al actualizar perfil" },
      { status: 500 }
    );
  }
}
