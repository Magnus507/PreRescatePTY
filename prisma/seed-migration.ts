import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Iniciando migración de datos hacia estructura multi-tenant...");

  const users = await prisma.user.findMany({
    where: {
      accountId: null, // Sólo migrar los que no tengan account
    },
    include: {
      profile: true,
      chips: true,
    },
  });

  console.log(`Encontrados ${users.length} usuarios pendientes de migración.`);

  for (const user of users) {
    console.log(`Migrando usuario ${user.email}...`);

    // Fetch emergency contacts directly since relation was removed from User model
    const emergencyContacts = await prisma.emergencyContact.findMany({
      where: { userId: user.id }
    });

    // 1. Crear Account
    const accountName = user.profile
      ? `${user.profile.firstName} ${user.profile.lastName}`
      : user.email;

    const account = await prisma.account.create({
      data: {
        accountType: "personal",
        accountName,
        ownerUserId: user.id,
      },
    });

    // 2. Asociar Usuario al Account
    await prisma.user.update({
      where: { id: user.id },
      data: { accountId: account.id, role: "owner" },
    });

    // 3. Asociar Perfil (si existe) y Mover Contactos de Emergencia
    if (user.profile) {
      await prisma.profile.update({
        where: { id: user.profile.id },
        data: { accountId: account.id },
      });

      if (emergencyContacts.length > 0) {
        for (const contact of emergencyContacts) {
          await prisma.emergencyContact.update({
            where: { id: contact.id },
            data: { profileId: user.profile.id },
          });
        }
      }
    }

    // 4. Actualizar Chips del Usuario
    if (user.chips.length > 0 && user.profile) {
      for (const chip of user.chips) {
        let serviceStartDate = chip.activatedAt;
        let serviceEndDate = null;

        if (serviceStartDate) {
          const endDate = new Date(serviceStartDate);
          endDate.setFullYear(endDate.getFullYear() + 2);
          serviceEndDate = endDate;
        }

        let serviceStatus = "active";
        if (serviceEndDate && serviceEndDate.getTime() < Date.now()) {
          serviceStatus = "limited";
        }

        await prisma.chip.update({
          where: { id: chip.id },
          data: {
            accountId: account.id,
            assignedProfileId: user.profile.id,
            nicheType: "motorcycle",
            productType: "sticker_nfc_qr",
            serviceStartDate,
            serviceEndDate,
            serviceStatus,
          },
        });
      }
    }
  }

  console.log("✨ Migración completada exitosamente.");
}

main()
  .catch((e) => {
    console.error("Error durante la migración:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
