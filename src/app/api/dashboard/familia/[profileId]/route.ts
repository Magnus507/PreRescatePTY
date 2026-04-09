import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

async function getAuthorizedProfile(userId: string, profileId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { accountId: true },
  });
  if (!user?.accountId) return null;

  const profile = await prisma.profile.findFirst({
    where: { id: profileId, accountId: user.accountId },
  });
  return profile;
}

// GET: fetch a single family profile
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ profileId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  const { profileId } = await params;

  const profile = await getAuthorizedProfile(userId, profileId);
  if (!profile) {
    return NextResponse.json({ error: "Perfil no encontrado" }, { status: 404 });
  }

  return NextResponse.json({ profile });
}

// PATCH: update a family profile's medical data
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ profileId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  const { profileId } = await params;

  const existing = await getAuthorizedProfile(userId, profileId);
  if (!existing) {
    return NextResponse.json({ error: "Perfil no encontrado" }, { status: 404 });
  }

  const body = await req.json();
  const {
    firstName, lastName, displayNamePublic, birthDate, sex,
    bloodType, allergies, chronicConditions, medications, additionalNotes,
  } = body;

  const updated = await prisma.profile.update({
    where: { id: profileId },
    data: {
      ...(firstName !== undefined && { firstName }),
      ...(lastName !== undefined && { lastName }),
      ...(displayNamePublic !== undefined && { displayNamePublic }),
      ...(birthDate !== undefined && { birthDate }),
      ...(sex !== undefined && { sex }),
      ...(bloodType !== undefined && { bloodType }),
      ...(allergies !== undefined && { allergies }),
      ...(chronicConditions !== undefined && { chronicConditions }),
      ...(medications !== undefined && { medications }),
      ...(additionalNotes !== undefined && { additionalNotes }),
    },
  });

  await prisma.auditLog.create({
    data: {
      actorUserId: userId,
      accountId: existing.accountId,
      entityType: "profile",
      entityId: profileId,
      action: "update_family_profile",
      oldValuesJson: JSON.stringify(existing),
      newValuesJson: JSON.stringify(body),
    },
  });

  return NextResponse.json({ profile: updated });
}

// DELETE: remove a family profile (only if no chips assigned)
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ profileId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  const { profileId } = await params;

  const existing = await getAuthorizedProfile(userId, profileId);
  if (!existing) {
    return NextResponse.json({ error: "Perfil no encontrado" }, { status: 404 });
  }

  // Cannot delete own profile
  if (existing.userId === userId) {
    return NextResponse.json({ error: "No puedes eliminar tu propio perfil" }, { status: 400 });
  }

  // Cannot delete if chips are assigned
  const chipCount = await prisma.chip.count({
    where: { assignedProfileId: profileId, status: { not: "inventory" } },
  });
  if (chipCount > 0) {
    return NextResponse.json(
      { error: "Desasigna los chips antes de eliminar este perfil" },
      { status: 400 }
    );
  }

  await prisma.profile.delete({ where: { id: profileId } });

  return NextResponse.json({ message: "Perfil eliminado" });
}
