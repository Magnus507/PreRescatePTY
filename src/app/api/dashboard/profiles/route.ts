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
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { accountId: true },
  });

  if (!user?.accountId) {
    return NextResponse.json({ profiles: [] });
  }

  const profiles = await prisma.profile.findMany({
    where: { accountId: user.accountId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      userId: true,
      bloodType: true,
      photoUrl: true,
      assignedChips: {
        select: { id: true, shortCode: true, chipAlias: true },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ profiles });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      accountId: true,
      account: { select: { maxChipsAllocated: true } },
    },
  });

  if (!user?.accountId) {
    return NextResponse.json({ error: "Cuenta no configurada" }, { status: 400 });
  }

  const existingCount = await prisma.profile.count({
    where: { accountId: user.accountId },
  });

  const limit = user.account?.maxChipsAllocated ?? 1;
  if (existingCount >= limit) {
    return NextResponse.json(
      { error: `Límite de ${limit} perfil(es) alcanzado para tu plan actual` },
      { status: 400 }
    );
  }

  const { firstName, lastName, bloodType, relationship } = await req.json();

  if (!firstName?.trim() || !lastName?.trim()) {
    return NextResponse.json({ error: "Nombre y apellido son requeridos" }, { status: 400 });
  }

  const profile = await prisma.profile.create({
    data: {
      accountId: user.accountId,
      userId: null,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      bloodType: bloodType || "O+",
      additionalNotes: relationship ? `Familiar: ${relationship}` : "",
    },
  });

  return NextResponse.json({ profile }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  const { profileId } = await req.json();

  if (!profileId) {
    return NextResponse.json({ error: "profileId requerido" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { accountId: true },
  });

  if (!user?.accountId) {
    return NextResponse.json({ error: "Cuenta no configurada" }, { status: 400 });
  }

  // Only allow deleting profiles without a userId (non-login family members)
  const profile = await prisma.profile.findFirst({
    where: { id: profileId, accountId: user.accountId, userId: null },
  });

  if (!profile) {
    return NextResponse.json(
      { error: "Perfil no encontrado o no se puede eliminar (perfiles de usuario no son eliminables aquí)" },
      { status: 404 }
    );
  }

  // Unassign any chips first
  await prisma.chip.updateMany({
    where: { assignedProfileId: profileId },
    data: { assignedProfileId: null },
  });

  await prisma.profile.delete({ where: { id: profileId } });

  return NextResponse.json({ message: "Perfil familiar eliminado" });
}
