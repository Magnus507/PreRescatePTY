import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const packages = [
    { name: 'Básico', maxChips: 1, price: 20 },
    { name: 'Familiar', maxChips: 3, price: 45 },
    { name: 'Hogar', maxChips: 5, price: 70 },
    { name: 'Pro', maxChips: 10, price: 140 },
    { name: 'Empresa', maxChips: 20, price: 320 },
    { name: 'Corporativo', maxChips: 30, price: 450 },
  ];

  console.log('Seeding packages...');

  for (const pkg of packages) {
    await prisma.package.upsert({
      where: { name: pkg.name },
      update: { maxChips: pkg.maxChips, price: pkg.price },
      create: { 
        name: pkg.name, 
        maxChips: pkg.maxChips, 
        price: pkg.price,
        description: `Plan ${pkg.name} - Hasta ${pkg.maxChips} perfiles/stickers`
      },
    });
  }

  // Set any existing account without package to Básico
  const basico = await prisma.package.findUnique({ where: { name: 'Básico' } });
  if (basico) {
    await prisma.account.updateMany({
      where: { packageId: null },
      data: { packageId: basico.id, maxChipsAllocated: basico.maxChips },
    });
  }

  console.log('Packages seeded successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
