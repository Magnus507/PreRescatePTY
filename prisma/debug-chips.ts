import { PrismaClient } from "@prisma/client";

const p = new PrismaClient();

async function main() {
  const chips = await p.chip.findMany({
    include: {
      assignedProfile: {
        select: { id: true, firstName: true, lastName: true, profileVisibilityStatus: true }
      },
      owner: {
        select: { id: true, email: true }
      }
    }
  });

  console.log("\n=== CHIPS EN LA BASE DE DATOS ===\n");
  chips.forEach(c => {
    console.log("---");
    console.log("shortCode:", c.shortCode, "| status:", c.status, "| serviceStatus:", c.serviceStatus);
    console.log("ownerUserId:", c.ownerUserId);
    console.log("assignedProfileId:", c.assignedProfileId);
    console.log("owner:", c.owner?.email || "NONE");
    console.log("profile:", c.assignedProfile ? `${c.assignedProfile.firstName} ${c.assignedProfile.lastName} (vis: ${c.assignedProfile.profileVisibilityStatus})` : "NONE");
    console.log("activatedAt:", c.activatedAt);
    console.log("serviceEndDate:", c.serviceEndDate);
  });

  // Also check profiles
  const profiles = await p.profile.findMany({
    select: { id: true, userId: true, firstName: true, lastName: true }
  });
  console.log("\n=== PROFILES ===\n");
  profiles.forEach(pr => {
    console.log("id:", pr.id, "| userId:", pr.userId, "| name:", pr.firstName, pr.lastName);
  });
}

main().finally(() => p.$disconnect());
