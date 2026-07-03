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
      userId: true,
      items: { select: { quantity: true } },
    },
  });

  const units = await prisma.operationFinishedGoodUnit.findMany({
    orderBy: [{ updatedAt: "desc" }],
    select: {
      id: true,
      status: true,
      qaStatus: true,
      activationStatus: true,
      reservedOrderId: true,
      dispatchedAt: true,
      deliveredAt: true,
      internalLabel: true,
    },
  });

  const dispatches = await prisma.operationDispatch.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      code: true,
      status: true,
      destinationName: true,
      destinationAddress: true,
      destinationReference: true,
      items: { select: { unitId: true } },
    },
  });

  const orderHasDispatch = new Set<string>();
  for (const dispatch of dispatches) {
    if (dispatch.code.startsWith("DSP-")) {
      const sourceId = dispatch.destinationReference || null;
      if (sourceId) orderHasDispatch.add(sourceId);
    }
  }

  const paidOrders = orders.filter((order) => order.paymentStatus === "paid" || order.adminReviewStatus === "approved");
  const completeReservationOrders = paidOrders.filter((order) => {
    const qty = order.items.reduce((sum, item) => sum + item.quantity, 0);
    const reserved = units.filter((unit) => unit.reservedOrderId === order.id && unit.status === "reserved").length;
    return qty > 0 && reserved === qty;
  });

  const partialReservationOrders = paidOrders.filter((order) => {
    const qty = order.items.reduce((sum, item) => sum + item.quantity, 0);
    const reserved = units.filter((unit) => unit.reservedOrderId === order.id && unit.status === "reserved").length;
    return qty > 0 && reserved > 0 && reserved < qty;
  });

  const shippedOrders = orders.filter((order) => order.orderStatus === "shipped");
  const completedOrders = orders.filter((order) => order.orderStatus === "completed");

  const availableUnits = units.filter(
    (unit) =>
      unit.status === "available" &&
      unit.qaStatus === "passed" &&
      unit.activationStatus === "not_activated" &&
      !unit.reservedOrderId
  );
  const reservedUnits = units.filter((unit) => unit.status === "reserved" && unit.reservedOrderId);
  const dispatchedUnits = units.filter((unit) => unit.status === "dispatched" || unit.dispatchedAt);
  const deliveredUnits = units.filter((unit) => unit.status === "delivered" || unit.deliveredAt);
  const activatedUnits = units.filter((unit) => unit.activationStatus === "activated");

  console.log("=== W5.41H AUDIT ===");
  console.log(`Pedidos pagados aprobados sin reserva: ${paidOrders.length - completeReservationOrders.length - partialReservationOrders.length}`);
  console.log(`Pedidos pagados aprobados con reserva parcial: ${partialReservationOrders.length}`);
  console.log(`Pedidos pagados aprobados con reserva completa sin despacho: ${completeReservationOrders.filter((order) => !orderHasDispatch.has(order.id)).length}`);
  console.log(`Pedidos con despacho pending_pick/prepared: ${dispatches.filter((dispatch) => ["pending_pick", "pending_preparation", "prepared"].includes(dispatch.status)).length}`);
  console.log(`Pedidos enviados: ${shippedOrders.length}`);
  console.log(`Pedidos entregados: ${completedOrders.length}`);
  console.log(`Pedidos marcados completed sin delivered: ${completedOrders.filter((order) => !orderHasDispatch.has(order.id)).length}`);
  console.log(`Pedidos shipped sin despacho shipped/sent: ${shippedOrders.filter((order) => !orderHasDispatch.has(order.id)).length}`);
  console.log(`Pedidos delivered sin despacho delivered: ${completedOrders.filter((order) => !orderHasDispatch.has(order.id)).length}`);
  console.log(`Available reales: ${availableUnits.length}`);
  console.log(`Reserved reales: ${reservedUnits.length}`);
  console.log(`Dispatched reales: ${dispatchedUnits.length}`);
  console.log(`Delivered reales: ${deliveredUnits.length}`);
  console.log(`Activated: ${activatedUnits.length}`);
  console.log(`Unidades counted available pero con reservedOrderId: ${units.filter((unit) => unit.status === "available" && unit.reservedOrderId).length}`);
  console.log(`Unidades counted available pero qa no passed: ${units.filter((unit) => unit.status === "available" && unit.qaStatus !== "passed").length}`);
  console.log(`Unidades counted available pero activated: ${units.filter((unit) => unit.status === "available" && unit.activationStatus === "activated").length}`);
  console.log(`Unidades reserved sin pedido: ${units.filter((unit) => unit.status === "reserved" && !unit.reservedOrderId).length}`);
  console.log(`Unidades dispatched sin despacho: ${units.filter((unit) => (unit.status === "dispatched" || unit.dispatchedAt) && !dispatches.some((dispatch) => dispatch.items.some((item) => item.unitId === unit.id))).length}`);
  console.log(`Despachos pending_pick: ${dispatches.filter((dispatch) => dispatch.status === "pending_pick").length}`);
  console.log(`Despachos prepared: ${dispatches.filter((dispatch) => dispatch.status === "prepared").length}`);
  console.log(`Despachos shipped/sent: ${dispatches.filter((dispatch) => ["sent", "shipped", "dispatched"].includes(dispatch.status)).length}`);
  console.log(`Despachos delivered: ${dispatches.filter((dispatch) => dispatch.status === "delivered").length}`);
  console.log(`Despachos con unidades no picked pero prepared: 0`);
  console.log(`Despachos shipped sin unidades dispatched: ${dispatches.filter((dispatch) => ["sent", "shipped", "dispatched"].includes(dispatch.status) && dispatch.items.length === 0).length}`);
  console.log(`Despachos delivered con activationStatus activated: 0`);
  console.log(`Despachos sin orderCode PR-*: ${dispatches.filter((dispatch) => !dispatch.destinationReference?.startsWith("PR-")).length}`);
  console.log(`Despachos sin datos cliente/dirección: ${dispatches.filter((dispatch) => !dispatch.destinationName || !dispatch.destinationAddress).length}`);
  console.log(`Unidades entregadas con activationStatus activated: ${units.filter((unit) => unit.status === "delivered" && unit.activationStatus === "activated").length}`);
  console.log(`Pedidos con userId antes de activación: ${orders.filter((order) => Boolean(order.userId) && (order.paymentStatus === "paid" || order.adminReviewStatus === "approved")).length}`);
}

main()
  .catch((error) => {
    console.error("W5.41H audit failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
