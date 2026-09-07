import { prisma } from "@/lib/prisma";
import { Account, Package, Profile, User, Chip } from "@prisma/client";
import { AccountState, SetupChecklist } from "../account.types";
import { ACCOUNT_TYPES, USER_ROLES, BUSINESS_RULES } from "@/domains/shared/constants";
import { redis, isRedisConfigured } from "@/lib/redis";
import { parseMoney } from "@/lib/money";

export { type SetupChecklist };

const CHIP_CAPACITY_STATUSES = ["activated", "suspended"];
const CHIP_SERVICE_STATUSES = ["activated", "suspended"];
const MAX_PERSONAL_PROFILES_TECHNICAL_LIMIT = 50;
const ACCOUNT_STATE_CACHE_VERSION = "v4";

export const ACCOUNT_STATE_ERRORS = {
  USER_NOT_FOUND: "USER_NOT_FOUND",
  ADMIN_ACCESS_CLIENT_DASHBOARD: "ADMIN_ACCESS_CLIENT_DASHBOARD",
} as const;

type UserWithAccount = User & {
  profile: Profile | null;
  account: (Account & { package: Package | null }) | null;
};

export class AccountStateService {
  static isMedicalProfileComplete(profile: Profile | null | undefined): boolean {
    if (!profile) return false;
    const { firstName, lastName, bloodType } = profile;
    return (
      !!firstName && firstName.length > 1 &&
      !!lastName && lastName.length > 1 &&
      !!bloodType && bloodType !== "Pendiente" && bloodType !== ""
    );
  }

  private static resolveAccountCategory(account: Account | null, rawAccountType: string) {
    const maxProfilesLimit = account?.maxProfilesAllocated || 1;
    const isCorporate = rawAccountType === "company" || rawAccountType === "organization" || rawAccountType === "corporate";
    const isFamily = rawAccountType === "family" || maxProfilesLimit > 1;
    const isPersonal = !isCorporate && !isFamily;
    return {
      accountType: isCorporate ? ACCOUNT_TYPES.COMPANY : (isFamily ? ACCOUNT_TYPES.FAMILY : ACCOUNT_TYPES.PERSONAL),
      isCorporate,
      isFamily,
      isPersonal,
    };
  }

  /** Commercial service state only. It must never be used to hide rescue data. */
  private static calculateServiceStatus(latestChip: Chip | null, isCorporate: boolean, maxChipsLimit: number) {
    const serviceEndDate = latestChip?.serviceEndDate || null;
    const isExpired = serviceEndDate ? serviceEndDate < new Date() : false;
    const isInactive = isCorporate && maxChipsLimit === 0;
    const serviceStatus = isInactive
      ? "inactive"
      : (isExpired ? "expired" : (latestChip?.serviceStatus || "active"));
    return { serviceStatus, serviceEndDate, isExpired, isInactive };
  }

