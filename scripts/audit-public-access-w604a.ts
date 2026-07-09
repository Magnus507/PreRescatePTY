import { prisma } from "@/lib/prisma";
import fs from "node:fs/promises";
import path from "node:path";
import { execSync } from "node:child_process";

const reportPath = path.join(process.cwd(), "tmp", "w604a-public-access-audit.json");

type ProfileRow = {
  id: string;
  firstName: string;
  lastName: string;
  profileType: string;
  userId: string | null;
  assignedChips: ChipRow[];
  digitalPass: DigitalPassRow | null;
  organizationMembers: OrganizationMemberRow[];
};

type ChipRow = {
  id: string;
  shortCode: string;
  status: string;
  serviceStatus: string;
  productType: string;
  nicheType: string;
  assignedProfileId: string | null;
  ownerUserId: string | null;
  activatedAt: Date | null;
  createdAt: Date;
};

type DigitalPassRow = {
  id: string;
  profileId: string;
  passType: string;
  serialNumber: string | null;
  createdAt: Date;
};

type CorporatePublicProfileRow = {
  id: string;
  shortCode: string;
  status: string;
  organizationId: string;
};

type OrganizationMemberRow = {
  id: string;
  profileId: string;
  organizationId: string;
  memberStatus: string;
  corporateStatus: string;
  corporateProfileId: string | null;
};

function countBy<T extends Record<string, unknown>>(rows: T[], key: keyof T) {
  return rows.reduce<Record<string, number>>((acc, row) => {
    const value = String(row[key] ?? "null");
    acc[value] = (acc[value] ?? 0) + 1;
    return acc;
  }, {});
}

