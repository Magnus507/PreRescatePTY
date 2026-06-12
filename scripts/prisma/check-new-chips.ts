import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DIRECT_URL,
    },
  },
});

async function main() {
  console.log('--- Checking Last Created Chips ---');
  
  const chips = await prisma.chip.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10,
    include: {
      owner: { select: { email: true } },
      assignedProfile: { select: { firstName: true, lastName: true } },
    }
  });

  if (chips.length === 0) {
    console.log('No chips found in database.');
    return;
  }

  chips.reverse().forEach((chip, i) => {
    console.log(`${i + 1}. [${chip.status}] ID: ${chip.id}`);
    console.log(`   ShortCode: ${chip.shortCode} | Serial: ${chip.serialPublic} | Prod: ${chip.productType}`);
    console.log(`   Created: ${chip.createdAt.toISOString()}`);
    console.log(`   Owner: ${chip.owner?.email || 'UNASSIGNED (Ready to sell)'}`);
    console.log(`   Linked Profile: ${chip.assignedProfile ? `${chip.assignedProfile.firstName} ${chip.assignedProfile.lastName}` : 'NONE'}`);
    console.log(`   Public URL: https://www.prerescatepty.com/public/${chip.shortCode}`);
    console.log(`   Activation Status: ${chip.status === 'activated' ? '✅ Activated' : '❌ Pending'}`);
    console.log('---');
  });

  console.log('\n--- Environment & Logic Verification ---');
  const fs = require('fs');
  const publicApi = 'app/api/public/[shortCode]/route.ts';
  const publicPage = 'app/(public)/public/[shortCode]/page.tsx';
  
  console.log(`Public API endpoint [${publicApi}]: ${fs.existsSync(publicApi) ? '✅ OK' : '❌ MISSING'}`);
  console.log(`Public View page [${publicPage}]: ${fs.existsSync(publicPage) ? '✅ OK' : '❌ MISSING'}`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
