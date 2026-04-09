import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET: all profiles in the account (own profile + family profiles)
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { accountId: true },
  });

  if (!user?.accountId) {
    return NextResponse.json({ ownProfile: null, familyProfiles: [] });
  }

  const allProfiles = await prisma.profile.findMany({
    where: { accountId: user.accountId },
    include: {
      assignedChips: {
        where: { status: { not: "inventory" } },
        select: { id: true, serialPublic: true, shortCode: true, status: true, serviceStatus: true },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const ownProfile = allProfiles.find((p) => p.userId === userId) ?? null;
  const familyProfiles = allProfiles.filter((p) => p.userId !== userId);

  return NextResponse.json({ ownProfile, familyProfiles });
}

// POST: create a new family profile (userId=null, linked only to account)
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { accountId: true, account: { select: { maxChipsAllocated: true } } },
  });

  if (!user?.accountId) {
    return NextResponse.json({ error: "Cuenta no configurada" }, { status: 400 });
  }

  const body = await req.json();
  const { firstName, lastName, displayNamePublic, birthDate, sex, bloodType } = body;

  if (!firstName || !lastName || !bloodType) {
    return NextResponse.json({ error: "Nombre, apellido y tipo de sangre son requeridos" }, { status: 400 });
  }

  const profile = await prisma.profile.create({
    data: {
      accountId: user.accountId,
      userId: null,
      firstName,
      lastName,
      displayNamePublic: displayNamePublic || null,
      birthDate: birthDate || null,
      sex: sex || null,
      bloodType,
      allergies: "",
      chronicConditions: "",
      medications: "",
      additionalNotes: "",
    },
  });

  await prisma.auditLog.create({
    data: {
      actorUserId: userId,
      accountId: user.accountId,
      entityType: "profile",
      entityId: profile.id,
      action: "create_family_profile",
      newValuesJson: JSON.stringify({ firstName, lastName, bloodType }),
    },
  });

  return NextResponse.json({ profile }, { status: 201 });
}
