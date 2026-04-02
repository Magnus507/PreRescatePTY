const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    console.log("Dropping AuditLog constraints...");
    await prisma.$executeRawUnsafe(`ALTER TABLE "AuditLog" DROP CONSTRAINT IF EXISTS "AuditLog_actorUserId_fkey";`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "AuditLog" DROP CONSTRAINT IF EXISTS "AuditLog_accountId_fkey";`);
    console.log("Successfully dropped AuditLog constraints.");
  } catch (e) {
    console.error("Error:", e.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
