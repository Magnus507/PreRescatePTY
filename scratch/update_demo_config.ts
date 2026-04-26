import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function run() {
  try {
    await prisma.systemConfig.upsert({
      where: { key: 'demo_profile_shortcode' },
      update: { value: '44R6DBNQ' },
      create: { key: 'demo_profile_shortcode', value: '44R6DBNQ' }
    });
    console.log('Successfully updated demo_profile_shortcode to 44R6DBNQ');
  } catch (e) {
    console.error('Migration failed:', e);
  } finally {
    await prisma.$disconnect();
  }
}

run();
