const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
    const sc = "DEMO-ADMIN-VIP";
    const qrUrl = `/api/public/qr?data=${encodeURIComponent('https://prerescatepty.com/e/' + sc)}`;
    
    await prisma.chip.update({
        where: { shortCode: sc },
        data: { qrUrl }
    });
    
    console.log("SUCCESS: Updated chip", sc);
    console.log("NEW QR URL:", qrUrl);
}

main()
    .catch((e) => {
        console.error("FAILURE:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
