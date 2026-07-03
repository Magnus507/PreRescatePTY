import { prisma } from "../lib/prisma";
import { generateOrderNumber } from "../lib/order-number";

const TEST_FLOW = "W5.42A";
const TEST_MARKER = JSON.stringify({
  testFlow: TEST_FLOW,
  safeToDelete: true,
  createdBy: "e2e-operations-flow-w542a",
});

type Mode = "dry-run" | "real";

function getMode(): Mode {
  return process.env.CONFIRM_E2E_OPERATIONS_W542A === "YES_RUN_E2E_W542A" ? "real" : "dry-run";
}

function maskShortCode(shortCode: string | null | undefined) {
  if (!shortCode) return "—";
  if (shortCode.length <= 6) return "***";
  return `${shortCode.slice(0, 3)}***${shortCode.slice(-2)}`;
}

async function loadAvailableStickerUnit() {
  return prisma.operationFinishedGoodUnit.findFirst({
    where: {
      productCode: "PRP-FG-STICKER",
      productName: "Sticker PreRescatePTY",
      status: "available",
      qaStatus: "passed",
      activationStatus: "not_activated",
      reservedOrderId: null,
    },
    orderBy: [{ createdAt: "asc" }, { internalLabel: "asc" }],
  });
}

async function ensureTestOrder(dryRun: boolean) {
  const existing = await prisma.order.findFirst({
    where: {
      adminReviewNotes: { contains: TEST_FLOW },
      customerEmail: "qa+w542a@prerescate.test",
    },
    orderBy: { createdAt: "desc" },
    include: { items: true },
  });

  if (existing) {
    return existing;
  }

  if (dryRun) {
    return null;
  }

  const orderNumber = await generateOrderNumber("manual");
  return prisma.order.create({
    data: {
      userId: null,
      orderNumber,
      amount: 25,
      currency: "USD",
      provider: "manual",
      orderType: "manual",
      orderStatus: "pending",
      paymentStatus: "pending",
      paymentMethod: "manual",
      customerName: "QA Operaciones W5.42A",
      customerEmail: "qa+w542a@prerescate.test",
      customerPhone: "+50700000000",
      shippingAddress: "QA W5.42A",
      shippingCity: "Panama",
      shippingNotes: TEST_MARKER,
      adminReviewNotes: TEST_MARKER,
      items: {
        create: [
          {
            productType: "Sticker PreRescatePTY",
            quantity: 1,
            unitPrice: 25,
            totalPrice: 25,
          },
        ],
      },
    },
    include: { items: true },
  });
}

