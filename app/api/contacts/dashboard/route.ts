import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { contactSchema } from "@/lib/validations";
import { AccountStateService } from "@/domains/accounts/services/account-state.service";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const userId = session.user.id;
  const state = await AccountStateService.getAccountState(userId);
  const user = await prisma.user.findUnique({ where: { id: userId }, include: { profile: true } });
  
  if (!user?.profile) return NextResponse.json({ contacts: [], isServiceActive: !state.isExpired });

  const profileContact = await prisma.profileContact.findMany({
    where: { profileId: user.profile.id },
    include: { contact: true },
    orderBy: { priorityOrder: "asc" },
  });

  const isActive = !state.isExpired && state.serviceStatus === "active";

  const mapped = profileContact.map(pc => ({
    id: pc.contact.id, // Return contact ID for backwards compatibility
    profileContactId: pc.id,
    fullName: pc.contact.fullName,
    phone: pc.contact.phone,
    email: pc.contact.email,
    profileId: pc.profileId,
    relationship: pc.relationship,
    priorityOrder: pc.priorityOrder,
    notifySms: pc.notifySms,
    notifyEmail: pc.notifyEmail,
    notifyWhatsapp: pc.notifyWhatsapp,
    active: pc.active,
  }));

  return NextResponse.json({ contacts: mapped, isServiceActive: isActive });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const userId = session.user.id;
  const user = await prisma.user.findUnique({ where: { id: userId }, include: { profile: true } });
  if (!user?.profile) {
    return NextResponse.json({ error: "Crea tu perfil médico primero" }, { status: 400 });
  }

  const raw = await req.json();
  const { global, ...rest } = raw;
  const validation = contactSchema.safeParse(rest);
  if (!validation.success) {
    return NextResponse.json({ error: validation.error.issues[0].message }, { status: 400 });
  }
  const { fullName, relationship, phone, email, priorityOrder, notifySms, notifyEmail, notifyWhatsapp } = validation.data;

  const newcontact = await prisma.contact.create({
    data: {
      userId,
      fullName,
      phone,
      email: email || null,
      relationship,
      notifyEmail,
      notifySms,
      notifyWhatsapp
    },
  });

  const profilesToLink = global && user.accountId 
    ? await prisma.profile.findMany({ where: { accountId: user.accountId } })
    : [user.profile];

  for (const p of profilesToLink) {
    if (!p) continue;
    await prisma.profileContact.create({
      data: {
        profileId: p.id,
        contactId: newcontact.id,
        relationship,
        priorityOrder: priorityOrder ?? 1,
        notifySms: notifySms ?? false,
        notifyEmail: notifyEmail ?? true,
        notifyWhatsapp: notifyWhatsapp ?? false,
      }
    });
  }

  const mapped = {
    id: newcontact.id,
    fullName: newcontact.fullName,
    phone: newcontact.phone,
    email: newcontact.email,
    profileId: global ? null : user.profile.id,
    relationship,
    priorityOrder: priorityOrder ?? 1,
    notifySms: notifySms ?? false,
    notifyEmail: notifyEmail ?? true,
    notifyWhatsapp: notifyWhatsapp ?? false,
    active: true,
  };

  await prisma.auditLog.create({
    data: {
      actorUserId: userId,
      accountId: user.accountId || null,
      entityType: "contact",
      entityId: newcontact.id,
      action: "create",
      newValuesJson: JSON.stringify({ fullName, relationship, phone, global }),
    },
  });

  await AccountStateService.invalidateCache(userId);

  return NextResponse.json({ contact: mapped }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const userId = session.user.id;
  const user = await prisma.user.findUnique({ where: { id: userId }, include: { profile: true } });
  if (!user || !user.profile) {
    return NextResponse.json({ error: "Perfil médico no encontrado" }, { status: 400 });
  }

  const body = await req.json();
  const { id } = body;
  if (!id) return NextResponse.json({ error: "ID requerido" }, { status: 400 });

  const validation = contactSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json({ error: validation.error.issues[0].message }, { status: 400 });
  }
  const { fullName, phone, email, relationship, notifyEmail, notifySms, notifyWhatsapp } = validation.data;

  const contact = await prisma.contact.findFirst({
    where: { id, userId },
  });

  if (!contact) {
    return NextResponse.json({ error: "Contacto no encontrado" }, { status: 404 });
  }

  await prisma.contact.update({
    where: { id },
    data: { 
      fullName, 
      phone, 
      email,
      relationship,
      notifyEmail,
      notifySms,
      notifyWhatsapp
    }
  });

  // BI-DIRECTIONAL SYNC
  await prisma.profileContact.updateMany({
    where: { contactId: id },
    data: {
      relationship: relationship || undefined,
      notifyEmail: notifyEmail !== undefined ? notifyEmail : undefined,
      notifySms: notifySms !== undefined ? notifySms : undefined,
      notifyWhatsapp: notifyWhatsapp !== undefined ? notifyWhatsapp : undefined,
    }
  });

  const profileContact = await prisma.profileContact.findFirst({
    where: { contactId: id, profileId: user.profile.id },
    include: { contact: true }
  });

  const mapped = profileContact ? {
    id: profileContact.contact.id,
    profileContactId: profileContact.id,
    fullName: profileContact.contact.fullName,
    phone: profileContact.contact.phone,
    email: profileContact.contact.email,
    profileId: profileContact.profileId,
    relationship: profileContact.relationship,
    priorityOrder: profileContact.priorityOrder,
    notifySms: profileContact.notifySms,
    notifyEmail: profileContact.notifyEmail,
    notifyWhatsapp: profileContact.notifyWhatsapp,
    active: profileContact.active,
  } : {
    id: contact.id,
    fullName: contact.fullName,
    phone: contact.phone,
    email: contact.email,
    relationship: contact.relationship,
    notifyEmail: contact.notifyEmail,
    notifySms: contact.notifySms,
    notifyWhatsapp: contact.notifyWhatsapp,
  };

  await prisma.auditLog.create({
    data: {
      actorUserId: userId,
      accountId: user.accountId || null,
      entityType: "contact",
      entityId: id,
      action: "update",
      oldValuesJson: JSON.stringify(contact),
      newValuesJson: JSON.stringify(body),
    },
  });

  await AccountStateService.invalidateCache(userId);

  return NextResponse.json({ contact: mapped });
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const userId = session.user.id;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
  }
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "ID requerido" }, { status: 400 });
  }

  const Contact = await prisma.contact.findFirst({
    where: { id, userId },
  });

  if (!Contact) {
    return NextResponse.json({ error: "Contacto no encontrado" }, { status: 404 });
  }

  await prisma.auditLog.create({
    data: {
      actorUserId: userId,
      accountId: user.accountId || null,
      entityType: "contact",
      entityId: id,
      action: "delete",
      oldValuesJson: JSON.stringify(Contact),
    },
  });

  await prisma.contact.delete({ where: { id } });

  await AccountStateService.invalidateCache(userId);

  return NextResponse.json({ message: "Contacto eliminado" });
}
