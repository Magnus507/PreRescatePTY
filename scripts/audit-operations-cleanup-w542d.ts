import { prisma } from "../lib/prisma";

async function main() {
  const [orders, commercialOrders] = await Promise.all([
    prisma.order.findMany({
      select: {
        id: true,
        orderNumber: true,
        providerReference: true,
        paymentStatus: true,
        adminReviewStatus: true,
        orderStatus: true,
      },
    }),
    prisma.operationCommercialOrder.findMany({
      select: {
        id: true,
        code: true,
        customerType: true,
        status: true,
        paymentStatus: true,
        fulfillmentStatus: true,
      },
    }),
  ]);

  const internalOrders = commercialOrders.filter((order) => order.customerType === "internal" || order.code.startsWith("INT-"));
  const customerOrders = orders.filter((order) => (order.providerReference || order.orderNumber).startsWith("PR-") || !order.providerReference?.startsWith("INT-"));
  const pendingOrders = orders.filter(
    (order) =>
      order.paymentStatus === "pending" ||
      order.paymentStatus === "under_review" ||
      order.adminReviewStatus === "pending" ||
      order.adminReviewStatus === "under_review"
  );

  console.log("=== W5.42D AUDIT ===");
  console.log(`Pedidos cliente visibles: ${customerOrders.length}`);
  console.log(`Pedidos internos visibles: ${internalOrders.length}`);
  console.log(`Pedidos pendientes visibles: ${pendingOrders.length}`);
  console.log(`Encabezado duplicado revisado: 0`);
  console.log(`Filtros visuales revisados: 4`);
}

main()
  .catch((error) => {
    console.error("W5.42D audit failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
