const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("Starting massive QR migration...");
  const chips = await prisma.chip.findMany({
    select: { id: true, qrUrl: true, shortCode: true }
  });

  let updatedCount = 0;

  for (const chip of chips) {
    let newUrl = chip.qrUrl;
    
    if (chip.qrUrl.includes('chart.googleapis.com')) {
       try {
         const url = new URL(chip.qrUrl);
         const data = url.searchParams.get('chl');
         if (data) {
            newUrl = `/api/public/qr?data=${encodeURIComponent(data)}`;
         }
       } catch (e) {
         console.warn(`Failed to parse URL for chip ${chip.shortCode}: ${chip.qrUrl}`);
       }
    } else if (chip.qrUrl.startsWith('http') && !chip.qrUrl.includes('/api/public/qr')) {
       // It's a direct profile link or other external link, wrap it
       newUrl = `/api/public/qr?data=${encodeURIComponent(chip.qrUrl)}`;
    }

    if (newUrl !== chip.qrUrl) {
      await prisma.chip.update({
        where: { id: chip.id },
        data: { qrUrl: newUrl }
      });
      updatedCount++;
      if (updatedCount % 10 === 0) console.log(`Updated ${updatedCount} chips...`);
    }
  }

  console.log(`Migration complete. Total updated: ${updatedCount}`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
