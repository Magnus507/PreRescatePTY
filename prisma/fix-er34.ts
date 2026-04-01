import { PrismaClient } from "@prisma/client";

const p = new PrismaClient();

async function main() {
  // 1. Find the user's profile
  const user = await p.user.findFirst({
    where: { email: "geanky00@hotmail.com" },
    include: { profile: true }
  });

  if (!user || !user.profile) {
    console.error("User or profile not found");
    return;
  }

  console.log("User:", user.email);
  console.log("Profile:", user.profile.firstName, user.profile.lastName);
  console.log("Profile ID:", user.profile.id);
  console.log("Account ID:", user.accountId);

  // 2. Fix ER34 - link profile, set activatedAt, set back to limited for testing
  const chipER34 = await p.chip.findFirst({
    where: { shortCode: "ER34" }
  });

  if (!chipER34) {
    console.error("Chip ER34 not found");
    return;
  }

  console.log("\nChip ER34 before fix:");
  console.log("  assignedProfileId:", chipER34.assignedProfileId);
  console.log("  activatedAt:", chipER34.activatedAt);
  console.log("  serviceStatus:", chipER34.serviceStatus);

  // Fix: link profile, set activatedAt, reset to "limited" so we can test reactivation
  const pastDate = new Date("2024-03-31T00:00:00Z"); // 2 years ago
  const expiredDate = new Date("2026-03-31T00:00:00Z"); // expired

  await p.chip.update({
    where: { id: chipER34.id },
    data: {
      assignedProfileId: user.profile.id,
      accountId: user.accountId,
      activatedAt: pastDate,
      serviceStartDate: pastDate,
      serviceEndDate: expiredDate,
      serviceStatus: "limited", // Set back to limited so we can test reactivation
    }
  });

  console.log("\n✅ Chip ER34 FIXED:");
  console.log("  assignedProfileId:", user.profile.id);
  console.log("  activatedAt:", pastDate);
  console.log("  serviceStatus: limited (ready for reactivation test)");
  console.log("  serviceEndDate:", expiredDate, "(expired)");

  // 3. Verify final state
  const chips = await p.chip.findMany({
    where: { status: "activated" },
    include: {
      assignedProfile: { select: { firstName: true, lastName: true } }
    }
  });

  console.log("\n=== ACTIVATED CHIPS AFTER FIX ===");
  chips.forEach(c => {
    console.log(`  ${c.shortCode}: profile=${c.assignedProfile?.firstName || "NONE"} | service=${c.serviceStatus} | ends=${c.serviceEndDate}`);
  });
}

main().finally(() => p.$disconnect());
