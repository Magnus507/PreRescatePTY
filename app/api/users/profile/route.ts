import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { profileUpdateSchema } from "@/lib/validations";
import { AccountStateService } from "@/domains/accounts/services/account-state.service";
import { ApiResponse } from "@/lib/api-response";
import { ProfileRepository } from "@/domains/profiles/repositories/profile.repository";
import { requireActiveAccountSession } from "@/lib/rbac";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const auth = await requireActiveAccountSession();
    if (!auth.authorized) return auth.response;

    const userId = auth.session.user.id;
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
  const auth = await requireActiveAccountSession();
  if (!auth.authorized) return auth.response;
  const userId = auth.session.user.id;
  try {
    const raw = await req.json();
    const validation = profileUpdateSchema.partial().safeParse(raw);
    if (!validation.success) {
      return ApiResponse.error(validation.error.issues[0].message, { status: 400 });
    }
    const body = validation.data;
    const profileVisibilityStatus = (raw as Record<string, unknown>).profileVisibilityStatus as string;

    // Only pass fields that this endpoint is allowed to modify.
    // Never pass medical fields (bloodType, allergies, etc.) even if present.
    const allowedUpdate: Record<string, unknown> = {};
    if (body.firstName !== undefined) allowedUpdate.firstName = body.firstName;
    if (body.lastName !== undefined) allowedUpdate.lastName = body.lastName;
    if (body.displayNamePublic !== undefined) allowedUpdate.displayNamePublic = body.displayNamePublic;
    if (body.phone !== undefined) allowedUpdate.phone = body.phone;
    if (body.nationalId !== undefined) allowedUpdate.nationalId = body.nationalId;
    if (body.address !== undefined) allowedUpdate.address = body.address;
    if (body.city !== undefined) allowedUpdate.city = body.city;
    if (body.sex !== undefined) allowedUpdate.sex = body.sex;
    if (body.birthDate !== undefined) allowedUpdate.birthDate = body.birthDate;
    if (profileVisibilityStatus !== undefined) allowedUpdate.profileVisibilityStatus = profileVisibilityStatus;

    // Get old values for audit
    const oldProfile = await prisma.profile.findUnique({ where: { userId } });

    const profile = await ProfileRepository.upsertByUserId(userId, allowedUpdate);

    if (body.phone !== undefined) {
      await prisma.user.update({
        where: { id: userId },
        data: { phone: body.phone }
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
