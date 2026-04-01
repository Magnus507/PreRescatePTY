import { PrismaClient } from "@prisma/client";

const p = new PrismaClient();

async function main() {
  const er34 = await p.chip.findFirst({ where: { shortCode: "ER34" } });
  console.log("ER34 current state:", {
    serviceStatus: er34?.serviceStatus,
    serviceEndDate: er34?.serviceEndDate,
    assignedProfileId: er34?.assignedProfileId,
  });
}

main().finally(() => p.$disconnect());
