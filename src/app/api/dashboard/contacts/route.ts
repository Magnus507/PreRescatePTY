import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

async function isServiceActive(accountId: string | null) {
  if (!accountId) return true;
  const activeChips = await prisma.chip.findMany({
    where: { accountId, status: { in: ["activated", "suspended"] } },
    select: { serviceStatus: true, serviceEndDate: true },
  });
  if (activeChips.length === 0) return true; // No chips yet, allow creation
  
  return activeChips.some(c => 
    c.serviceStatus === "active" && (!c.serviceEndDate || c.serviceEndDate > new Date())
  );
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  const user = await prisma.user.findUnique({ where: { id: userId }, include: { profile: true } });
  
  if (!user?.profile) return NextResponse.json({ contacts: [] });

  const contacts = await prisma.emergencyContact.findMany({
    where: { profileId: user.profile.id },
    orderBy: { priorityOrder: "asc" },
  });

  const isServiceActiveChecked = await isServiceActive(user.accountId);

  // Fallback for non-migrated contacts
  if (contacts.length === 0) {
    const legacyContacts = await prisma.emergencyContact.findMany({
      where: { userId },
      orderBy: { priorityOrder: "asc" }
    });
    return NextResponse.json({ contacts: legacyContacts, isServiceActive: isServiceActiveChecked });
  }

  return NextResponse.json({ contacts, isServiceActive: isServiceActiveChecked });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  const user = await prisma.user.findUnique({ where: { id: userId }, include: { profile: true } });
  
  if (!user?.profile) {
    return NextResponse.json({ error: "Crea tu perfil médico primero" }, { status: 400 });
  }

  if (!(await isServiceActive(user.accountId))) {
    return NextResponse.json({ error: "Servicio expirado. Renueva para modificar contactos." }, { status: 403 });
  }

  const body = await req.json();

  const { fullName, relationship, phone, email, priorityOrder, notifySms, notifyEmail, notifyWhatsapp } = body;

  if (!fullName || !relationship || !phone) {
    return NextResponse.json(
      { error: "Nombre, parentesco y teléfono son requeridos" },
      { status: 400 }
    );
  }

  const contact = await prisma.emergencyContact.create({
    data: {
      userId,
      profileId: user.profile.id,
      fullName,
      relationship,
      phone,
      email: email || null,
      priorityOrder: priorityOrder || 1,
      notifySms: notifySms || false,
      notifyEmail: notifyEmail || true,
      notifyWhatsapp: notifyWhatsapp || false,
    },
  });

  await prisma.auditLog.create({
    data: {
      actorUserId: userId,
      accountId: user.accountId,
      entityType: "emergency_contact",
      entityId: contact.id,
      action: "create",
      newValuesJson: JSON.stringify({ fullName, relationship, phone }),
    },
  });

  return NextResponse.json({ contact }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  const user = await prisma.user.findUnique({ where: { id: userId }, include: { profile: true } });
  
  if (!(await isServiceActive(user?.accountId || null))) {
    return NextResponse.json({ error: "Servicio expirado. Renueva para modificar contactos." }, { status: 403 });
  }

  const body = await req.json();
  const { id, ...data } = body;

  if (!id) {
    return NextResponse.json({ error: "ID requerido" }, { status: 400 });
  }

  const existing = await prisma.emergencyContact.findFirst({
    where: { 
      id, 
      OR: [
        { profileId: user?.profile?.id || "invalid" },
        { userId }
      ]
    },
  });

  if (!existing) {
    return NextResponse.json({ error: "Contacto no encontrado" }, { status: 404 });
  }

  const contact = await prisma.emergencyContact.update({
    where: { id },
    data,
  });

  return NextResponse.json({ contact });
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  const user = await prisma.user.findUnique({ where: { id: userId }, include: { profile: true } });

  if (!(await isServiceActive(user?.accountId || null))) {
    return NextResponse.json({ error: "Servicio expirado. Renueva para modificar contactos." }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "ID requerido" }, { status: 400 });
  }

  const existing = await prisma.emergencyContact.findFirst({
    where: { 
      id, 
      OR: [
        { profileId: user?.profile?.id || "invalid" },
        { userId }
      ]
    },
  });

  if (!existing) {
    return NextResponse.json({ error: "Contacto no encontrado" }, { status: 404 });
  }

  await prisma.emergencyContact.delete({ where: { id } });

  return NextResponse.json({ message: "Contacto eliminado" });
}
