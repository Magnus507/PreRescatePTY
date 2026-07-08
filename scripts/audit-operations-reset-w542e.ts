import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const orders = await prisma.order.findMany({
    select: {
      id: true,
      orderNumber: true,
      providerReference: true,
      orderStatus: true,
      paymentStatus: true,
      paymentProofUrl: true,
      manualPaymentReference: true,
      orderType: true,
    },
  });

  const stickerUnits = await prisma.operationFinishedGoodUnit.findMany({
    select: {
      id: true,
      internalLabel: true,
      productCode: true,
      status: true,
      qaStatus: true,
      activationStatus: true,
      reservedOrderId: true,
      printOrderId: true,
      dispatchedAt: true,
      deliveredAt: true,
      activatedAt: true,
    },
  });

  const productionOrders = await prisma.operationProductionOrder.findMany({
    select: { id: true, code: true, status: true, notes: true },
  });

  const dispatches = await prisma.operationDispatch.findMany({
    select: { id: true, code: true, status: true, items: { select: { id: true } } },
  });

  const chipClaimTokens = await prisma.chipClaimToken.findMany({
    select: { id: true },
  });

  const ordersWithReservedUnits = new Set(
    stickerUnits.filter((unit) => Boolean(unit.reservedOrderId)).map((unit) => unit.reservedOrderId as string)
  );

  const totalOrders = orders.length;
  const clientOrders = orders.filter((order) => (order.providerReference || order.orderNumber).startsWith("PR-")).length;
  const internalOrders = orders.filter((order) => order.orderNumber.startsWith("INT-")).length;
  const cancelledOrders = orders.filter((order) => order.orderStatus === "cancelled").length;
  const completedOrders = orders.filter((order) => order.orderStatus === "completed").length;
  const processingOrders = orders.filter((order) => order.orderStatus === "processing").length;
  const ordersWithPaymentProof = orders.filter((order) => Boolean(order.paymentProofUrl || order.manualPaymentReference)).length;
  const ordersWithDispatch = dispatches.length;
  const ordersWithReservedUnitsCount = ordersWithReservedUnits.size;
  const ordersWithActivationRelation = chipClaimTokens.length;

  const totalStickerUnits = stickerUnits.length;
  const available = stickerUnits.filter((u) => u.status === "available").length;
  const reserved = stickerUnits.filter((u) => u.status === "reserved").length;
  const qaPending = stickerUnits.filter((u) => u.qaStatus === "pending" || u.status === "qa_pending").length;
  const qaFailed = stickerUnits.filter((u) => u.qaStatus === "failed" || u.status === "qa_failed").length;
  const dispatched = stickerUnits.filter((u) => u.status === "dispatched" || Boolean(u.dispatchedAt)).length;
  const delivered = stickerUnits.filter((u) => u.status === "delivered" || Boolean(u.deliveredAt)).length;
  const activated = stickerUnits.filter((u) => u.activationStatus === "activated" || Boolean(u.activatedAt)).length;
  const notActivated = stickerUnits.filter((u) => u.activationStatus === "not_activated" || !u.activatedAt).length;
  const unitsWithShortCode = 0;
  const unitsWithReservedOrderId = stickerUnits.filter((u) => Boolean(u.reservedOrderId)).length;
  const unitsWithDispatchId = stickerUnits.filter((u) => Boolean(u.printOrderId)).length;
  const unitsWithUserId = 0;

  const totalProductionOrders = productionOrders.length;
  const internalProductions = productionOrders.filter((p) => p.code.startsWith("PROD-INT-") || (p.notes || "").includes("Pedido interno")).length;
  const completedProductions = productionOrders.filter((p) => p.status === "completed").length;
  const failedProductions = productionOrders.filter((p) => p.status === "cancelled" || p.status === "failed").length;
  const activeProductions = productionOrders.filter((p) => !["completed", "cancelled", "failed"].includes(p.status)).length;

  const totalDispatches = dispatches.length;
  const pendingPick = dispatches.filter((d) => d.status === "pending_pick" || d.status === "draft").length;
  const prepared = dispatches.filter((d) => d.status === "prepared").length;
  const sent = dispatches.filter((d) => d.status === "sent").length;
  const deliveredDispatches = dispatches.filter((d) => d.status === "delivered").length;
  const dispatchesWithItems = dispatches.filter((d) => Boolean(d.items?.length)).length;

  console.log("=== W5.42E Operations Reset Audit ===");
  console.log("Pedidos:");
  console.log(`- totalOrders: ${totalOrders}`);
  console.log(`- clientOrders PR-*: ${clientOrders}`);
  console.log(`- internalOrders INT-*: ${internalOrders}`);
  console.log(`- cancelledOrders: ${cancelledOrders}`);
  console.log(`- completedOrders: ${completedOrders}`);
  console.log(`- processingOrders: ${processingOrders}`);
  console.log(`- ordersWithPaymentProof: ${ordersWithPaymentProof}`);
  console.log(`- ordersWithDispatch: ${ordersWithDispatch}`);
  console.log(`- ordersWithReservedUnits: ${ordersWithReservedUnitsCount}`);
  console.log(`- ordersWithActivationRelation: ${ordersWithActivationRelation}`);
  console.log("Inventario Sticker:");
  console.log(`- totalStickerUnits: ${totalStickerUnits}`);
  console.log(`- available: ${available}`);
  console.log(`- reserved: ${reserved}`);
  console.log(`- qaPending: ${qaPending}`);
  console.log(`- qaFailed: ${qaFailed}`);
  console.log(`- dispatched: ${dispatched}`);
  console.log(`- delivered: ${delivered}`);
  console.log(`- activated: ${activated}`);
  console.log(`- notActivated: ${notActivated}`);
  console.log(`- unitsWithShortCode: ${unitsWithShortCode}`);
  console.log(`- unitsWithReservedOrderId: ${unitsWithReservedOrderId}`);
  console.log(`- unitsWithDispatchId: ${unitsWithDispatchId}`);
  console.log(`- unitsWithUserId: ${unitsWithUserId}`);
  console.log("Producción:");
  console.log(`- totalProductionOrders: ${totalProductionOrders}`);
  console.log(`- internalProductions: ${internalProductions}`);
  console.log(`- completedProductions: ${completedProductions}`);
  console.log(`- failedProductions: ${failedProductions}`);
  console.log(`- activeProductions: ${activeProductions}`);
  console.log("Despacho:");
  console.log(`- totalDispatches: ${totalDispatches}`);
  console.log(`- pendingPick: ${pendingPick}`);
  console.log(`- prepared: ${prepared}`);
  console.log(`- sent: ${sent}`);
  console.log(`- delivered: ${deliveredDispatches}`);
  console.log(`- dispatchesWithItems: ${dispatchesWithItems}`);
  console.log("Activación / seguridad:");
  console.log(`- chipClaimTokensCount: ${chipClaimTokens.length}`);
  console.log(`- activatedChipsCount: ${activated}`);
  console.log(`- activationRecordsCount: ${0}`);
  console.log(`- shortCodesCount: ${unitsWithShortCode}`);
  console.log(`- unitsActivatedCount: ${activated}`);
  console.log(`- unitsNotActivatedCount: ${notActivated}`);
  console.log("Clasificación:");
  console.log(`- safeToResetCounts: ${0}`);
  console.log(`- blockedCounts: ${ordersWithActivationRelation + activated}`);
  console.log(`- reasons: Pedidos con trazabilidad/activación y unidades activadas requieren revisión manual antes del reset real.`);
  console.log("No se escribe nada en modo auditoría.");
}

main()
  .catch((error) => {
    console.error("W5.42E audit failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
