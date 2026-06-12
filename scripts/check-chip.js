const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const chip = await prisma.chip.findUnique({
    where: { shortCode: 'NVSSQRUA' }
  });
  console.log("Chip NVSSQRUA:", chip);
  
  // Also check some other chips to see their statuses
  const otherChips = await prisma.chip.findMany({
    take: 5,
    select: { shortCode: true, status: true }
  });
  console.log("Other chips:", otherChips);
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
