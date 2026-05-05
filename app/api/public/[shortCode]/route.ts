import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { ConfigRepository } from "@/domains/shared/repositories/config.repository";
import { decrypt } from "@/lib/encryption";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ shortCode: string }> }
) {
  try {
    const { shortCode } = await params;

    // ----- FAST TRACK FOR DEMO PROFILES -----
    const isDemoCode = ["DEMO-ADMIN-VIP", "44R6DBNQ", "demo", "DEMO", "showcase"].includes(shortCode);
    if (isDemoCode) {
      const demoProfile = {
        firstName: "Carlos",
        lastName: "Rodriguez",
        displayName: "Carlos R. (VIP Admin)",
        sex: "M",
        age: 38,
        bloodType: "O+",
        allergies: "PENICILINA (CRÍTICO), Nueces",
        chronicConditions: "Hipertensión controlada",
        medications: "Lisinopril 10mg",
        additionalNotes: "Porta marcapasos medtronic (v.2024). Paramedicos: Acceder a historial via PreRescate Protocol.",
        photoUrl: "https://fikidmfquaxhlayxctsa.supabase.co/storage/v1/object/public/profile-photos/demo-admin.png",
        isVerifiedAdmin: true,
        emergencyContacts: [
          { fullName: "María de Rodriguez", relationship: "Esposa", phone: "+507 6612-3456" },
          { fullName: "Dr. Mendoza (Cardiólogo)", relationship: "Médico Cabecera", phone: "+507 6677-8899" }
        ],
      };
      return NextResponse.json({ profile: demoProfile });
    }

    const chip = await prisma.chip.findUnique({
      where: { shortCode },
      include: {
        assignedProfile: {
          include: {
            contacts: {
              where: { active: true },
              orderBy: { priorityOrder: "asc" },
              include: { contact: true }
            },
            organizationMembers: {
              where: { memberStatus: "active" },
              include: {
                organization: {
                  select: { legalName: true }
                }
              }
            }
          },
        },
      },
    });

    if (!chip) {
      return NextResponse.json(
        { error: "Código no encontrado en el sistema.", status: "not_found" },
        { status: 404 }
      );
    }

    if (chip.status !== "activated" || !chip.assignedProfile) {
      return NextResponse.json({ 
        status: "inactive",
        chip: {
          shortCode: chip.shortCode,
          serialPublic: chip.serialPublic,
          internalLabel: chip.internalLabel || chip.chipUidInternal,
          productType: chip.productType,
          batchId: chip.batchId
        }
      });
    }

    const profile = chip.assignedProfile;

    // Decrypt sensitive fields
    const decryptedAllergies = decrypt(profile.allergies || "");
    const decryptedConditions = decrypt(profile.chronicConditions || "");
    const decryptedBloodType = decrypt(profile.bloodType || "");
    const decryptedNote = decrypt(profile.additionalNotes || "");

    // Humanitarian Overwrite Logic
    const hasCriticalData = 
      (decryptedAllergies && !decryptedAllergies.toLowerCase().includes("no report")) ||
      (decryptedConditions && !decryptedConditions.toLowerCase().includes("no report")) ||
      (decryptedBloodType && decryptedBloodType !== "No reportado");

    const isServiceInactive = chip.serviceStatus === "expired" || chip.serviceStatus === "inactive";

    if (isServiceInactive && !hasCriticalData) {
      return NextResponse.json(
        { error: "Protocolo inactivo por falta de renovación.", status: "expired" },
        { status: 403 }
      );
    }

    if (profile.profileVisibilityStatus !== "active") {
      return NextResponse.json(
        { error: "Perfil desactivado temporalmente", status: "hidden" },
        { status: 403 }
      );
    }

    // Helper to calculate age
    const calculateAge = (birthDate: Date | null) => {
      if (!birthDate) return null;
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      return age;
    };

    // Check if this is the Verified Admin Demo
    const demoShortCode = await ConfigRepository.get("demo_profile_shortcode");
    const isDemo = demoShortCode === shortCode || shortCode === "44R6DBNQ" || shortCode === "DEMO-ADMIN-VIP";

    // Build public-safe response (NO email, NO birthdate, NO internal IDs)
    const publicProfile = {
      firstName: profile.firstName,
      lastName: profile.lastName,
      displayName: profile.displayNamePublic || `${profile.firstName} ${profile.lastName.charAt(0)}.`,
      sex: profile.sex || "No reportado",
      age: calculateAge(profile.birthDate),
      bloodType: decryptedBloodType,
      allergies: decryptedAllergies || "No reportadas",
      chronicConditions: decryptedConditions || "No reportadas",
      medications: decrypt(profile.medications || "") || "No reportados",
      additionalNotes: decryptedNote || "",
      photoUrl: profile.photoUrl || null,
      workplace: profile.organizationMembers?.[0]?.organization?.legalName || null,
      isVerifiedAdmin: isDemo, // Flag for the frontend badge
      emergencyContacts: profile.contacts.map((pc) => ({
        fullName: pc.contact.fullName,
        relationship: pc.relationship,
        phone: pc.contact.phone,
      })),
    };

    return NextResponse.json({ profile: publicProfile });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("Public profile error:", errorMessage);
    return NextResponse.json(
      { error: "Error interno" },
      { status: 500 }
    );
  }
}
