import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // 1. Create Admin User
  const adminEmail = "admin@prerescatepty.com";
  const adminPassword = "PreRescate2024!";
  const hashedPassword = await bcrypt.hash(adminPassword, 12);

  const admin = await prisma.adminUser.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      passwordHash: hashedPassword,
      role: "superadmin",
    },
  });

  console.log(`✅ Admin created: ${admin.email}`);

  // 2. Create some initial chips in inventory
  const chipsToCreate = [
    { serial: "PR-2024-0001", code: "ABCD-1234-EFGH", short: "QW12" },
    { serial: "PR-2024-0002", code: "IJKL-5678-MNOP", short: "ER34" },
    { serial: "PR-2024-0003", code: "QRST-9012-UVWX", short: "TY56" },
    { serial: "PR-2024-0004", code: "YZAB-3456-CDEF", short: "UI78" },
    { serial: "PR-2024-0005", code: "GHIJ-7890-KLMN", short: "OP90" },
  ];

  for (const c of chipsToCreate) {
    const chip = await prisma.chip.upsert({
      where: { serialPublic: c.serial },
      update: {},
      create: {
        serialPublic: c.serial,
        shortCode: c.short,
        nfcUrl: `http://localhost:3000/e/${c.short}`,
        qrUrl: `http://localhost:3000/e/${c.short}`,
        status: "inventory",
        claimTokens: {
          create: {
            activationCode: c.code,
            expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365), // 1 year
          },
        },
      },
    });
    console.log(`✅ Chip created: ${chip.serialPublic} (Activation: ${c.code})`);
  }

  console.log("🏁 Seeding finished successfully.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
