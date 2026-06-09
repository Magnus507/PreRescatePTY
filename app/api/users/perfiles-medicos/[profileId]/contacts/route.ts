import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { contactSchema } from "@/lib/validations";

export const dynamic = "force-dynamic";

async function getAuthorizedProfile(userId: string, profileId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { accountId: true },
  });
  if (!user?.accountId) return null;

  // Either way it must belong to the same account
  const profile = await prisma.profile.findFirst({
    where: { id: profileId, accountId: user.accountId },
  });
  return profile;
}

// GET: list emergency contacts for a family profile
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ profileId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const userId = session.user.id;
  const { profileId } = await params;

  const profile = await getAuthorizedProfile(userId, profileId);
  if (!profile) {
    return NextResponse.json({ error: "Perfil no encontrado" }, { status: 404 });
  }

  const profileContact = await prisma.profileContact.findMany({
    where: { profileId },
    include: { contact: true },
    orderBy: { priorityOrder: "asc" },
  });

  const mapped = profileContact.map(pc => ({
    id: pc.contact.id,
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

  return NextResponse.json({ contacts: mapped });
}

// POST: add or link a contact to a family profile
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ profileId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const userId = session.user.id;
  const { profileId } = await params;

  const profile = await getAuthorizedProfile(userId, profileId);
  if (!profile) {
    return NextResponse.json({ error: "Perfil no encontrado" }, { status: 404 });
  }

  const raw = await req.json();
  const { contactId } = raw;

  // 1. Validation Logic
  let validatedData: Record<string, unknown> = {};
  if (!contactId) {
    // Creating a brand new contact requires validation
    const validation = contactSchema.safeParse(raw);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error.issues[0].message }, { status: 400 });
    }
    validatedData = validation.data as Record<string, unknown>;
  } else {
    // Linking existing: optional overrides if provided in body, else use defaults
    validatedData = raw;
  }

  // 2. Destructure the "9" key fields (standardized across the app)
  const { 
    fullName, 
    relationship, 
    phone, 
    email, 
    priorityOrder, 
    notifySms, 
    notifyEmail, 
    notifyWhatsapp,
    active = true 
  } = validatedData as { 
    fullName?: string; 
    relationship?: string; 
    phone?: string; 
    email?: string; 
    priorityOrder?: number; 
    notifySms?: boolean; 
    notifyEmail?: boolean; 
    notifyWhatsapp?: boolean;
    active?: boolean;
  };

  // Check 3 contact limit per profile (only for new links)
  const currentCount = await prisma.profileContact.count({ where: { profileId } });
  const existingLink = contactId ? await prisma.profileContact.findUnique({
    where: { profileId_contactId: { profileId, contactId } }
  }) : null;

  if (currentCount >= 3 && !existingLink && !contactId) {
     return NextResponse.json({ error: "Límite de 3 contactos alcanzado para este perfil." }, { status: 400 });
  }

  let finalContactId = contactId;

  if (!contactId) {
    // Create new global contact record
    const newContact = await prisma.contact.create({
      data: {
        userId,
        fullName: fullName || "Nuevo Contacto",
        phone: phone || "",
        email: email || null,
        relationship: relationship || "Familiar",
        notifySms: notifySms ?? false,
        notifyEmail: notifyEmail ?? true,
        notifyWhatsapp: notifyWhatsapp ?? false,
      },
    });
    finalContactId = newContact.id;
  }

  // Fetch base contact info to preserve defaults
  const contactBase = await prisma.contact.findUnique({
    where: { id: finalContactId }
  });

  // 3. UPSERT: Connect Profile to Contact without deleting the Contact itself
  const profileContact = await prisma.profileContact.upsert({
    where: { 
      profileId_contactId: { 
        profileId, 
        contactId: finalContactId 
      } 
    },
    update: { 
      relationship: relationship || contactBase?.relationship || "Familiar",
      notifySms: (notifySms !== undefined) ? notifySms : (contactBase?.notifySms ?? false),
      notifyEmail: (notifyEmail !== undefined) ? notifyEmail : (contactBase?.notifyEmail ?? true),
      notifyWhatsapp: (notifyWhatsapp !== undefined) ? notifyWhatsapp : (contactBase?.notifyWhatsapp ?? false),
      priorityOrder: priorityOrder ?? undefined,
      active: active ?? true 
    },
    create: {
      profileId,
      contactId: finalContactId,
      relationship: relationship || contactBase?.relationship || "Familiar",
      priorityOrder: priorityOrder ?? (currentCount + 1),
      notifySms: (notifySms !== undefined) ? notifySms : (contactBase?.notifySms ?? false),
      notifyEmail: (notifyEmail !== undefined) ? notifyEmail : (contactBase?.notifyEmail ?? true),
      notifyWhatsapp: (notifyWhatsapp !== undefined) ? notifyWhatsapp : (contactBase?.notifyWhatsapp ?? false),
      active: active ?? true
    },
    include: { contact: true }
  });

  const mapped = {
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
  };

  await prisma.auditLog.create({
    data: {
      actorUserId: userId,
      accountId: profile?.accountId || null,
      entityType: "profileContact",
      entityId: profileContact.id,
      action: "link_guardian",
      newValuesJson: JSON.stringify(mapped),
    },
  });

  return NextResponse.json({ contact: mapped }, { status: 201 });
}

