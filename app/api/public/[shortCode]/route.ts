import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { ConfigRepository } from "@/domains/shared/repositories/config.repository";
import { decrypt } from "@/lib/encryption";
import { rateLimit } from "@/lib/rateLimit";
import { getClientIp } from "@/lib/request-ip";

export const dynamic = "force-dynamic";

function publicJson(
  body: unknown,
  init?: ResponseInit
) {
  const response = NextResponse.json(body, init);
  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  return response;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ shortCode: string }> }
) {
  try {
    const paramsAwaited = await params;
    const shortCode = paramsAwaited.shortCode.toUpperCase().trim();

    const ip = getClientIp(req, "public-profile-view");
    const rl = await rateLimit("profile_view", ip, { limit: 30, windowMs: 60_000 });
    if (!rl.allowed) {
      return publicJson(
        { error: "Demasiadas solicitudes. Intenta más tarde." },
        {
          status: 429,
          headers: { "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)) },
        }
      );
    }

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
        photoUrl: "https://fikidmfquaxhlayxctsa.supabase.co/storage/v1/object/public/profile-photos/demo-admin.png",
        isVerifiedAdmin: true,
        emergencyContacts: [
          { fullName: "María de Rodriguez", relationship: "Esposa", phone: "+507 6612-3456" },
          { fullName: "Dr. Mendoza (Cardiólogo)", relationship: "Médico Cabecera", phone: "+507 6677-8899" }
        ],
      };
      return publicJson({ profile: demoProfile });
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
                organization: true,
                location: true,
                department: true
              }
            }
          },
        },
      },
    });

    if (!chip) {
      return publicJson(
        { error: "Código no encontrado en el sistema.", status: "not_found" },
        { status: 404 }
      );
    }

    if (chip.status !== "activated" || !chip.assignedProfile) {
      return publicJson({
        status: "unactivated",
        message: "Chip aún no activado",
      });
    }

    const profile = chip.assignedProfile;
    const orgMember = profile.organizationMembers?.[0] || null;

    // Decrypt sensitive fields
    const decryptedAllergies = decrypt(profile.allergies || "");
    const decryptedConditions = decrypt(profile.chronicConditions || "");
    const decryptedBloodType = decrypt(profile.bloodType || "");
    // Humanitarian Overwrite Logic
    const hasCriticalData = 
      (decryptedAllergies && !decryptedAllergies.toLowerCase().includes("no report")) ||
      (decryptedConditions && !decryptedConditions.toLowerCase().includes("no report")) ||
      (decryptedBloodType && decryptedBloodType !== "No reportado");

    const isServiceInactive = chip.serviceStatus === "expired" || chip.serviceStatus === "inactive";

    if (isServiceInactive && !hasCriticalData) {
      return publicJson(
        { error: "Protocolo inactivo por falta de renovación.", status: "expired" },
        { status: 403 }
      );
    }

    if (profile.profileVisibilityStatus !== "active") {
      return publicJson(
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
      photoUrl: profile.photoUrl || null,
      isVerifiedAdmin: isDemo, 
      
      // Public-safe organization context. Internal protocols, employee IDs,
      // occupational risks and corporate response buttons are intentionally
      // not exposed from the public emergency profile.
      organization: orgMember ? {
        name: orgMember.organization.legalName,
        location: orgMember.location?.name || null,
        department: orgMember.department?.name || null,
      } : null,

      emergencyContacts: profile.contacts.map((pc) => ({
        fullName: pc.contact.fullName,
        relationship: pc.relationship,
        phone: pc.contact.phone,
      })),
    };

    return publicJson({ profile: publicProfile });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("Public profile error:", errorMessage);
    return publicJson(
      { error: "Error interno" },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  const response = new NextResponse(null, { status: 204 });
  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  return response;
}
