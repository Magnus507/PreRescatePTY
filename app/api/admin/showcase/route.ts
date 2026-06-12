import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ConfigRepository } from "@/domains/shared/repositories/config.repository";
import { requireRole, GENERAL_ADMIN_ROLES } from "@/lib/rbac";

export async function GET() {
  const auth = await requireRole(GENERAL_ADMIN_ROLES);
  if (!auth.authorized) return auth.response;

  try {
    const user = await prisma.user.findFirst({
      where: { email: "admin@prerescatepty.com" },
      include: { 
        profile: {
          include: { contacts: { include: { contact: true } } }
        }
      }
    });

    if (!user) return NextResponse.json({ error: "Admin no encontrado" }, { status: 404 });

    // 1. Get official shortCode from config
    let shortCode = await ConfigRepository.get("demo_profile_shortcode");

    // 2. Ensure profile exists
    let profile = user.profile;
    if (!profile) {
      profile = await prisma.profile.create({
        data: {
          userId: user.id,
          firstName: "Admin",
          lastName: "Supremo",
          bloodType: "O+",
          allergies: "Ninguna",
          chronicConditions: "Ninguna",
          medications: "Ninguna",
          additionalNotes: "Perfil oficial de demostración administrativa."
        },
        include: { contacts: { include: { contact: true } } }
      });
    }

    // 3. Find if the chip exists and is assigned
    let chip = null;
    if (shortCode) {
      chip = await prisma.chip.findUnique({ where: { shortCode } });
    }

    // Fallback if not configured or not found
    if (!chip) {
      chip = await prisma.chip.findFirst({ where: { ownerUserId: user.id } });
      if (chip) {
        shortCode = chip.shortCode;
        await ConfigRepository.set("demo_profile_shortcode", shortCode);
      }
    }

    return NextResponse.json({ profile, chip });
  } catch (error) {
    console.error("Showcase API Error:", error);
    return NextResponse.json({ error: "Error en el servidor" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const auth = await requireRole(GENERAL_ADMIN_ROLES);
  if (!auth.authorized) return auth.response;

  const body = await req.json();

  try {
    const user = await prisma.user.findUnique({
      where: { email: "admin@prerescatepty.com" },
      include: { profile: true }
    });

    if (!user || !user.profile) return NextResponse.json({ error: "Perfil no encontrado" }, { status: 404 });

    // Update Profile
    await prisma.profile.update({
      where: { id: user.profile.id },
      data: {
        firstName: body.firstName,
        lastName: body.lastName,
        bloodType: body.bloodType,
        allergies: body.allergies,
        chronicConditions: body.chronicConditions,
        medications: body.medications,
        additionalNotes: body.additionalNotes,
        photoUrl: body.photoUrl,
        phone: body.phone,
        sex: body.sex
      }
    });

    // Handle Contacts - Intelligent update
    if (body.contacts && Array.isArray(body.contacts)) {
        // 1. Clear current links for this profile
        await prisma.profileContact.deleteMany({ where: { profileId: user.profile.id } });

        // 2. Process each contact
        for (const c of body.contacts) {
            let contactId = c.id;

            // Update if ID exists, else try to find by phone+name to avoid duplication, else create
            if (contactId) {
                await prisma.contact.update({
                    where: { id: contactId },
                    data: {
                        fullName: c.fullName,
                        phone: c.phone,
                        relationship: c.relationship
                    }
                });
            } else {
                // Try to find an existing contact for this user with same phone to reuse
                const existing = await prisma.contact.findFirst({
                    where: { userId: user.id, phone: c.phone }
                });

                if (existing) {
                    contactId = existing.id;
                    await prisma.contact.update({
                        where: { id: contactId },
                        data: { fullName: c.fullName, relationship: c.relationship }
                    });
                } else {
                    const created = await prisma.contact.create({
                        data: {
                            fullName: c.fullName,
                            phone: c.phone,
                            relationship: c.relationship,
                            userId: user.id
                        }
                    });
                    contactId = created.id;
                }
            }

            // 3. Link it back
            await prisma.profileContact.create({
                data: {
                    profileId: user.profile.id,
                    contactId: contactId,
                    relationship: c.relationship
                }
            });
        }
    }

    // Return the fresh profile with contacts
    const finalProfile = await prisma.profile.findUnique({
        where: { id: user.profile.id },
        include: { contacts: { include: { contact: true } } }
    });

    return NextResponse.json({ profile: finalProfile });
  } catch (error) {
    console.error("Showcase Patch Error:", error);
    return NextResponse.json({ error: "Error al actualizar" }, { status: 500 });
  }
}
