import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AccountStateService } from "@/domains/accounts/services/account-state.service";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  const { profileId, contactId, action } = await req.json();

  if (!profileId || !contactId || !action) {
    return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
  }

  // Verify profile belongs to account
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { accountId: true }
  });

  const profile = await prisma.profile.findFirst({
    where: { id: profileId, accountId: user?.accountId }
  });

  if (!profile) {
    return NextResponse.json({ error: "Perfil no encontrado" }, { status: 404 });
  }

  if (action === "link") {
    // Check count
    const count = await prisma.profileContact.count({ where: { profileId } });
    if (count >= 3) {
      return NextResponse.json({ error: "Límite de 3 contactos alcanzado" }, { status: 400 });
    }

    const pc = await prisma.profileContact.upsert({
      where: { profileId_contactId: { profileId, contactId } },
      update: { active: true },
      create: { 
        profileId, 
        contactId, 
        relationship: "Familiar", // Default
        priorityOrder: count + 1 
      }
    });

    await AccountStateService.invalidateCache(userId);
    return NextResponse.json({ success: true, pc });
  } else if (action === "unlink") {
    await prisma.profileContact.delete({
      where: { profileId_contactId: { profileId, contactId } }
    });
    
    await AccountStateService.invalidateCache(userId);
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Acción no válida" }, { status: 400 });
}

// PATCH: Update specific link properties (relationship, priorities)
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "401" }, { status: 401 });

  const userId = (session.user as { id: string }).id;
  const { profileId, contactId, ...data } = await req.json();

  const pc = await prisma.profileContact.update({
    where: { profileId_contactId: { profileId, contactId } },
    data
  });

  await AccountStateService.invalidateCache(userId);
  return NextResponse.json({ success: true, pc });
}
