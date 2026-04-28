import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { AccountStateService } from "@/domains/accounts/services/account-state.service";
import { ProfileRepository } from "@/domains/profiles/repositories/profile.repository";
import { AuditLogRepository } from "@/domains/shared/repositories/audit-log.repository";
import { ApiResponse } from "@/lib/api-response";

export const dynamic = "force-dynamic";

// GET: all profiles in the account (own profile + family profiles)
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return ApiResponse.unauthorized();
    }

    const userId = (session.user as { id: string }).id;
    const state = await AccountStateService.getAccountState(userId);

    if (!state.accountId) {
      return ApiResponse.success({ ownProfile: null, familyProfiles: [], state });
    }

    const allProfiles = await ProfileRepository.findAllByAccount(state.accountId);

    const ownProfile = allProfiles.find((p) => p?.userId === userId) ?? null;
    const familyProfiles = allProfiles.filter((p) => p && p.userId !== userId);

    return ApiResponse.success({ ownProfile, familyProfiles, state });
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

    if (!state.canAddFamilyMember) {
      return ApiResponse.error("Límite de perfiles alcanzado. Adquiere un paquete adicional.", { status: 403 });
    }

    const body = await req.json();
    const { 
      firstName, lastName, displayNamePublic, birthDate: rawBirthDate, sex, bloodType, phone,
      allergies, chronicConditions, medications, additionalNotes
    } = body;

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
      displayNamePublic,
      birthDate,
      sex,
      bloodType: finalBloodType,
      phone,
      allergies,
      chronicConditions,
      medications,
      additionalNotes: additionalNotes || "",
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

