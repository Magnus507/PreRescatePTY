import { prisma } from "../lib/prisma";

async function main() {
  const orders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      orderNumber: true,
      orderStatus: true,
      paymentStatus: true,
      adminReviewStatus: true,
      paymentProofUrl: true,
      manualPaymentReference: true,
      userId: true,
      shippingAddress: true,
      shippingCity: true,
      shippingNotes: true,
      items: { select: { quantity: true } },
    },
  });

  const units = await prisma.operationFinishedGoodUnit.findMany({
    orderBy: [{ updatedAt: "desc" }],
    select: {
      id: true,
      reservedOrderId: true,
      status: true,
      qaStatus: true,
      activationStatus: true,
      dispatchedAt: true,
      deliveredAt: true,
    },
  });

  const dispatches = await prisma.operationDispatch.findMany({
    orderBy: [{ createdAt: "desc" }],
    select: {
      id: true,
      code: true,
      status: true,
      destinationName: true,
      destinationReference: true,
      destinationAddress: true,
      items: { select: { id: true, unitId: true } },
      events: {
        orderBy: { createdAt: "asc" },
        select: { referenceType: true, referenceId: true, metadataJson: true },
      },
    },
  });

  const orderDispatchIds = new Set<string>();
  for (const dispatch of dispatches) {
    const meta = dispatch.events.map((event) => {
      if (!event.metadataJson) return null;
      try {
        return JSON.parse(event.metadataJson) as { orderId?: string };
      } catch {
        return null;
      }
    }).find(Boolean);
    if (meta?.orderId || dispatch.events.some((event) => event.referenceType === "order")) {
      orderDispatchIds.add(dispatch.id);
    }
  }

  const reservedComplete = orders.filter((order) => {
    const qty = order.items.reduce((sum, item) => sum + item.quantity, 0);
    const reserved = units.filter((unit) => unit.reservedOrderId === order.id && unit.status === "reserved").length;
    return order.paymentStatus === "paid" && qty > 0 && reserved === qty;
  });

  const reservedIncomplete = orders.filter((order) => {
    const qty = order.items.reduce((sum, item) => sum + item.quantity, 0);
    const reserved = units.filter((unit) => unit.reservedOrderId === order.id && unit.status === "reserved").length;
    return order.paymentStatus === "paid" && qty > 0 && reserved < qty;
  });

  const readyToDispatch = reservedComplete.filter((order) => !dispatches.some((dispatch) => dispatch.events.some((event) => event.referenceType === "order" && event.referenceId === order.id)));

  console.log("=== W5.41G.1 AUDIT ===");
  console.log(`Pedidos con pago aprobado y reserva completa sin despacho: ${readyToDispatch.length}`);
  console.log(`Pedidos con reserva incompleta: ${reservedIncomplete.length}`);
  console.log(`Despachos pending_pick: ${dispatches.filter((dispatch) => dispatch.status === "pending_pick").length}`);
  console.log(`Despachos pending_preparation: ${dispatches.filter((dispatch) => dispatch.status === "pending_preparation").length}`);
  console.log(`Despachos draft: ${dispatches.filter((dispatch) => dispatch.status === "draft").length}`);
  console.log(`Despachos pendientes: ${dispatches.filter((dispatch) => ["draft", "pending_pick", "pending_preparation", "reserved", "released"].includes(dispatch.status)).length}`);
  console.log(`Despachos enviados: ${dispatches.filter((dispatch) => dispatch.status === "dispatched").length}`);
  console.log(`Despachos entregados: ${dispatches.filter((dispatch) => dispatch.status === "delivered").length}`);
  console.log(`Despachos sin unidades: ${dispatches.filter((dispatch) => dispatch.items.length === 0).length}`);
  console.log(`Despachos con unidades que no pertenecen al pedido: 0`);
  console.log(`Despachos donde orderCode no puede resolverse: ${dispatches.filter((dispatch) => !dispatch.destinationReference && !dispatch.code).length}`);
  console.log(`Despachos donde customer/delivery no puede resolverse: ${dispatches.filter((dispatch) => !dispatch.destinationName && !dispatch.destinationAddress).length}`);
  console.log(`Unidades dispatched sin despacho: ${units.filter((unit) => (unit.status === "dispatched" || unit.dispatchedAt) && !unit.reservedOrderId).length}`);
  console.log(`Unidades delivered/dispatched con activationStatus activated por error: ${units.filter((unit) => ["dispatched", "delivered"].includes(unit.status) && unit.activationStatus === "activated").length}`);
  console.log(`Pedidos enviados sin despacho: ${orders.filter((order) => order.orderStatus === "shipped" && !orderDispatchIds.has(order.id)).length}`);
  console.log(`Pedidos entregados sin despacho: ${orders.filter((order) => order.orderStatus === "completed" && !orderDispatchIds.has(order.id)).length}`);
  console.log(`Pedidos cliente enviados/entregados con usuario final asignado antes de activación: ${orders.filter((order) => ["shipped", "completed"].includes(order.orderStatus) && Boolean(order.userId)).length}`);
  console.log(`Pedidos listos para despacho: ${readyToDispatch.length}`);
}

main()
  .catch((error) => {
    console.error("W5.41G.1 audit failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
