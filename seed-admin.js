const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  const email = "admin@prerescatepty.com";
  const password = "PreRescate2024!";
  const passwordHash = await bcrypt.hash(password, 10);

  console.log("Seeding database with admin user...");

  try {
    // 1. Create a default account
    const account = await prisma.account.upsert({
      where: { id: "admin-account-id" },
      update: {},
      create: {
        id: "admin-account-id",
        accountType: "organization",
        accountName: "Admin Account",
        status: "active",
        maxChipsAllocated: 999
      },
    });

    // 2. Create the User
    await prisma.user.upsert({
      where: { email },
      update: { passwordHash },
      create: {
        email,
        passwordHash,
        role: "owner",
        status: "active",
        accountId: account.id
      },
    });

    // 3. Create the AdminUser
    await prisma.adminUser.upsert({
      where: { email },
      update: { passwordHash },
      create: {
        email,
        passwordHash,
        role: "superadmin",
        status: "active"
      },
    });

    console.log("Success! Admin user seeded in both User and AdminUser tables.");
  } catch (err) {
    console.error("Error seeding database:", err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
