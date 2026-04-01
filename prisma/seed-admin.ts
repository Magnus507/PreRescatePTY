import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🗑️  Limpiando tabla AdminUser...");
  await prisma.adminUser.deleteMany({});

  console.log("🔐 Creando cuentas de administrador...");

  const hash1 = await bcrypt.hash("PreRescate2024!", 12);
  const hash2 = await bcrypt.hash("SoportePTY#10", 12);

  await prisma.adminUser.create({
    data: {
      email: "admin@prerescatepty.com",
      passwordHash: hash1,
      role: "superadmin",
      status: "active",
    },
  });

  await prisma.adminUser.create({
    data: {
      email: "soporte@prerescatepty.com",
      passwordHash: hash2,
      role: "admin",
      status: "active",
    },
  });

  console.log("✅ 2 cuentas de admin creadas:");
  console.log("   admin@prerescatepty.com / PreRescate2024! (superadmin)");
  console.log("   soporte@prerescatepty.com / SoportePTY#10 (admin)");
}

main()
  .catch((e) => {
    console.error("Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