// DELETE: De-associate a guardian from a profile (preserve Contact in pool for other profiles)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ profileId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const userId = session.user.id;
  const { profileId } = await params;

  const profile = await getAuthorizedProfile(userId, profileId);
  if (!profile) return NextResponse.json({ error: "Perfil no encontrado" }, { status: 404 });

  const { searchParams } = new URL(req.url);
  const contactId = searchParams.get("id");
  if (!contactId) return NextResponse.json({ error: "ID requerido" }, { status: 400 });

  const link = await prisma.profileContact.findFirst({
    where: { contactId, profileId },
  });
  
  if (!link) return NextResponse.json({ error: "Vínculo no encontrado" }, { status: 404 });

  // Delete only the ProfileContact link — preserve the Contact record
  // so it remains available for other profiles linked to the same contact.
  await prisma.profileContact.deleteMany({
    where: { profileId, contactId },
  });

  await prisma.auditLog.create({
    data: {
      actorUserId: userId,
      accountId: profile?.accountId || null,
      entityType: "profileContact",
      entityId: `${profileId}_${contactId}`,
      action: "unlink_guardian",
      oldValuesJson: JSON.stringify(link),
    },
  });

  return NextResponse.json({ message: "Guardian desvinculado del perfil" });
}

// PATCH: Update specific link preferences and contact info
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ profileId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const userId = session.user.id;
  const { profileId } = await params;

  const profile = await getAuthorizedProfile(userId, profileId);
  if (!profile) return NextResponse.json({ error: "Perfil no encontrado" }, { status: 404 });

  const rawBody = await req.json();
  const { id, ...rest } = rawBody; // here 'id' is the Contact ID

  if (!id) return NextResponse.json({ error: "ID de contacto requerido" }, { status: 400 });

  const validation = contactSchema.safeParse(rest);
  if (!validation.success) return NextResponse.json({ error: validation.error.issues[0].message }, { status: 400 });

  const { 
    fullName, phone, email, relationship, priorityOrder, 
    notifySms, notifyEmail, notifyWhatsapp 
  } = validation.data;

  // 1. Sync shared Contact info (Name, Phone, Email)
  await prisma.contact.update({
    where: { id },
    data: { fullName, phone, email }
  });

  // 2. Sync profile-specific info (Ficha)
  const pc = await prisma.profileContact.update({
    where: { 
      profileId_contactId: {
        profileId,
        contactId: id
      }
    },
    data: { 
      relationship, 
      priorityOrder: priorityOrder ?? undefined,
      notifySms, 
      notifyEmail, 
      notifyWhatsapp,
      active: true 
    },
    include: { contact: true }
  });

  const mapped = {
    id: pc.contact.id,
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
  };

  await prisma.auditLog.create({
    data: {
      actorUserId: userId,
      accountId: profile?.accountId || null,
      entityType: "profileContact",
      entityId: pc.id,
      action: "update_guardian_preferences",
      newValuesJson: JSON.stringify(mapped),
    },
  });

  return NextResponse.json({ contact: mapped });
}