async function main() {
  const currentHead = execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();

  const [profiles, chips, digitalPasses, corporatePublicProfiles, organizationMembers, publicRouteHits] = await Promise.all([
    prisma.profile.findMany({
      select: {
        id: true,
        firstName: true,
        lastName: true,
        profileType: true,
        userId: true,
        assignedChips: {
          select: {
            id: true,
            shortCode: true,
            status: true,
            serviceStatus: true,
            assignedProfileId: true,
            ownerUserId: true,
            activatedAt: true,
            createdAt: true,
          },
        },
        digitalPass: {
          select: {
            id: true,
            profileId: true,
            passType: true,
            serialNumber: true,
            createdAt: true,
          },
        },
        organizationMembers: {
          select: {
            id: true,
            organizationId: true,
            memberStatus: true,
            corporateStatus: true,
            corporateProfileId: true,
          },
        },
      },
    }) as Promise<ProfileRow[]>,
    prisma.chip.findMany({
      select: {
        id: true,
        shortCode: true,
        status: true,
        serviceStatus: true,
        productType: true,
        nicheType: true,
        assignedProfileId: true,
        ownerUserId: true,
        activatedAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: "asc" },
    }) as Promise<ChipRow[]>,
    prisma.digitalPass.findMany({
      select: {
        id: true,
        profileId: true,
        passType: true,
        serialNumber: true,
        createdAt: true,
      },
      orderBy: { createdAt: "asc" },
    }) as Promise<DigitalPassRow[]>,
    prisma.corporatePublicProfile.findMany({
      select: { id: true, shortCode: true, status: true, organizationId: true },
      orderBy: { createdAt: "asc" },
    }) as Promise<CorporatePublicProfileRow[]>,
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
    }) as Promise<OrganizationMemberRow[]>,
    prisma.chip.findUnique({
      where: { shortCode: "KLFUFPK8" },
      select: {
        id: true,
        shortCode: true,
        status: true,
        serviceStatus: true,
        assignedProfileId: true,
        ownerUserId: true,
        activatedAt: true,
      },
    }) as Promise<(Pick<ChipRow, "id" | "shortCode" | "status" | "serviceStatus" | "assignedProfileId" | "ownerUserId" | "activatedAt"> | null)>,
  ]);

  const profileMap = new Map(profiles.map((profile) => [profile.id, profile]));
  const chipMap = new Map(chips.map((chip) => [chip.id, chip]));

  const directProfileLinks = chips
    .filter((chip) => chip.assignedProfileId)
    .map((chip) => ({
      shortCode: chip.shortCode,
      profileId: chip.assignedProfileId,
      resolvesDirectlyToProfile: true,
      status: chip.status,
      serviceStatus: chip.serviceStatus,
    }));

  const deviceBasedLinks = chips
    .filter((chip) => chip.assignedProfileId)
    .map((chip) => ({
      shortCode: chip.shortCode,
      chipId: chip.id,
      profileId: chip.assignedProfileId,
      chipStatus: chip.status,
      serviceStatus: chip.serviceStatus,
      activationRoute: "/api/chips/activate",
    }));

  const profilesWithDigitalPass = profiles.filter((profile) => Boolean(profile.digitalPass));
  const profilesWithoutDigitalPass = profiles.filter((profile) => !profile.digitalPass);
  const activeChips = chips.filter((chip) => chip.status === "activated" && chip.serviceStatus === "active");
  const inactiveChips = chips.filter((chip) => !(chip.status === "activated" && chip.serviceStatus === "active"));

  const safeAccessCases = chips
    .filter((chip) => chip.status === "activated" && chip.assignedProfileId)
    .map((chip) => ({
      shortCode: chip.shortCode,
      chipId: chip.id,
      profileId: chip.assignedProfileId,
      profileName: profileMap.get(chip.assignedProfileId || "") ? `${profileMap.get(chip.assignedProfileId || "")?.firstName} ${profileMap.get(chip.assignedProfileId || "")?.lastName}` : null,
      reason: "Chip activado y perfil asignado",
    }));

  const riskCases = profiles
    .filter((profile) => !profile.assignedChips.some((chip) => chip.status === "activated" && chip.serviceStatus === "active"))
    .map((profile) => ({
      profileId: profile.id,
      profileName: `${profile.firstName} ${profile.lastName}`,
      profileType: profile.profileType,
      reason: "Perfil sin dispositivo activo asignado",
    }));

  const publicRouteHit = publicRouteHits ?? {
    id: "unknown",
    shortCode: "KLFUFPK8",
    status: "unknown",
    serviceStatus: "unknown",
    assignedProfileId: "cmq8pypfa0005js0ajdk4icfb",
    ownerUserId: null,
    activatedAt: null,
  };

  const report = {
    summary: {
      writesPerformed: false,
      destructiveActionsPerformed: false,
      generatedAt: new Date().toISOString(),
      currentHead,
    },
    models: {
      profile: {
        total: profiles.length,
        byProfileType: countBy(profiles, "profileType"),
      },
      chip: {
        total: chips.length,
        byStatus: countBy(chips, "status"),
        byProductType: countBy(chips, "productType"),
        byNicheType: countBy(chips, "nicheType"),
        active: activeChips.length,
        notActive: inactiveChips.length,
      },
      digitalPass: {
        total: digitalPasses.length,
        byPassType: countBy(digitalPasses, "passType"),
      },
      corporatePublicProfile: {
        total: corporatePublicProfiles.length,
        items: corporatePublicProfiles,
      },
      organizationMember: {
        total: organizationMembers.length,
      },
    },
    relations: {
      digitalPassToProfile: digitalPasses.map((pass) => ({
        digitalPassId: pass.id,
        profileId: pass.profileId,
        profileName: profileMap.get(pass.profileId)
          ? `${profileMap.get(pass.profileId)!.firstName} ${profileMap.get(pass.profileId)!.lastName}`
          : null,
        passType: pass.passType,
        serialNumber: pass.serialNumber,
      })),
      chipToProfile: chips
        .filter((chip) => chip.assignedProfileId)
        .map((chip) => ({
          chipId: chip.id,
          shortCode: chip.shortCode,
          profileId: chip.assignedProfileId,
          profileName: profileMap.get(chip.assignedProfileId || "")
            ? `${profileMap.get(chip.assignedProfileId || "")!.firstName} ${profileMap.get(chip.assignedProfileId || "")!.lastName}`
            : null,
          status: chip.status,
          serviceStatus: chip.serviceStatus,
        })),
      profilesWithoutActiveChip: profiles
        .filter((profile) => !profile.assignedChips.some((chip) => chip.status === "activated" && chip.serviceStatus === "active"))
        .map((profile) => ({
          profileId: profile.id,
          profileName: `${profile.firstName} ${profile.lastName}`,
          profileType: profile.profileType,
        })),
    },
    publicAccessSafety: {
      ruleWanted: [
        "QR/link",
        "dispositivo oficial / DigitalPass / Chip activo",
        "perfil asignado actual",
        "solo entonces mostrar perfil",
      ],
      publicAccessSafe: safeAccessCases,
      publicAccessRisk: riskCases,
      directProfileLinks,
      deviceBasedLinks,
    },
    publicRoutes: {
      apiPublicShortCode: {
        path: "/api/public/[shortCode]",
        resolver: "Chip.shortCode",
        requiresActivatedChip: true,
        requiresAssignedProfile: true,
      },
      apiPublicShortCodeScan: {
        path: "/api/public/[shortCode]/scan",
        resolver: "Chip.shortCode",
        requiresActivatedChip: true,
      },
      chipActivation: {
        path: "/api/chips/activate",
        resolver: "ChipClaimToken.activationCode",
        createsDigitalPass: false,
        linksChipToProfile: true,
      },
      publicQrGenerator: {
        path: "/api/public/qr",
        resolver: "QR image generation only",
      },
      publicProfileRoutesFound: [
        "/api/public/[shortCode]",
        "/api/public/[shortCode]/scan",
        "/api/public/qr",
      ],
    },
    manualDecision: {
      shortCode: "KLFUFPK8",
      profileId: "cmq8pypfa0005js0ajdk4icfb",
      chipId: publicRouteHit.id,
      status: publicRouteHit.status,
      serviceStatus: publicRouteHit.serviceStatus,
      preserved: true,
      reason: "Enlazado a trazas activas de Organization/OrganizationMember",
    },
    recommendations: [
      "hacer que la resolución pública valide primero un dispositivo activo",
      "evitar que Profile sea punto de entrada público directo",
      "mantener DigitalPass como capa de identidad asociada y no como apertura sola",
      "preservar el flujo empresarial para W6.07 sin mezclarlo con perfil personal",
      "tratar manualDecision KLFUFPK8 de forma separada hasta auditoría específica",
    ],
  };

  await fs.mkdir(path.dirname(reportPath), { recursive: true });
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2), "utf8");

  console.log("=== W6.04A Public Access Audit ===");
  console.log("Read-only audit completed.");
  console.log(`Report written to: ${reportPath}`);
  console.log("No database writes performed.");
  console.log(`Current HEAD: ${currentHead}`);
}

main()
  .catch((error) => {
    console.error("W6.04A audit failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    // Prisma singleton is managed by the app runtime; no explicit disconnect needed here.
  });
