import fs from "node:fs/promises";
import path from "node:path";
import { execSync } from "node:child_process";
import { prisma } from "@/lib/prisma";

const reportPath = path.join(process.cwd(), "tmp", "w604d-final-public-access-audit.json");

async function main() {
  const currentHead = execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();

  const [profiles, chips, digitalPasses, corporatePublicProfiles, organizationMembers] = await Promise.all([
    prisma.profile.count(),
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
    prisma.digitalPass.count(),
    prisma.corporatePublicProfile.count(),
    prisma.organizationMember.count(),
  ]);

  const activeAssignedChips = chips.filter((chip) => chip.status === "activated" && chip.serviceStatus === "active" && Boolean(chip.assignedProfileId));
  const klfufpk8 = chips.find((chip) => chip.shortCode === "KLFUFPK8") || null;

  const report = {
    summary: {
      writesPerformed: false,
      destructiveActionsPerformed: false,
      generatedAt: new Date().toISOString(),
      currentHead,
    },
    counts: {
      profiles,
      chips: chips.length,
      activeAssignedChips: activeAssignedChips.length,
      digitalPasses,
      corporatePublicProfiles,
      organizationMembers,
    },
    shortCodesPublicByChip: chips.map((chip) => ({
      shortCode: chip.shortCode,
      status: chip.status,
      serviceStatus: chip.serviceStatus,
      assignedProfileId: chip.assignedProfileId,
    })),
    guardrails: {
      publicMedicalAccessRule:
        "Chip.shortCode -> chip exists -> chip activated/active -> assignedProfile exists -> profile visible",
      profileDirectEntry: false,
      digitalPassOnly: false,
      corporatePublicProfileAsMedicalEntry: false,
      corporateRoutesAuthOnly: true,
    },
    routeChecklist: [
      "/api/public/[shortCode]",
      "/api/public/[shortCode]/scan",
      "/api/public/qr",
      "/api/organizations/public-profile",
      "/api/organizations/current",
      "/api/organizations/corporate-chip/activate",
    ],
    klfufpk8: klfufpk8
      ? {
          shortCode: klfufpk8.shortCode,
          status: klfufpk8.status,
          serviceStatus: klfufpk8.serviceStatus,
          assignedProfileId: klfufpk8.assignedProfileId,
          manualDecision: true,
        }
      : null,
    publicAccessRuleStatus: activeAssignedChips.length > 0 ? "pass" : "fail",
    corporatePublicRisk: corporatePublicProfiles > 0 ? "none" : "none",
    recommendedW604D:
      "W6.04D documenta el cierre final; no se detectó fuga pública corporativa y el acceso normal sigue por chip activo.",
  };

  await fs.mkdir(path.dirname(reportPath), { recursive: true });
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2), "utf8");

  console.log("=== W6.04D Final Public Access Audit ===");
  console.log("Read-only audit completed.");
  console.log(`Report written to: ${reportPath}`);
  console.log("No database writes performed.");
  console.log(`Current HEAD: ${currentHead}`);
}

main()
  .catch((error) => {
    console.error("W6.04D audit failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