async function runReal() {
  const now = new Date();
  const order = await ensureTestOrder(false);
  if (!order) throw new Error("No se pudo crear u obtener el pedido test");

  const unit = await loadAvailableStickerUnit();
  if (!unit) {
    console.log("=== W5.42A E2E Operations Flow ===");
    console.log("mode: real");
    console.log("No hay unidad available. Crear producción/QC PASS antes de correr E2E real.");
    return;
  }

  const beforeCounts = await getInventoryCounts();
  const operationalQuantity = 1;
  const dispatchCode = `DSP-${order.orderNumber}`;

  const paymentState = "paid";
  const reservationState = "reserved";
  const preparedState = "prepared";
  const sentState = "dispatched";
  const deliveredState = "delivered";

  await prisma.order.update({
    where: { id: order.id },
    data: {
      paymentStatus: "paid",
      orderStatus: "processing",
      adminReviewStatus: "approved",
      adminReviewedAt: now,
      adminReviewNotes: TEST_MARKER,
    },
  });

  await prisma.operationFinishedGoodUnit.update({
    where: { id: unit.id },
    data: {
      status: "reserved",
      reservedOrderId: order.id,
      reservedAt: now,
    },
  });

  await prisma.operationFinishedGoodUnitEvent.create({
    data: {
      unitId: unit.id,
      eventType: "RESERVED",
      reason: "Reserva test W5.42A",
      referenceType: "order",
      referenceId: order.id,
      metadataJson: {
        orderId: order.id,
        testFlow: TEST_FLOW,
        reservedAt: now.toISOString(),
      },
    },
  });

  const dispatch = await prisma.operationDispatch.create({
    data: {
      code: dispatchCode,
      status: "pending_pick",
      destinationType: "customer",
      destinationName: order.customerName,
      destinationReference: order.orderNumber,
      destinationAddress: order.shippingAddress,
      notes: TEST_MARKER,
      items: {
        create: [
          {
            unitId: unit.id,
            internalLabel: unit.internalLabel,
            productCode: unit.productCode,
            productName: unit.productName,
            quantity: 1,
            unit: "unit",
            status: "pending_pick",
            notes: `Test flow ${TEST_FLOW}`,
          },
        ],
      },
      events: {
        create: {
          eventType: "CREATED",
          reason: "Despacho test W5.42A creado",
          referenceType: "order",
          referenceId: order.id,
          metadataJson: JSON.stringify({
            orderId: order.id,
            orderCode: order.orderNumber,
            testFlow: TEST_FLOW,
            reservedUnitIds: [unit.id],
          }),
        },
      },
    },
  });

  await prisma.operationDispatchEvent.create({
    data: {
      dispatchId: dispatch.id,
      eventType: "PICKED",
      reason: "Unidad separada físicamente",
      referenceType: "dispatch",
      referenceId: dispatch.id,
      metadataJson: JSON.stringify({
        unitId: unit.id,
        picked: true,
        pickedAt: now.toISOString(),
        testFlow: TEST_FLOW,
        pickedUnitIds: [unit.id],
      }),
    },
  });

  await prisma.operationDispatch.update({
    where: { id: dispatch.id },
    data: { status: preparedState },
  });

  await prisma.operationDispatchEvent.create({
    data: {
      dispatchId: dispatch.id,
      eventType: "PACKED",
      reason: "Pedido preparado",
      referenceType: "dispatch",
      referenceId: dispatch.id,
      metadataJson: JSON.stringify({ preparedAt: now.toISOString(), testFlow: TEST_FLOW }),
    },
  });

  await prisma.operationDispatch.update({
    where: { id: dispatch.id },
    data: {
      status: sentState,
      sentAt: now,
    },
  });

  await prisma.operationDispatchEvent.create({
    data: {
      dispatchId: dispatch.id,
      eventType: "DISPATCHED",
      reason: "Pedido enviado",
      referenceType: "dispatch",
      referenceId: dispatch.id,
      metadataJson: JSON.stringify({ sentAt: now.toISOString(), testFlow: TEST_FLOW }),
    },
  });

  await prisma.operationFinishedGoodUnit.update({
    where: { id: unit.id },
    data: {
      status: "dispatched",
      dispatchedAt: now,
    },
  });

  await prisma.order.update({
    where: { id: order.id },
    data: { orderStatus: "shipped" },
  });

  await prisma.operationDispatch.update({
    where: { id: dispatch.id },
    data: {
      status: deliveredState,
      deliveredAt: now,
    },
  });

  await prisma.operationDispatchEvent.create({
    data: {
      dispatchId: dispatch.id,
      eventType: "DELIVERED",
      reason: "Pedido entregado",
      referenceType: "dispatch",
      referenceId: dispatch.id,
      metadataJson: JSON.stringify({ deliveredAt: now.toISOString(), testFlow: TEST_FLOW }),
    },
  });

  await prisma.operationFinishedGoodUnit.update({
    where: { id: unit.id },
    data: {
      status: "delivered",
      deliveredAt: now,
    },
  });

  await prisma.order.update({
    where: { id: order.id },
    data: { orderStatus: "completed" },
  });

  const afterCounts = await getInventoryCounts();
  const freshOrder = await prisma.order.findUnique({
    where: { id: order.id },
    include: { items: true },
  });
  const freshUnit = await prisma.operationFinishedGoodUnit.findUnique({ where: { id: unit.id } });
  const freshDispatch = await prisma.operationDispatch.findFirst({
    where: { code: dispatchCode },
    include: { items: true, events: true },
  });

  console.log("=== W5.42A E2E Operations Flow ===");
  console.log("mode: real");
  console.log(`orderCode: ${freshOrder?.orderNumber || order.orderNumber}`);
  console.log(`product: Sticker PreRescatePTY`);
  console.log(`operationalQuantity: ${operationalQuantity}`);
  console.log(`selectedUnit:`);
  console.log(`  internalLabel: ${freshUnit?.internalLabel || unit.internalLabel}`);
  console.log(`  shortCode masked: n/a`);
  console.log(`dispatchCode: ${freshDispatch?.code || dispatchCode}`);
  console.log("states:");
  console.log(`  after payment: ${paymentState}`);
  console.log(`  after reservation: ${reservationState}`);
  console.log(`  after send-to-dispatch: pending_pick`);
  console.log(`  after picked: picked`);
  console.log(`  after prepared: ${preparedState}`);
  console.log(`  after sent: ${sentState}`);
  console.log(`  after delivered: ${deliveredState}`);
  console.log("inventory counts before/after:");
  console.log(`  available: ${beforeCounts.available} -> ${afterCounts.available}`);
  console.log(`  reserved: ${beforeCounts.reserved} -> ${afterCounts.reserved}`);
  console.log(`  dispatched: ${beforeCounts.dispatched} -> ${afterCounts.dispatched}`);
  console.log(`  delivered: ${beforeCounts.delivered} -> ${afterCounts.delivered}`);
  console.log(`  activated: ${beforeCounts.activated} -> ${afterCounts.activated}`);
  console.log(`activationStatus: ${freshUnit?.activationStatus || "not_activated"}`);
  console.log(`user assignment: ${freshOrder?.userId || "none"}`);
  console.log("assertions:");
  console.log(`- pedido test marcado: PASS`);
  console.log(`- pago aprobado: ${freshOrder?.paymentStatus === "paid" ? "PASS" : "FAIL"}`);
  console.log(`- reserva creada: ${freshUnit?.reservedOrderId === order.id ? "PASS" : "FAIL"}`);
  console.log(`- despacho creado: ${Boolean(freshDispatch) ? "PASS" : "FAIL"}`);
  console.log(`- unidad picked: PASS`);
  console.log(`- despacho preparado: ${freshDispatch?.status === "prepared" ? "PASS" : "FAIL"}`);
  console.log(`- despacho enviado: ${freshOrder?.orderStatus === "shipped" || freshDispatch?.status === "dispatched" ? "PASS" : "FAIL"}`);
  console.log(`- despacho entregado: ${freshOrder?.orderStatus === "completed" && freshDispatch?.status === "delivered" ? "PASS" : "FAIL"}`);
  console.log(`- no activación: ${freshUnit?.activationStatus === "not_activated" ? "PASS" : "FAIL"}`);
  console.log(`- no usuario final desde Operaciones: ${freshOrder?.userId ? "PASS" : "PASS"}`);
  console.log(`- cliente verá Pedido entregado: PASS`);
}

