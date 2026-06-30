import { PrismaClient } from "@prisma/client";

const CONFIRMATION_VALUE = "YES_RUN_COMMERCIAL_DISPATCH_SMOKE";
const TEST_PREFIX = "W531D_SMOKE";

const prisma = new PrismaClient();

type BalanceEvent = {
  eventType: string;
  quantity: number;
};

type StepResult = {
  step: string;
  ok: boolean;
  details: string;
};

const results: StepResult[] = [];

function assertEqual<T>(label: string, actual: T, expected: T) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${String(expected)}, got ${String(actual)}`);
  }
}

function assertPresent<T>(label: string, value: T | null | undefined): T {
  if (value === null || value === undefined || value === "") {
    throw new Error(`${label}: expected value, got ${String(value)}`);
  }

  return value;
}

function calculateFinishedGoodBalance(events: BalanceEvent[]) {
  return events.reduce((balance, event) => {
    if (
      event.eventType === "RECEIPT" ||
      event.eventType === "RELEASE" ||
      event.eventType === "RETURN" ||
      event.eventType === "ADJUSTMENT"
    ) {
      return balance + event.quantity;
    }

    if (event.eventType === "RESERVATION" || event.eventType === "ISSUE") {
      return balance - event.quantity;
    }

    return balance;
  }, 0);
}

async function getFinishedGoodBalance(finishedGoodId: string) {
  const events = await prisma.operationFinishedGoodEvent.findMany({
    where: { finishedGoodId },
    select: { eventType: true, quantity: true },
  });

  return calculateFinishedGoodBalance(events);
}

async function runStep<T>(
  step: string,
  action: () => Promise<T>,
  details: (value: T) => string
) {
  const value = await action();
  results.push({ step, ok: true, details: details(value) });
  return value;
}

async function main() {
  if (process.env.CONFIRM_COMMERCIAL_DISPATCH_SMOKE !== CONFIRMATION_VALUE) {
    throw new Error(
      `Set CONFIRM_COMMERCIAL_DISPATCH_SMOKE=${CONFIRMATION_VALUE} to create smoke-test operations data.`
    );
  }

  const timestamp = new Date()
    .toISOString()
    .replace(/[-:.TZ]/g, "")
    .slice(0, 14);
  const prefix = `${TEST_PREFIX}_${timestamp}`;

  const codes = {
    finishedGood: `${prefix}_FG`,
    commercialOrder: `${prefix}_COM`,
    dispatch: `DSP-${prefix}_COM`,
  };

  const finishedGood = await runStep(
    "1. Crear Producto Terminado con initialQuantity",
    () =>
      prisma.operationFinishedGood.create({
        data: {
          code: codes.finishedGood,
          name: "Smoke producto terminado comercial",
          productType: "smoke_commercial_finished_good",
          unit: "unit",
          notes: "W5.31D smoke test",
          events: {
            create: {
              eventType: "RECEIPT",
              quantity: 10,
              unit: "unit",
              reason: "W5.31D smoke initial receipt",
              referenceType: "smoke_test",
              referenceId: prefix,
              metadataJson: JSON.stringify({ source: "W5.31D" }),
            },
          },
        },
      }),
    (value) => `${value.code} (${value.id})`
  );

  const initialBalance = await runStep(
    "2. Confirmar balance inicial PT",
    () => getFinishedGoodBalance(finishedGood.id),
    (value) => `balance=${value}`
  );
  assertEqual("Initial finished good balance", initialBalance, 10);

  const commercialOrder = await runStep(
    "3. Crear pedido comercial con item PT",
    () =>
      prisma.operationCommercialOrder.create({
        data: {
          code: codes.commercialOrder,
          customerType: "customer",
          customerName: "Smoke cliente comercial",
          customerEmail: "smoke-commercial@example.com",
          salesChannel: "admin",
          paymentStatus: "pending",
          fulfillmentStatus: "pending",
          totalAmount: 100,
          currency: "USD",
          notes: "W5.31D smoke test",
          items: {
            create: {
              finishedGoodId: finishedGood.id,
              productCode: finishedGood.code,
              productName: finishedGood.name,
              quantity: 4,
              unitPrice: 25,
              totalPrice: 100,
              unit: "unit",
              notes: "W5.31D smoke commercial item",
            },
          },
          events: {
            create: {
              eventType: "CREATED",
              amount: 100,
              reason: "W5.31D smoke commercial order created",
              metadataJson: JSON.stringify({ smokePrefix: prefix }),
            },
          },
        },
      }),
    (value) => `${value.code} status=${value.status}`
  );

  await runStep(
    "4. Confirmar pedido comercial",
    async () => {
      await prisma.$transaction([
        prisma.operationCommercialOrderEvent.create({
          data: {
            commercialOrderId: commercialOrder.id,
            eventType: "CONFIRMED",
            amount: commercialOrder.totalAmount,
            reason: "W5.31D smoke confirmed",
          },
        }),
        prisma.operationCommercialOrder.update({
          where: { id: commercialOrder.id },
          data: { status: "confirmed" },
        }),
      ]);

      return prisma.operationCommercialOrder.findUniqueOrThrow({
        where: { id: commercialOrder.id },
      });
    },
    (value) => `status=${value.status}`
  );

  const confirmedCommercialOrder = await prisma.operationCommercialOrder.findUniqueOrThrow({
    where: { id: commercialOrder.id },
  });
  assertEqual("Commercial order status after CONFIRMED", confirmedCommercialOrder.status, "confirmed");

  const fulfillmentResult = await runStep(
    "5. Solicitar fulfillment y crear despacho draft",
    async () =>
      prisma.$transaction(async (tx) => {
        const order = await tx.operationCommercialOrder.findUniqueOrThrow({
          where: { id: commercialOrder.id },
          include: { items: true },
        });

        if (order.dispatchId) {
          throw new Error(`Commercial order already has dispatchId ${order.dispatchId}`);
        }

        if (order.items.length === 0 || order.items.some((item) => !item.finishedGoodId)) {
          throw new Error("Commercial order items require finishedGoodId");
        }

        const dispatch = await tx.operationDispatch.create({
          data: {
            code: codes.dispatch,
            status: "draft",
            destinationType: "customer",
            destinationName: order.customerName,
            destinationReference: order.code,
            notes: `Creado desde pedido comercial ${order.code}`,
            items: {
              create: order.items.map((item) => ({
                finishedGoodId: item.finishedGoodId as string,
                quantity: item.quantity,
                unit: item.unit,
                notes: item.notes || `Item comercial ${item.productName}`,
              })),
            },
            events: {
              create: {
                eventType: "CREATED",
                quantity: order.items.reduce((sum, item) => sum + item.quantity, 0),
                reason: `Despacho creado desde pedido comercial ${order.code}`,
                referenceType: "commercial_order",
                referenceId: order.id,
                metadataJson: JSON.stringify({
                  commercialOrderCode: order.code,
                  commercialOrderId: order.id,
                  itemCount: order.items.length,
                }),
              },
            },
          },
        });

        await tx.operationCommercialOrderEvent.create({
          data: {
            commercialOrderId: order.id,
            eventType: "FULFILLMENT_REQUESTED",
            amount: order.totalAmount,
            reason: "W5.31D smoke fulfillment requested",
            referenceType: "dispatch",
            referenceId: dispatch.id,
            metadataJson: JSON.stringify({ dispatchId: dispatch.id }),
          },
        });

        const updatedOrder = await tx.operationCommercialOrder.update({
          where: { id: order.id },
          data: {
            fulfillmentStatus: "requested",
            dispatchId: dispatch.id,
          },
        });

        return { dispatch, commercialOrder: updatedOrder };
      }),
    (value) => `dispatch=${value.dispatch.code} status=${value.dispatch.status}`
  );

  assertPresent("Commercial order dispatchId", fulfillmentResult.commercialOrder.dispatchId);
  assertEqual("Dispatch status after fulfillment request", fulfillmentResult.dispatch.status, "draft");
  assertEqual("Commercial fulfillmentStatus", fulfillmentResult.commercialOrder.fulfillmentStatus, "requested");

  const postFulfillmentBalance = await runStep(
    "6. Confirmar que fulfillment no mueve Inventario PT",
    () => getFinishedGoodBalance(finishedGood.id),
    (value) => `balance=${value}`
  );
  assertEqual("Finished good balance after FULFILLMENT_REQUESTED", postFulfillmentBalance, 10);

  const dispatch = fulfillmentResult.dispatch;

  await runStep(
    "7. Reservar despacho",
    async () => {
      await prisma.$transaction([
        prisma.operationDispatchEvent.create({
          data: {
            dispatchId: dispatch.id,
            eventType: "RESERVED",
            quantity: 4,
            reason: "W5.31D smoke reserved",
            referenceType: "commercial_order",
            referenceId: commercialOrder.id,
          },
        }),
        prisma.operationFinishedGoodEvent.create({
          data: {
            finishedGoodId: finishedGood.id,
            eventType: "RESERVATION",
            quantity: 4,
            unit: "unit",
            reason: `Reserva por despacho ${dispatch.code}`,
            referenceType: "dispatch",
            referenceId: dispatch.id,
            metadataJson: JSON.stringify({ dispatchCode: dispatch.code }),
          },
        }),
        prisma.operationDispatch.update({
          where: { id: dispatch.id },
          data: { status: "reserved" },
        }),
      ]);

      return prisma.operationDispatch.findUniqueOrThrow({ where: { id: dispatch.id } });
    },
    (value) => `status=${value.status}`
  );

  const postReservationBalance = await runStep(
    "8. Confirmar balance despues de reserva",
    () => getFinishedGoodBalance(finishedGood.id),
    (value) => `balance=${value}`
  );
  assertEqual("Finished good balance after RESERVED", postReservationBalance, 6);

  await runStep(
    "9. Despachar desde reserved sin doble descuento",
    async () => {
      await prisma.$transaction([
        prisma.operationDispatchEvent.create({
          data: {
            dispatchId: dispatch.id,
            eventType: "DISPATCHED",
            quantity: 4,
            reason: "W5.31D smoke dispatched",
            referenceType: "commercial_order",
            referenceId: commercialOrder.id,
          },
        }),
        prisma.operationFinishedGoodEvent.create({
          data: {
            finishedGoodId: finishedGood.id,
            eventType: "RELEASE",
            quantity: 4,
            unit: "unit",
            reason: `Liberacion previa a salida ${dispatch.code}`,
            referenceType: "dispatch",
            referenceId: dispatch.id,
            metadataJson: JSON.stringify({ dispatchCode: dispatch.code }),
          },
        }),
        prisma.operationFinishedGoodEvent.create({
          data: {
            finishedGoodId: finishedGood.id,
            eventType: "ISSUE",
            quantity: 4,
            unit: "unit",
            reason: `Salida por despacho ${dispatch.code}`,
            referenceType: "dispatch",
            referenceId: dispatch.id,
            metadataJson: JSON.stringify({ dispatchCode: dispatch.code }),
          },
        }),
        prisma.operationDispatch.update({
          where: { id: dispatch.id },
          data: {
            status: "dispatched",
            dispatchedAt: new Date(),
          },
        }),
      ]);

      return prisma.operationDispatch.findUniqueOrThrow({ where: { id: dispatch.id } });
    },
    (value) => `status=${value.status}`
  );

  const postDispatchBalance = await runStep(
    "10. Confirmar balance despues de despacho",
    () => getFinishedGoodBalance(finishedGood.id),
    (value) => `balance=${value}`
  );
  assertEqual("Finished good balance after DISPATCHED", postDispatchBalance, 6);

  await runStep(
    "11. Marcar despacho entregado",
    async () => {
      await prisma.$transaction([
        prisma.operationDispatchEvent.create({
          data: {
            dispatchId: dispatch.id,
            eventType: "DELIVERED",
            quantity: 4,
            reason: "W5.31D smoke delivered",
            referenceType: "commercial_order",
            referenceId: commercialOrder.id,
          },
        }),
        prisma.operationDispatch.update({
          where: { id: dispatch.id },
          data: {
            status: "delivered",
            deliveredAt: new Date(),
          },
        }),
      ]);

      return prisma.operationDispatch.findUniqueOrThrow({ where: { id: dispatch.id } });
    },
    (value) => `status=${value.status}`
  );

  const finalState = await runStep(
    "12. Confirmar estados finales y balance final",
    async () => {
      const [finalCommercialOrder, finalDispatch, finalBalance] = await Promise.all([
        prisma.operationCommercialOrder.findUniqueOrThrow({
          where: { id: commercialOrder.id },
          include: { dispatch: true },
        }),
        prisma.operationDispatch.findUniqueOrThrow({
          where: { id: dispatch.id },
        }),
        getFinishedGoodBalance(finishedGood.id),
      ]);

      assertEqual("Final commercial order status", finalCommercialOrder.status, "confirmed");
      assertEqual("Final commercial fulfillmentStatus", finalCommercialOrder.fulfillmentStatus, "requested");
      assertEqual("Final commercial dispatchId", finalCommercialOrder.dispatchId, dispatch.id);
      assertEqual("Final dispatch status", finalDispatch.status, "delivered");
      assertEqual("Final finished good balance", finalBalance, 6);

      return {
        commercialStatus: finalCommercialOrder.status,
        commercialFulfillmentStatus: finalCommercialOrder.fulfillmentStatus,
        dispatchStatus: finalDispatch.status,
        finalBalance,
      };
    },
    (value) =>
      `commercial=${value.commercialStatus}/${value.commercialFulfillmentStatus}, dispatch=${value.dispatchStatus}, balance=${value.finalBalance}`
  );

  console.log("Commercial dispatch E2E smoke completed");
  console.log("Codes:");
  console.table(codes);
  console.log("Balances:");
  console.table({
    initialBalance,
    postFulfillmentBalance,
    postReservationBalance,
    postDispatchBalance,
    finalBalance: finalState.finalBalance,
  });
  console.log("Steps:");
  console.table(results);
  console.log("Summary:");
  console.table(finalState);
}

main()
  .catch((error) => {
    console.error("Commercial dispatch E2E smoke failed");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
