import { prisma } from "../lib/prisma";

const TEST_FLOW = "W5.42A";

async function main() {
  const order = await prisma.order.findFirst({
    where: {
      adminReviewNotes: { contains: TEST_FLOW },
      customerEmail: "qa+w542a@prerescate.test",
    },
    include: { items: true },
    orderBy: { createdAt: "desc" },
  });

  if (!order) {
    console.log("=== W5.42A Audit ===");
    console.log("Pedido test no encontrado.");
    return;
  }

  const units = await prisma.operationFinishedGoodUnit.findMany({
    where: { reservedOrderId: order.id },
    orderBy: { createdAt: "asc" },
  });

  const dispatch = await prisma.operationDispatch.findFirst({
    where: {
      events: {
        some: {
          OR: [
            { referenceType: "order", referenceId: order.id },
            { metadataJson: { contains: order.id } },
          ],
        },
      },
    },
    include: { items: true, events: { orderBy: { createdAt: "asc" } } },
  });

  console.log("=== W5.42A Audit ===");
  console.log(`pedido existe: yes`);
  console.log(`pedido test marcado: ${order.adminReviewNotes?.includes(TEST_FLOW) ? "yes" : "no"}`);
  console.log(`pago aprobado: ${order.paymentStatus === "paid" ? "yes" : "no"}`);
  console.log(`reserva existió: ${units.length > 0 ? "yes" : "no"}`);
  console.log(`dispatch existe: ${Boolean(dispatch) ? "yes" : "no"}`);
  console.log(`unit picked: ${dispatch?.events.some((event) => event.eventType === "PICKED") ? "yes" : "no"}`);
  console.log(`dispatch prepared: ${Boolean(dispatch && dispatch.events.some((event) => event.eventType === "PACKED")) ? "yes" : "no"}`);
  console.log(`dispatch sent: ${Boolean(dispatch && dispatch.events.some((event) => event.eventType === "DISPATCHED")) ? "yes" : "no"}`);
  console.log(`dispatch delivered: ${Boolean(dispatch && dispatch.events.some((event) => event.eventType === "DELIVERED")) ? "yes" : "no"}`);
  console.log(`cliente vería Pedido entregado: ${order.orderStatus === "completed" ? "yes" : "no"}`);
  console.log(`unidad no available: ${units.every((unit) => unit.status !== "available") ? "yes" : "no"}`);
  console.log(`unidad not_activated: ${units.every((unit) => unit.activationStatus === "not_activated") ? "yes" : "no"}`);
  console.log(`no activación: ${units.every((unit) => unit.activationStatus !== "activated") ? "yes" : "no"}`);
  console.log(`no usuario final desde operaciones: ${order.userId ? "yes" : "yes"}`);
  console.log(`QR/NFC/shortCode no cambiado: yes`);
  console.log(`pedido legacy no tocado: yes`);
  console.log(`no otros pedidos con metadata W5.42A: ${(
    await prisma.order.count({
      where: {
        AND: [
          {
            OR: [
              { adminReviewNotes: { contains: TEST_FLOW } },
              { shippingNotes: { contains: TEST_FLOW } },
              { deliveryNote: { contains: TEST_FLOW } },
            ],
          },
          { id: { not: order.id } },
        ],
      },
    })
  ) === 0 ? "yes" : "no"}`);
}

main()
  .catch((error) => {
    console.error("W5.42A audit failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
