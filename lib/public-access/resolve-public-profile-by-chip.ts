import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { PUBLIC_ACTIVE_CHIP_STATUSES } from "@/domains/chips/chip-lifecycle.constants";

export type PublicProfileResolutionReason =
  | "chip_not_found"
  | "chip_not_active"
  | "chip_unassigned"
  | "profile_not_found"
  | "profile_not_public"
  | "unsupported_context";

type ResolvedProfile = Prisma.ProfileGetPayload<{
  include: {
    contacts: { include: { contact: true } };
    organizationMembers: {
      include: {
        organization: true;
        location: true;
        departmentRel: true;
      };
    };
  };
}>;

type ResolvedChip = Prisma.ChipGetPayload<{
  include: {
    assignedProfile: {
      include: {
        contacts: { include: { contact: true } };
        organizationMembers: {
          include: {
            organization: true;
            location: true;
            departmentRel: true;
          };
        };
      };
    };
  };
}>;

export type PublicProfileResolution =
  | {
      ok: true;
      reason: null;
      chip: NonNullable<ResolvedChip>;
      profile: NonNullable<ResolvedProfile>;
      publicContext: {
        shortCode: string;
        chipId: string;
        profileId: string;
      };
    }
  | {
      ok: false;
      reason: PublicProfileResolutionReason;
      chip: ResolvedChip | null;
      profile: ResolvedProfile | null;
      publicContext: null;
    };

const CHIP_ACTIVE_STATUSES = new Set(PUBLIC_ACTIVE_CHIP_STATUSES);

export async function resolvePublicProfileByChipShortCode(shortCode: string): Promise<PublicProfileResolution> {
  const normalizedShortCode = shortCode.toUpperCase().trim();

  const chip = await prisma.chip.findUnique({
    where: { shortCode: normalizedShortCode },
    include: {
      assignedProfile: {
        include: {
          contacts: {
            where: { active: true },
            orderBy: { priorityOrder: "asc" },
            include: { contact: true },
          },
          organizationMembers: {
            where: { memberStatus: "active" },
            include: {
              organization: true,
              location: true,
              departmentRel: true,
            },
          },
        },
      },
    },
  });

  if (!chip) {
    return { ok: false, reason: "chip_not_found", chip: null, profile: null, publicContext: null };
  }

  // The rescue profile remains available after the commercial service expires.
  // Only the physical chip lifecycle can disable public emergency access.
  if (!CHIP_ACTIVE_STATUSES.has(chip.status as (typeof PUBLIC_ACTIVE_CHIP_STATUSES)[number])) {
    return { ok: false, reason: "chip_not_active", chip, profile: chip.assignedProfile || null, publicContext: null };
  }

  if (!chip.assignedProfileId) {
    return { ok: false, reason: "chip_unassigned", chip, profile: null, publicContext: null };
  }

  if (!chip.assignedProfile) {
    return { ok: false, reason: "profile_not_found", chip, profile: null, publicContext: null };
  }

  const profile = chip.assignedProfile;

  if (profile.profileVisibilityStatus !== "active") {
    return { ok: false, reason: "profile_not_public", chip, profile, publicContext: null };
  }

  return {
    ok: true,
    reason: null,
    chip,
    profile,
    publicContext: {
      shortCode: chip.shortCode,
      chipId: chip.id,
      profileId: profile.id,
    },
  };
}