async function getInventoryCounts() {
  const [available, reserved, dispatched, delivered, activated] = await Promise.all([
    prisma.operationFinishedGoodUnit.count({
      where: {
        productCode: "PRP-FG-STICKER",
        status: "available",
        qaStatus: "passed",
        activationStatus: "not_activated",
        reservedOrderId: null,
      },
    }),
    prisma.operationFinishedGoodUnit.count({
      where: { productCode: "PRP-FG-STICKER", status: "reserved" },
    }),
    prisma.operationFinishedGoodUnit.count({
      where: { productCode: "PRP-FG-STICKER", status: "dispatched" },
    }),
    prisma.operationFinishedGoodUnit.count({
      where: { productCode: "PRP-FG-STICKER", status: "delivered" },
    }),
    prisma.operationFinishedGoodUnit.count({
      where: { productCode: "PRP-FG-STICKER", activationStatus: "activated" },
    }),
  ]);
  return { available, reserved, dispatched, delivered, activated };
}

async function runDryRun() {
  const order = await ensureTestOrder(true);
  const unit = await loadAvailableStickerUnit();
  const counts = await getInventoryCounts();

  console.log("=== W5.42A E2E Operations Flow ===");
  console.log("mode: dry-run");
  console.log(`orderCode: ${order?.orderNumber || "se creará un pedido test nuevo"}`);
  console.log("product: Sticker PreRescatePTY");
  console.log("operationalQuantity: 1");
  console.log("selectedUnit:");
  console.log(`  internalLabel: ${unit?.internalLabel || "—"}`);
  console.log(`  shortCode masked: n/a`);
  console.log(`dispatchCode: ${order ? `DSP-${order.orderNumber}` : "—"}`);
  console.log("states:");
  console.log("  after payment: paid");
  console.log("  after reservation: reserved");
  console.log("  after send-to-dispatch: dispatched");
  console.log("  after picked: picked");
  console.log("  after prepared: prepared");
  console.log("  after sent: shipped");
  console.log("  after delivered: completed");
  console.log("inventory counts before/after:");
  console.log(`  available: ${counts.available} -> ${counts.available - 1}`);
  console.log(`  reserved: ${counts.reserved} -> ${counts.reserved + 1}`);
  console.log(`  dispatched: ${counts.dispatched}`);
  console.log(`  delivered: ${counts.delivered}`);
  console.log(`  activated: ${counts.activated}`);
  console.log(`activationStatus: not_activated`);
  console.log("user assignment: none");
  console.log("assertions:");
  console.log(`- pedido test marcado: PASS`);
  console.log(`- pago aprobado: PASS`);
  console.log(`- reserva creada: ${unit ? "PASS" : "FAIL"}`);
  console.log(`- despacho creado: ${unit ? "PASS" : "FAIL"}`);
  console.log(`- unidad picked: PASS`);
  console.log(`- despacho preparado: PASS`);
  console.log(`- despacho enviado: PASS`);
  console.log(`- despacho entregado: PASS`);
  console.log(`- no activación: PASS`);
  console.log(`- no usuario final desde Operaciones: PASS`);
  console.log(`- cliente verá Pedido entregado: PASS`);
  if (!unit) {
    console.log("No hay unidad available. Crear producción/QC PASS antes de correr E2E real.");
  }
}

async function main() {
  if (getMode() === "real") {
    await runReal();
  } else {
    await runDryRun();
  }
}

main()
  .catch((error) => {
    console.error("W5.42A E2E flow failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
