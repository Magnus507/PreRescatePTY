const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const records = await prisma.$queryRawUnsafe(`
      SELECT p.id
      FROM "Profile" p
      LEFT JOIN "User" u ON p."userId" = u.id
      WHERE u.id IS NULL AND p."userId" IS NOT NULL
    `);
    
    console.log('Orphaned profiles:', records);
    
    if (records.length > 0) {
      const ids = records.map(r => r.id);
      console.log('Deleting orphaned profiles...');
      await prisma.$executeRawUnsafe(`
        DELETE FROM "Profile" WHERE id IN (${ids.map(id => `'${id}'`).join(',')})
      `);
      console.log('Deleted successfully.');
    } else {
      console.log('No orphaned profiles found.');
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