  /**
   * Resolves dashboard/commercial state. The 24-month service term remains real,
   * while public rescue availability is resolved independently by public-access.
   */
  static async getAccountState(userId: string): Promise<AccountState> {
    const cacheKey = `account_state_${ACCOUNT_STATE_CACHE_VERSION}:${userId}`;

    if (redis && isRedisConfigured()) {
      try {
        const cached = await redis.get<AccountState>(cacheKey);
        if (cached) return cached;
      } catch (e) {
        console.error("[AccountStateService] Cache fetch error:", e);
      }
    }

    const user = (await prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true, account: { include: { package: true } } },
    })) as UserWithAccount | null;

    if (!user) {
      const adminCheck = await prisma.user.findUnique({ where: { id: userId }, select: { isAdmin: true } });
      if (adminCheck?.isAdmin) throw new Error(ACCOUNT_STATE_ERRORS.ADMIN_ACCESS_CLIENT_DASHBOARD);
      throw new Error(ACCOUNT_STATE_ERRORS.USER_NOT_FOUND);
    }

    const { account, profile } = user;
    const [activeChipsCount, inTransitCount, actualProfilesCount, scansCount, contactsCount] = account?.id
      ? await Promise.all([
          prisma.chip.count({ where: { accountId: account.id, status: { in: CHIP_CAPACITY_STATUSES } } }),
          prisma.chip.count({ where: { accountId: account.id, status: "sold", isPhysical: true } }),
          prisma.profile.count({ where: { accountId: account.id, profileType: { not: "corporate" } } }),
          prisma.scanEvent.count({ where: { accountId: account.id } }),
          prisma.profileContact.count({ where: { profileId: profile?.id || "not-exists", active: true } }),
        ])
      : [0, 0, 1, 0, 0];

    const rawAccountType = account?.accountType || ACCOUNT_TYPES.PERSONAL;
    const { accountType, isCorporate, isFamily, isPersonal } = this.resolveAccountCategory(account, rawAccountType);
    const maxChipsLimit = account?.maxChipsAllocated || 0;
    const maxProfilesLimit = account?.maxProfilesAllocated || 1;

    const latestChip = account?.id ? await prisma.chip.findFirst({
      where: { accountId: account.id, status: { in: CHIP_SERVICE_STATUSES } },
      orderBy: { serviceEndDate: "desc" },
    }) : null;

    const { serviceStatus, serviceEndDate, isExpired, isInactive } = this.calculateServiceStatus(
      latestChip,
      isCorporate,
      maxChipsLimit
    );

    const isMedicalComplete = this.isMedicalProfileComplete(profile);
    const setupChecklist: SetupChecklist = {
      medicalProfileComplete: isMedicalComplete,
      chipActivated: activeChipsCount > 0,
      emergencyContactAdded: contactsCount > 0,
      setupComplete: false,
    };
    setupChecklist.setupComplete = setupChecklist.medicalProfileComplete && setupChecklist.chipActivated && (isCorporate || setupChecklist.emergencyContactAdded);

    const isOwner = user.role === USER_ROLES.OWNER || user.role === USER_ROLES.ADMIN || user.role === USER_ROLES.SUPERADMIN || account?.ownerUserId === userId;
    const serviceDurationMonths = account?.package?.serviceDurationMonths || BUSINESS_RULES.DEFAULT_SERVICE_DURATION_MONTHS;

    const state: AccountState = {
      accountId: user.accountId || null,
      packageId: account?.packageId || null,
      packagePrice: parseMoney(account?.package?.price || 0).toNumber(),
      accountType,
      packageName: account?.package?.name || (activeChipsCount > 0 ? "Protección Activa" : "Protección Personal"),
      maxChipsAllocated: maxChipsLimit,
      maxProfilesAllocated: maxProfilesLimit,
      serviceStatus,
      serviceEndDate,
      serviceDurationMonths,
      isExpired,
      isInactive,
      isPersonal,
      isFamily,
      isCorporate,
      isOrganization: isCorporate,
      isOwner,
      canManageFamilyProfiles: isFamily && isOwner,
      canAccessOrganizationModule: isCorporate && isOwner,
      // Personal/family activation is possession-based: a valid purchased code
      // may start its own 24-month term even if another service term expired.
      canActivateMoreChips: isOwner && (!isCorporate || (!isInactive && activeChipsCount < maxChipsLimit)),
      canAddFamilyMember: isOwner && actualProfilesCount < MAX_PERSONAL_PROFILES_TECHNICAL_LIMIT,
      activeChipsCount,
      physicalChipsInTransitCount: inTransitCount,
      familyProfilesCount: Math.max(0, actualProfilesCount - 1),
      contactsCount,
      scansCount,
      hasCompletedMedicalProfile: setupChecklist.medicalProfileComplete,
      hasEmergencyContact: setupChecklist.emergencyContactAdded,
      hasActivatedChip: setupChecklist.chipActivated,
      setupChecklist,
    };

    if (redis && isRedisConfigured()) {
      try {
        await redis.set(cacheKey, state, { ex: 300 });
      } catch (e) {
        console.error("[AccountStateService] Cache set error:", e);
      }
    }
    return state;
  }

  static async invalidateCache(userId: string): Promise<void> {
    if (!redis || !isRedisConfigured()) return;
    try {
      await Promise.all([
        redis.del(`account_state_${ACCOUNT_STATE_CACHE_VERSION}:${userId}`),
        redis.del(`account_state_v3:${userId}`),
      ]);
    } catch (e) {
      console.error("[AccountStateService] Cache invalidation error:", e);
    }
  }
}
