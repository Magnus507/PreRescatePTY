const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

async function main() {
  console.log("Testing with DATABASE_URL:", process.env.DATABASE_URL);
  try {
    const user = await prisma.user.findFirst();
    console.log("Success! Found users: ", user ? "Yes" : "No");
  } catch(e) {
    console.error("Error connected to DB", e);
  } finally {
    await prisma.$disconnect();
  }
}
main();
