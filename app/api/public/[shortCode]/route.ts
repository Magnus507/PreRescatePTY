import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { ConfigRepository } from "@/domains/shared/repositories/config.repository";
import { decrypt } from "@/lib/encryption";
import { rateLimit } from "@/lib/rateLimit";
import { getClientIp } from "@/lib/request-ip";
import { CHIP_STATUS } from "@/domains/chips/chip-lifecycle.constants";

export const dynamic = "force-dynamic";

const ALLOWED_PUBLIC_ORIGINS = new Set([
  "https://www.prerescatepty.com",
  "https://prerescatepty.com",
  "https://pre-rescate-pty.vercel.app",
]);

function getAllowedOrigin(origin: string | null): string | null {
  if (!origin) return null; // navegación directa / QR / NFC normal no envía Origin en mismo sitio
  return ALLOWED_PUBLIC_ORIGINS.has(origin) ? origin : null;
}

function publicJson(
  req: NextRequest,
  body: unknown,
  init?: ResponseInit
) {
  const response = NextResponse.json(body, init);
  const allowedOrigin = getAllowedOrigin(req.headers.get("origin"));
  response.headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  response.headers.set("Vary", "Origin");
  if (allowedOrigin) {
    response.headers.set("Access-Control-Allow-Origin", allowedOrigin);
  }
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
    const rl = await rateLimit("profile_view", ip, { limit: 5, windowMs: 60_000 });
    if (!rl.allowed) {
      return publicJson(
        req,
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
      return publicJson(req, { profile: demoProfile });
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
        req,
        { error: "Código no encontrado en el sistema.", status: "not_found" },
        { status: 404 }
      );
    }

    if (chip.status !== CHIP_STATUS.ACTIVATED || !chip.assignedProfile) {
      return publicJson(req, {
        status: "unactivated",
        message: "Chip aún no activado",
      });
    }

    const profile = chip.assignedProfile;

    // Use a local minimal type for organization member to avoid assigning
    // wider Prisma types into narrower inferred types elsewhere.
    type OrgMemberMinimal = {
      organization?: { legalName?: string | null; displayName?: string | null } | null;
      location?: { name?: string; address?: string | null; city?: string | null } | null;
      department?: { name?: string } | null;
      corporateStatus?: string | null;
    } | null;

    let orgMember: OrgMemberMinimal = profile.organizationMembers?.[0] || null;

    // Check if this is a corporate profile with inactive benefit.
    // For corporate profiles, the organization member relationship is stored
    // via OrganizationMember.corporateProfileId, not via profile.organizationMembers.
    if (profile.profileType === "corporate") {
      const corporateMember = await prisma.organizationMember.findFirst({
        where: { corporateProfileId: profile.id },
        select: {
          corporateStatus: true,
          organization: { select: { displayName: true, legalName: true } },
          location: {
            select: { name: true, address: true, city: true },
          },
          department: { select: { name: true } },
        },
      });

      if (!corporateMember) {
        return publicJson(
          req,
          {
            status: "corporate_inactive",
            error: "Perfil empresarial no disponible",
            message: "Este perfil corporativo no tiene vinculación empresarial.",
          },
          { status: 403 }
        );
      }

      if (corporateMember.corporateStatus !== "paid_active") {
        return publicJson(
          req,
          {
            status: "corporate_inactive",
            error: "Perfil empresarial no disponible",
            message: "Este perfil corporativo ya no está activo.",
          },
          { status: 403 }
        );
      }

      // Build organization from the corporate member record instead of profile.organizationMembers
      orgMember = {
        organization: corporateMember.organization ?? null,
        location: corporateMember.location ?? null,
        department: corporateMember.department ?? null,
        corporateStatus: corporateMember.corporateStatus ?? null,
      };
    }

    // Decrypt sensitive fields
    const decryptedAllergies = decrypt(profile.allergies || "");
    const decryptedConditions = decrypt(profile.chronicConditions || "");
    const decryptedBloodType = decrypt(profile.bloodType || "");
    const decryptedInsuranceProvider = decrypt(profile.insuranceProvider || "");
    const decryptedPreferredHospital = decrypt(profile.preferredHospital || "");
    const decryptedPrimaryDoctorName = decrypt(profile.primaryDoctorName || "");
    const decryptedPrimaryDoctorPhone = decrypt(profile.primaryDoctorPhone || "");
    const decryptedAdditionalNotes = decrypt(profile.additionalNotes || "");
    // Humanitarian Overwrite Logic
    const hasCriticalData = 
      (decryptedAllergies && !decryptedAllergies.toLowerCase().includes("no report")) ||
      (decryptedConditions && !decryptedConditions.toLowerCase().includes("no report")) ||
      (decryptedBloodType && decryptedBloodType !== "No reportado");

    const isServiceInactive = chip.serviceStatus === "expired" || chip.serviceStatus === "inactive";

    if (isServiceInactive && !hasCriticalData) {
      return publicJson(
        req,
        { error: "Protocolo inactivo por falta de renovación.", status: "expired" },
        { status: 403 }
      );
    }

    if (profile.profileVisibilityStatus !== "active") {
      return publicJson(
        req,
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

    // Calculate isMinor from birthDate (never stored in DB)
    const calculatedAge = calculateAge(profile.birthDate);
    const isMinor = calculatedAge !== null && calculatedAge < 18;

    // Decrypt v2 fields
    const decryptedCommunicationAssistance = decrypt(profile.communicationAssistance || "");
    const decryptedSafeReturnInstructions = decrypt(profile.safeReturnInstructions || "");
    const decryptedSafeReturnLocationName = decrypt(profile.safeReturnLocationName || "");
    const decryptedSafeReturnAddress = decrypt(profile.safeReturnAddress || "");
    const decryptedSafeReturnContactName = decrypt(profile.safeReturnContactName || "");
    const decryptedSafeReturnContactPhone = decrypt(profile.safeReturnContactPhone || "");

    // Build public-safe response (NO email, NO birthdate, NO internal IDs)
    const publicProfile = {
      firstName: profile.firstName,
      lastName: profile.lastName,
      displayName: profile.displayNamePublic || `${profile.firstName} ${profile.lastName.charAt(0)}.`,
      sex: profile.sex || "No reportado",
      age: isMinor ? null : calculatedAge, // Hide exact age for minors
      isMinor, // Always computed, never stored
      profileType: profile.profileType,
      bloodType: decryptedBloodType,
      allergies: decryptedAllergies || "No reportadas",
      chronicConditions: decryptedConditions || "No reportadas",
      medications: decrypt(profile.medications || "") || "No reportados",
      photoUrl: profile.photoUrl || null,
      isVerifiedAdmin: isDemo, 
      
      // Public-safe organization context. Internal protocols, employee IDs,
      // occupational risks and corporate response buttons are intentionally
      // not exposed from the public emergency profile.
      // Organization data is ONLY included for corporate profiles.
      organization: orgMember && profile.profileType === "corporate" ? {
        name: orgMember.organization?.legalName || null,
        location: orgMember.location
          ? `${orgMember.location.name}${orgMember.location.city ? `, ${orgMember.location.city}` : ""}`
          : null,
        department: orgMember.department?.name || null,
      } : null,

      emergencyContacts: profile.contacts.map((pc) => ({
        fullName: pc.contact.fullName,
        relationship: pc.relationship,
        phone: pc.contact.phone,
      })),

      publicMedicalExtras: {
        insuranceProvider: profile.showInsuranceProviderPublic ? (decryptedInsuranceProvider || null) : null,
        preferredHospital: profile.showPreferredHospitalPublic ? (decryptedPreferredHospital || null) : null,
        primaryDoctorName: profile.showPrimaryDoctorPublic ? (decryptedPrimaryDoctorName || null) : null,
        primaryDoctorPhone: profile.showPrimaryDoctorPhonePublic ? (decryptedPrimaryDoctorPhone || null) : null,
        emergencyInstructions: profile.showAdditionalNotesPublic ? (decryptedAdditionalNotes || null) : null,
      },

      // v2 — Vulnerability status (only shown based on privacy toggles)
      // Corporate profiles are excluded from these fields
      ...(profile.profileType !== "corporate" && {
        vulnerabilityStatus: profile.showVulnerabilityStatusPublic ? {
          hasCognitiveImpairment: profile.hasCognitiveImpairment,
          hasWanderingRisk: profile.hasWanderingRisk,
          isNonVerbal: profile.showCommunicationStatusPublic ? profile.isNonVerbal : null,
          communicationAssistance: profile.showCommunicationStatusPublic ? (decryptedCommunicationAssistance || null) : null,
        } : null,
        safeReturn: profile.showSafeReturnPublic ? {
          instructions: decryptedSafeReturnInstructions || null,
          ...(profile.showSafeReturnLocationPublic ? {
            locationName: decryptedSafeReturnLocationName || null,
            address: decryptedSafeReturnAddress || null,
            lat: profile.safeReturnLat,
            lng: profile.safeReturnLng,
            contactName: decryptedSafeReturnContactName || null,
            contactPhone: decryptedSafeReturnContactPhone || null,
          } : {}),
        } : null,
      }),
    };

    return publicJson(req, { profile: publicProfile });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("Public profile error:", errorMessage);
    return publicJson(
      req,
      { error: "Error interno" },
      { status: 500 }
    );
  }
}

export async function OPTIONS(req: NextRequest) {
  const response = new NextResponse(null, { status: 204 });
  const allowedOrigin = getAllowedOrigin(req.headers.get("origin"));
  response.headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  response.headers.set("Vary", "Origin");
  if (allowedOrigin) {
    response.headers.set("Access-Control-Allow-Origin", allowedOrigin);
  }
  return response;
}
