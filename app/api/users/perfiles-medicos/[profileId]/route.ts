import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AccountStateService } from "@/domains/accounts/services/account-state.service";
import { ProfileRepository } from "@/domains/profiles/repositories/profile.repository";
import { profileUpdateSchema } from "@/lib/validations";

export const dynamic = "force-dynamic";

async function getAuthorizedProfile(userId: string, profileId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { accountId: true },
  });
  if (!user?.accountId) return null;

  const profile = await prisma.profile.findFirst({
    where: { id: profileId, accountId: user.accountId },
  });
  return profile;
}

// GET: fetch a single family profile
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ profileId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  const { profileId } = await params;

  const profile = await getAuthorizedProfile(userId, profileId);
  if (!profile) {
    return NextResponse.json({ error: "Perfil no encontrado" }, { status: 404 });
  }

  const decryptedProfile = await ProfileRepository.findById(profile.id);
  return NextResponse.json({ profile: decryptedProfile });
}

// PATCH: update a family profile's medical data
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ profileId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  const { profileId } = await params;


  // Unrestricted editing of medical profiles ensures data integrity even if the protection service is inactive.

  const existing = await getAuthorizedProfile(userId, profileId);
  if (!existing) {
    return NextResponse.json({ error: "Perfil no encontrado" }, { status: 404 });
  }

  const body = await req.json();
  const validation = profileUpdateSchema.partial().safeParse(body);
  if (!validation.success) {
    return NextResponse.json({ error: validation.error.issues[0].message }, { status: 400 });
  }

  const safeBody = validation.data;
  const {
    firstName, lastName, displayNamePublic, birthDate: rawBirthDate, sex,
    bloodType, allergies, chronicConditions, medications, additionalNotes, phone,
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
    // v2 special assistance
    hasCognitiveImpairment,
    hasWanderingRisk,
    isNonVerbal,
    communicationAssistance,
    safeReturnInstructions,
    showVulnerabilityStatusPublic,
    showCommunicationStatusPublic,
    showSafeReturnPublic,
  } = safeBody;

  // Parse birthDate string to Date (schema now uses DateTime)
  const birthDate = rawBirthDate !== undefined ? (rawBirthDate ? new Date(rawBirthDate) : null) : undefined;

  const updated = await ProfileRepository.update(profileId, {
    ...(firstName !== undefined && { firstName }),
    ...(lastName !== undefined && { lastName }),
    ...(displayNamePublic !== undefined && { displayNamePublic }),
    ...(birthDate !== undefined && { birthDate }),
    ...(sex !== undefined && { sex }),
    ...(bloodType !== undefined && { bloodType }),
    ...(allergies !== undefined && { allergies }),
    ...(chronicConditions !== undefined && { chronicConditions }),
    ...(medications !== undefined && { medications }),
    ...(additionalNotes !== undefined && { additionalNotes }),
    ...(phone !== undefined && { phone }),
    ...(nationalId !== undefined && { nationalId }),
    ...(address !== undefined && { address }),
    ...(city !== undefined && { city }),
    ...(isInsured !== undefined && { isInsured }),
    ...(insuranceProvider !== undefined && { insuranceProvider }),
    ...(insurancePolicyNumber !== undefined && { insurancePolicyNumber }),
    ...(preferredHospital !== undefined && { preferredHospital }),
    ...(insuranceEmergencyPhone !== undefined && { insuranceEmergencyPhone }),
    ...(primaryDoctorName !== undefined && { primaryDoctorName }),
    ...(primaryDoctorPhone !== undefined && { primaryDoctorPhone }),
    ...(showInsuranceProviderPublic !== undefined && { showInsuranceProviderPublic }),
    ...(showPreferredHospitalPublic !== undefined && { showPreferredHospitalPublic }),
    ...(showPrimaryDoctorPublic !== undefined && { showPrimaryDoctorPublic }),
    ...(showPrimaryDoctorPhonePublic !== undefined && { showPrimaryDoctorPhonePublic }),
    ...(showAdditionalNotesPublic !== undefined && { showAdditionalNotesPublic }),
    ...(hasCognitiveImpairment !== undefined && { hasCognitiveImpairment }),
    ...(hasWanderingRisk !== undefined && { hasWanderingRisk }),
    ...(isNonVerbal !== undefined && { isNonVerbal }),
    ...(communicationAssistance !== undefined && { communicationAssistance }),
    ...(safeReturnInstructions !== undefined && { safeReturnInstructions }),
    ...(showVulnerabilityStatusPublic !== undefined && { showVulnerabilityStatusPublic }),
    ...(showCommunicationStatusPublic !== undefined && { showCommunicationStatusPublic }),
    ...(showSafeReturnPublic !== undefined && { showSafeReturnPublic }),
  });

  // Sync phone number to User table if this profile is the main user's profile
  if (existing.userId && phone !== undefined) {
    await prisma.user.update({
      where: { id: existing.userId },
      data: { phone }
    });
  }

  await prisma.auditLog.create({
    data: {
      actorUserId: userId,
      accountId: existing.accountId,
      entityType: "profile",
      entityId: profileId,
      action: "update_family_profile",
      oldValuesJson: JSON.stringify(existing),
      newValuesJson: JSON.stringify(body),
    },
  });

  await AccountStateService.invalidateCache(userId);
  return NextResponse.json({ profile: updated });
}

// DELETE: remove a family profile (only if no chips assigned)
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ profileId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  const { profileId } = await params;


  // Management of profiles is allowed regardless of service state.

  const existing = await getAuthorizedProfile(userId, profileId);
  if (!existing) {
    return NextResponse.json({ error: "Perfil no encontrado" }, { status: 404 });
  }

  // Cannot delete own profile
  if (existing.userId === userId) {
    return NextResponse.json({ error: "No puedes eliminar tu propio perfil" }, { status: 400 });
  }

  // Cannot delete corporate profile
  if (existing.profileType === "corporate") {
    return NextResponse.json(
      { error: "El perfil empresarial no puede eliminarse desde Perfiles Médicos. Gestiona este beneficio desde Empresa." },
      { status: 400 }
    );
  }

  // Cannot delete if profile is used as corporateProfileId in OrganizationMember
  const orgMember = await prisma.organizationMember.findFirst({
    where: { corporateProfileId: profileId },
    select: { id: true },
  });
  if (orgMember) {
    return NextResponse.json(
      { error: "Este perfil pertenece a un beneficio empresarial y no puede eliminarse desde Perfiles Médicos." },
      { status: 400 }
    );
  }

  // Cannot delete if chips are assigned
  const chipCount = await prisma.chip.count({
    where: { assignedProfileId: profileId, status: { not: "inventory" } },
  });
  if (chipCount > 0) {
    return NextResponse.json(
      { error: "Desasigna los chips antes de eliminar este perfil" },
      { status: 400 }
    );
  }

  await prisma.profile.delete({ where: { id: profileId } });

  // Invalidate cache after profile deletion
  await AccountStateService.invalidateCache(userId);

  return NextResponse.json({ message: "Perfil eliminado" });
}
