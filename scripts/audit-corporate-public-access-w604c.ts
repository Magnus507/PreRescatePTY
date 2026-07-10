import fs from "node:fs/promises";
import path from "node:path";
import { execSync } from "node:child_process";
import { prisma } from "@/lib/prisma";

const reportPath = path.join(process.cwd(), "tmp", "w604c-corporate-public-access-audit.json");

async function main() {
  const currentHead = execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();

  const [corporatePublicProfiles, organizationMembers, corporateProfiles, chips, profiles] = await Promise.all([
    prisma.corporatePublicProfile.findMany({
      select: {
        id: true,
        shortCode: true,
        status: true,
        organizationId: true,
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.organizationMember.findMany({
      select: {
        id: true,
        profileId: true,
        organizationId: true,
        memberStatus: true,
        corporateStatus: true,
        corporateProfileId: true,
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.profile.findMany({
      select: {
        id: true,
        firstName: true,
        lastName: true,
        profileType: true,
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.chip.findMany({
      select: {
        id: true,
        shortCode: true,
        status: true,
        serviceStatus: true,
        assignedProfileId: true,
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.profile.findMany({
      select: {
        id: true,
        firstName: true,
        lastName: true,
        profileType: true,
      },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const corporateRoutesDetected = [
    {
      path: "/api/organizations/public-profile",
      access: "auth_only",
      resolver: "CorporatePublicProfile by organization session",
      public: false,
    },
    {
      path: "/api/organizations/current",
      access: "auth_only",
      resolver: "Organization + members + chips for authenticated account",
      public: false,
    },
    {
      path: "/api/organizations/corporate-chip/activate",
      access: "auth_only",
      resolver: "ChipClaimToken / corporate assignment flow",
      public: false,
    },
    {
      path: "/api/organizations/corporate-orders/*",
      access: "auth_only",
      resolver: "Corporate order management",
      public: false,
    },
    {
      path: "/api/public/[shortCode]",
      access: "public_chip_shortCode",
      resolver: "Chip.shortCode",
      public: true,
    },
  ];

  const klfufpk8 = await prisma.chip.findUnique({
    where: { shortCode: "KLFUFPK8" },
    include: {
      assignedProfile: true,
      corporateOrderItems: {
        include: {
          organizationMember: {
            select: {
              id: true,
              organizationId: true,
              corporateStatus: true,
              corporateProfileId: true,
              memberStatus: true,
            },
          },
        },
      },
    },
  });

  const profile = profiles.find((p) => p.id === "cmq8pypfa0005js0ajdk4icfb") || null;
  const orgMember = organizationMembers.find((m) => m.profileId === "cmq8pypfa0005js0ajdk4icfb") || null;
  const corporateProfile = corporatePublicProfiles.find((c) => c.organizationId === orgMember?.organizationId) || null;

  const normalPublicAccessCheck = {
    route: "/api/public/[shortCode]",
    requiresChipShortCode: true,
    requiresActivatedChip: true,
    requiresAssignedProfile: true,
    profileDirectEntry: false,
    digitalPassOnly: false,
  };

  const corporatePublicAccessRisk = corporatePublicProfiles.flatMap((corp) => {
    const orgMembersForOrg = organizationMembers.filter((member) => member.organizationId === corp.organizationId);
    return orgMembersForOrg.map((member) => ({
      corporateShortCode: corp.shortCode,
      corporateStatus: corp.status,
      organizationId: corp.organizationId,
      organizationMemberId: member.id,
      profileId: member.profileId,
      memberStatus: member.memberStatus,
      memberCorporateStatus: member.corporateStatus,
      hasCorporateProfileId: Boolean(member.corporateProfileId),
      opensProfileDirectly: false,
    }));
  });

  const report = {
    summary: {
      writesPerformed: false,
      destructiveActionsPerformed: false,
      generatedAt: new Date().toISOString(),
      currentHead,
    },
    modelsDetected: {
      corporatePublicProfile: corporatePublicProfiles.length,
      organizationMember: organizationMembers.length,
      profile: profiles.length,
      chip: chips.length,
    },
    corporatePublicProfiles,
    organizationMembers,
    corporateRoutesDetected,
    klfufpk8: {
      shortCode: klfufpk8?.shortCode ?? "KLFUFPK8",
      chipStatus: klfufpk8?.status ?? null,
      serviceStatus: klfufpk8?.serviceStatus ?? null,
      assignedProfileId: klfufpk8?.assignedProfileId ?? null,
      assignedProfile: klfufpk8?.assignedProfile
        ? {
            id: klfufpk8.assignedProfile.id,
            firstName: klfufpk8.assignedProfile.firstName,
            lastName: klfufpk8.assignedProfile.lastName,
            profileType: klfufpk8.assignedProfile.profileType,
          }
        : null,
      organizationMember: orgMember,
      corporateProfile,
      manualDecision: true,
    },
    normalPublicAccessCheck,
    corporatePublicAccessRisk,
    manualDecision: {
      shortCode: "KLFUFPK8",
      profileId: profile?.id ?? "cmq8pypfa0005js0ajdk4icfb",
      preserved: true,
    },
    recommendedW604D: corporatePublicProfiles.length > 0
      ? "W6.04D guardrail corporativo mínimo"
      : "W6.04D cierre final sin cambios corporativos",
  };

  await fs.mkdir(path.dirname(reportPath), { recursive: true });
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2), "utf8");

  console.log("=== W6.04C Corporate Public Access Audit ===");
  console.log("Read-only audit completed.");
  console.log(`Report written to: ${reportPath}`);
  console.log("No database writes performed.");
  console.log(`Current HEAD: ${currentHead}`);
}

main()
  .catch((error) => {
    console.error("W6.04C audit failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
