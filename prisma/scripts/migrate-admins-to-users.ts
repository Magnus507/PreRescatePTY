/**
 * Migration Script: Unify AdminUser into User table
 * 
 * This script:
 * 1. Copies all AdminUser records into User table with isAdmin=true
 * 2. Handles conflicts (admin email already exists in User table) by upgrading the existing user
 * 
 * Run BEFORE applying the Prisma migration that removes AdminUser model.
 * Usage: npx tsx prisma/scripts/migrate-admins-to-users.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("--- MIGRATING ADMIN USERS TO UNIFIED TABLE ---");

  // 1. Get all admin users
  const adminUsers = await prisma.adminUser.findMany();
  console.log(`Found ${adminUsers.length} admin users to migrate.`);

  let migrated = 0;
  let upgraded = 0;
  let skipped = 0;

  for (const admin of adminUsers) {
    // Check if user with this email already exists in User table
    const existingUser = await prisma.user.findUnique({
      where: { email: admin.email },
    });

    if (existingUser) {
      // User already exists - upgrade them to admin
      if (!existingUser.isAdmin) {
        await prisma.user.update({
          where: { id: existingUser.id },
          data: {
            isAdmin: true,
            adminRole: admin.role,
          },
        });
        upgraded++;
        console.log(`  ⬆️  Upgraded existing user ${admin.email} to admin (role: ${admin.role})`);
      } else {
        skipped++;
        console.log(`  ⏭️  Skipped ${admin.email} - already an admin in User table`);
      }
    } else {
      // Create new User record for this admin
      await prisma.user.create({
        data: {
          email: admin.email,
          passwordHash: admin.passwordHash,
          role: "owner",
          isAdmin: true,
          adminRole: admin.role,
          status: admin.status,
        },
      });
      migrated++;
      console.log(`  ✅ Migrated ${admin.email} (role: ${admin.role})`);
    }
  }

  console.log("\n--- MIGRATION COMPLETE ---");
  console.log(`  Migrated: ${migrated}`);
  console.log(`  Upgraded: ${upgraded}`);
  console.log(`  Skipped:  ${skipped}`);
  console.log(`  Total:    ${adminUsers.length}`);
}

main()
  .catch((e) => {
    console.error("Migration failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
