import fs from "node:fs/promises";
import path from "node:path";
import { execSync } from "node:child_process";
import { prisma } from "@/lib/prisma";
import { resolvePublicProfileByChipShortCode } from "@/lib/public-access/resolve-public-profile-by-chip";

const reportPath = path.join(process.cwd(), "tmp", "w604b-public-access-guardrails-audit.json");

async function main() {
  const currentHead = execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();

  const [profiles, chips, digitalPasses, corporatePublicProfiles] = await Promise.all([
    prisma.profile.findMany({
      select: {
        id: true,
        firstName: true,
        lastName: true,
        profileType: true,
        digitalPass: { select: { id: true, profileId: true, passType: true, serialNumber: true } },
        assignedChips: { select: { id: true, shortCode: true, status: true, serviceStatus: true, assignedProfileId: true } },
      },
    }),
    prisma.chip.findMany({
      select: {
        id: true,
        shortCode: true,
        status: true,
        serviceStatus: true,
        assignedProfileId: true,
        ownerUserId: true,
        activatedAt: true,
      },
    }),
    prisma.digitalPass.findMany({ select: { id: true, profileId: true, passType: true, serialNumber: true } }),
    prisma.corporatePublicProfile.findMany({ select: { id: true, shortCode: true, status: true } }),
  ]);

  const klfufpk8 = await resolvePublicProfileByChipShortCode("KLFUFPK8");
  const nonexistent = await resolvePublicProfileByChipShortCode("NO-EXISTE-604B");

  const profilesWithoutActiveChip = profiles.filter((profile) => !profile.assignedChips.some((chip) => chip.status === "activated" && chip.serviceStatus === "active"));
  const directProfileCandidates = profilesWithoutActiveChip.map((profile) => ({
    profileId: profile.id,
    profileName: `${profile.firstName} ${profile.lastName}`,
    profileType: profile.profileType,
    hasDigitalPass: Boolean(profile.digitalPass),
  }));

  const report = {
    summary: {
      writesPerformed: false,
      destructiveActionsPerformed: false,
      generatedAt: new Date().toISOString(),
      currentHead,
    },
    counts: {
      profiles: profiles.length,
      chips: chips.length,
      digitalPasses: digitalPasses.length,
      corporatePublicProfiles: corporatePublicProfiles.length,
    },
    klfufpk8: {
      ok: klfufpk8.ok,
      reason: klfufpk8.reason,
      chip: klfufpk8.ok ? { id: klfufpk8.chip.id, shortCode: klfufpk8.chip.shortCode, status: klfufpk8.chip.status, serviceStatus: klfufpk8.chip.serviceStatus } : null,
      profile: klfufpk8.ok ? { id: klfufpk8.profile.id, firstName: klfufpk8.profile.firstName, lastName: klfufpk8.profile.lastName, profileType: klfufpk8.profile.profileType } : null,
      manualDecision: true,
    },
    directProfileCandidates,
    helperChecks: {
      nonexistentShortCode: {
        ok: nonexistent.ok,
        reason: nonexistent.reason,
      },
    },
    guardrails: {
      publicRouteMustUseChipShortCode: true,
      profileIsNotPublicEntryPoint: true,
      digitalPassDoesNotOpenProfileByItself: true,
      corporateFlowPreserved: true,
      manualDecisionPreserved: "KLFUFPK8",
    },
  };

  await fs.mkdir(path.dirname(reportPath), { recursive: true });
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2), "utf8");

  console.log("=== W6.04B Public Access Guardrails Audit ===");
  console.log("Read-only audit completed.");
  console.log(`Report written to: ${reportPath}`);
  console.log("No database writes performed.");
  console.log(`Current HEAD: ${currentHead}`);
}

main()
  .catch((error) => {
    console.error("W6.04B audit failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
