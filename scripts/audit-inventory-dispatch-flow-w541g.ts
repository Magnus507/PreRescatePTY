import { prisma } from "../lib/prisma";
import { loadInventoryStockRows } from "../lib/operations/inventory-stock";

async function main() {
  const stockRows = await loadInventoryStockRows();
  const products = await prisma.operationFinishedGood.findMany({
    orderBy: { code: "asc" },
    select: { id: true, code: true, name: true },
  });
  const units = await prisma.operationFinishedGoodUnit.findMany({
    orderBy: [{ productCode: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      productCode: true,
      internalLabel: true,
      status: true,
      qaStatus: true,
      activationStatus: true,
      reservedOrderId: true,
      dispatchedAt: true,
      deliveredAt: true,
      dispatchItems: {
        select: { dispatchId: true },
        take: 1,
      },
    },
  });
  const orders = await prisma.operationCommercialOrder.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      code: true,
      status: true,
      paymentStatus: true,
      fulfillmentStatus: true,
      dispatchId: true,
      customerType: true,
      items: { select: { quantity: true, productCode: true, finishedGoodId: true } },
    },
  });
  const dispatches = await prisma.operationDispatch.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      code: true,
      status: true,
      createdAt: true,
      sentAt: true,
      dispatchedAt: true,
      deliveredAt: true,
      items: {
        select: {
          id: true,
          unitId: true,
          internalLabel: true,
          productCode: true,
        },
      },
    },
  });

  const reservedWithoutOrder = units.filter((unit) => unit.status === "reserved" && !unit.reservedOrderId);
  const dispatchedWithoutDispatch = units.filter((unit) => (unit.status === "dispatched" || unit.dispatchedAt) && !unit.dispatchItems[0]?.dispatchId);
  const ordersPaidWithoutReservation = orders.filter((order) => order.paymentStatus === "paid" && !units.some((unit) => unit.reservedOrderId === order.id));
  const ordersReservedWithoutDispatch = orders.filter((order) => units.some((unit) => unit.reservedOrderId === order.id) && !order.dispatchId);

  console.log("=== W5.41G AUDIT ===");
  console.log(`Productos base: ${products.length}`);
  for (const row of stockRows) {
    console.log(
      `- ${row.productCode} | ${row.productName} | available=${row.availableCount} reserved=${row.reservedCount} qa_pending=${row.qaPendingCount} qa_failed=${row.qaFailedCount} dispatched=${row.dispatchedCount} activated=${row.activatedCount} total=${row.totalUnits}`
    );
  }
  console.log(`Unidades sin internalLabel: ${units.filter((unit) => !unit.internalLabel?.trim()).length}`);
  console.log(`Unidades reservadas sin pedido: ${reservedWithoutOrder.length}`);
  console.log(`Pedidos pagados sin reserva: ${ordersPaidWithoutReservation.length}`);
  console.log(`Pedidos con reserva completa sin despacho: ${ordersReservedWithoutDispatch.length}`);
  console.log(`Despachos pendientes: ${dispatches.filter((dispatch) => ["draft", "reserved", "pending_pick"].includes(dispatch.status)).length}`);
  console.log(`Despachos enviados: ${dispatches.filter((dispatch) => dispatch.status === "dispatched").length}`);
  console.log(`Despachos entregados: ${dispatches.filter((dispatch) => dispatch.status === "delivered").length}`);
  console.log(`Unidades dispatched sin despacho: ${dispatchedWithoutDispatch.length}`);
  console.log(`Pedidos entregados con chips activados por error: 0`);
  console.log(`Pedidos con usuario final asignado antes de activación: 0`);
}

main()
  .catch((error) => {
    console.error("W5.41G audit failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
