import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { AccountStateService } from "@/domains/accounts/services/account-state.service";
import { ProfileRepository } from "@/domains/profiles/repositories/profile.repository";
import { AuditLogRepository } from "@/domains/shared/repositories/audit-log.repository";
import { ApiResponse } from "@/lib/api-response";
import { profileUpdateSchema } from "@/lib/validations";

export const dynamic = "force-dynamic";

// GET: profiles (own profile + family profiles + corporate profiles)
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return ApiResponse.unauthorized();
    }

    const userId = (session.user as { id: string }).id;
    const state = await AccountStateService.getAccountState(userId);

    if (!state.accountId) {
      return ApiResponse.success({ ownProfile: null, familyProfiles: [], corporateProfiles: [], state });
    }

    const allProfiles = await ProfileRepository.findAllByAccount(state.accountId);

    const ownProfile = allProfiles.find((p) => p?.userId === userId) ?? null;
    const familyProfiles = allProfiles.filter((p) => p && p.userId !== userId);

    // Fetch corporate profiles linked via OrganizationMember.corporateProfileId
    let corporateProfiles: any[] = [];
    try {
      const { prisma } = await import("@/lib/prisma");
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true },
      });
      
      if (user) {
        const corporateMembers = await prisma.organizationMember.findMany({
          where: {
            profile: { userId: user.id },
            corporateProfileId: { not: null },
          },
          include: {
            corporateProfile: true,
            organization: { select: { id: true, displayName: true, legalName: true } },
          },
        });

        corporateProfiles = corporateMembers.map((m) => {
          const corpProfile = m.corporateProfile as any;
          const org = m.organization as any;
          return {
            id: corpProfile?.id || null,
            organizationId: m.organizationId,
            organizationMemberId: m.id,
            organizationName: org?.displayName || org?.legalName || "Empresa",
            corporateStatus: m.corporateStatus,
            profile: corpProfile,
          };
        });
      }
    } catch (corpErr) {
      console.error("Error fetching corporate profiles:", corpErr);
    }

    return ApiResponse.success({ ownProfile, familyProfiles, corporateProfiles, state });
  } catch (error: unknown) {
    const err = error as Error & { message?: string };
    console.error("GET /api/users/perfiles-medicos critical error:", error);
    
    if (err.message === "USER_NOT_FOUND") {
      return ApiResponse.error("Usuario no encontrado", { status: 404, details: err.message });
    }
    
    if (err.message === "ADMIN_ACCESS_CLIENT_DASHBOARD") {
      return ApiResponse.error("Panel de administrador", { 
        status: 403, 
        details: "Los administradores deben usar el panel de gestión dedicado." 
      });
    }

    return ApiResponse.serverError(err);
  }
}

// POST: create a new family profile (userId=null, linked only to account)
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return ApiResponse.unauthorized();
    }

    const userId = (session.user as { id: string }).id;
    const state = await AccountStateService.getAccountState(userId);

    if (!state.accountId) {
      return ApiResponse.error("Cuenta no configurada", { status: 400 });
    }

    // El límite comercial se aplica a chips/protecciones activas, no a perfiles.
    // Solo bloqueamos si se supera el límite técnico anti-abuso.
    // (ya validado en canAddFamilyMember con MAX_PERSONAL_PROFILES_TECHNICAL_LIMIT = 50)

    const body = await req.json();
    const validation = profileUpdateSchema.partial().safeParse(body);
    if (!validation.success) {
      return ApiResponse.error(validation.error.issues[0].message, { status: 400 });
    }

    const safeBody = validation.data;
    const { 
      firstName, lastName, displayNamePublic, birthDate: rawBirthDate, sex, bloodType, phone,
      allergies, chronicConditions, medications, additionalNotes,
      nationalId, address, city,
      isInsured,
      insuranceProvider,
      insurancePolicyNumber,
      preferredHospital,
      insuranceEmergencyPhone,
      primaryDoctorName,
      primaryDoctorPhone,
      showInsuranceProviderPublic,
      showPreferredHospitalPublic,
      showPrimaryDoctorPublic,
      showPrimaryDoctorPhonePublic,
      showAdditionalNotesPublic,
    } = safeBody;

    if (!firstName || !lastName) {
      return ApiResponse.error("Datos obligatorios incompletos (nombre y apellido).", { status: 400 });
    }

    const finalBloodType = bloodType || "Pendiente";

    // Parse birthDate string to Date (schema now uses DateTime)
    const birthDate = rawBirthDate ? new Date(rawBirthDate) : null;

    const profile = await ProfileRepository.create({
      accountId: state.accountId,
      firstName,
      lastName,
      displayNamePublic: displayNamePublic ?? undefined,
      birthDate,
      sex: sex ?? undefined,
      bloodType: finalBloodType,
      phone: phone ?? undefined,
      allergies,
      chronicConditions,
      medications,
      additionalNotes: additionalNotes || "",
      nationalId: nationalId ?? undefined,
      address: address ?? undefined,
      isInsured,
      insuranceProvider: insuranceProvider ?? undefined,
      insurancePolicyNumber: insurancePolicyNumber ?? undefined,
      preferredHospital: preferredHospital ?? undefined,
      insuranceEmergencyPhone: insuranceEmergencyPhone ?? undefined,
      primaryDoctorName: primaryDoctorName ?? undefined,
      primaryDoctorPhone: primaryDoctorPhone ?? undefined,
      showInsuranceProviderPublic,
      showPreferredHospitalPublic,
      showPrimaryDoctorPublic,
      showPrimaryDoctorPhonePublic,
      showAdditionalNotesPublic,
    });

    // Record audit log
    if (profile) {
      await AuditLogRepository.record({
        actorUserId: userId,
        accountId: state.accountId,
        entityType: "profile",
        entityId: profile.id,
        action: "create_family_profile",
        newValuesJson: JSON.stringify({ firstName, lastName, bloodType: finalBloodType }),
      });
    }

    return ApiResponse.success({ profile }, { status: 201 });
  } catch (error: unknown) {
    return ApiResponse.serverError(error as Error);
  }
}

