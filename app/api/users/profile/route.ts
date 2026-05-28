import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { profileUpdateSchema } from "@/lib/validations";
import { AccountStateService } from "@/domains/accounts/services/account-state.service";
import { ApiResponse } from "@/lib/api-response";
import { ProfileRepository } from "@/domains/profiles/repositories/profile.repository";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return ApiResponse.unauthorized();
    }

    const userId = session.user.id;
    const state = await AccountStateService.getAccountState(userId);

    const profile = await ProfileRepository.findByUserId(userId);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        phone: true,
        role: true,
        accountId: true,
        profile: {
          select: {
            nationalId: true,
            assignedChips: {
              where: { status: "activated" },
              take: 1,
              select: { shortCode: true }
            }
          }
        }
      },
    });

    const previewShortCode = user?.profile?.assignedChips?.[0]?.shortCode || null;

    return ApiResponse.success({ 
      profile, 
      user, 
      previewShortCode,
      isServiceActive: !state.isExpired && state.serviceStatus === "active",
      accountState: state 
    });
  } catch (error) {
    return ApiResponse.serverError(error);
  }
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return ApiResponse.unauthorized();
  }

  const userId = session.user.id;
  try {
    const raw = await req.json();
    const validation = profileUpdateSchema.partial().safeParse(raw);
    if (!validation.success) {
      return ApiResponse.error(validation.error.issues[0].message, { status: 400 });
    }
    const body = validation.data;
    const {
      firstName, lastName, displayNamePublic, birthDate, sex,
      bloodType, allergies, chronicConditions, medications,
      additionalNotes, phone, nationalId,
      address, city,
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
    } = body;
    const profileVisibilityStatus = (raw as Record<string, unknown>).profileVisibilityStatus as string;

    // Get old values for audit
    const oldProfile = await prisma.profile.findUnique({ where: { userId } });

    const profile = await ProfileRepository.upsertByUserId(userId, {
      firstName,
      lastName,
      displayNamePublic,
      birthDate,
      sex,
      bloodType,
      allergies,
      chronicConditions,
      medications,
      additionalNotes,
      profileVisibilityStatus,
      phone,
      nationalId,
      address,
      city,
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
    });

    if (phone !== undefined) {
      await prisma.user.update({
        where: { id: userId },
        data: { phone }
      });
    }

    // Audit log
    if (profile) {
      await prisma.auditLog.create({
        data: {
          actorUserId: userId,
          entityType: "profile",
          entityId: profile.id,
          action: oldProfile ? "update" : "create",
          oldValuesJson: oldProfile ? JSON.stringify(oldProfile) : null,
          newValuesJson: JSON.stringify(body),
        },
      });
    }

    await AccountStateService.invalidateCache(userId);
    return ApiResponse.success({ profile });
  } catch (error) {
    return ApiResponse.serverError(error);
  }
}
