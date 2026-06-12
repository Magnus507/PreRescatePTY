import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DIRECT_URL,
    },
  },
});

async function main() {
  console.log('Testing connection to DIRECT_URL...');
  const count = await prisma.chip.count();
  console.log(`Connection successful. Total chips: ${count}`);
}

main()
  .catch(e => {
    console.error('Connection failed:', e.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
