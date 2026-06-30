import { PrismaClient } from "@prisma/client";

const CONFIRMATION_VALUE = "YES_RUN_AFTER_SALES_SMOKE";
const TEST_PREFIX = "W534C_SMOKE";

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

async function reserveDispatch(dispatchId: string, reason: string, referenceType: string, referenceId: string) {
  return prisma.$transaction(async (tx) => {
    const dispatch = await tx.operationDispatch.findUniqueOrThrow({
      where: { id: dispatchId },
      include: { items: true },
    });

    const totalQuantity = dispatch.items.reduce((sum, item) => sum + item.quantity, 0);
    const event = await tx.operationDispatchEvent.create({
      data: {
        dispatchId,
        eventType: "RESERVED",
        quantity: totalQuantity,
        reason,
        referenceType,
        referenceId,
      },
    });

    await tx.operationFinishedGoodEvent.createMany({
      data: dispatch.items.map((item) => ({
        finishedGoodId: item.finishedGoodId,
        eventType: "RESERVATION",
        quantity: item.quantity,
        unit: item.unit,
        reason: `Reserva por despacho ${dispatch.code}`,
        referenceType: "dispatch",
        referenceId: dispatch.id,
        metadataJson: JSON.stringify({ dispatchCode: dispatch.code, dispatchEventId: event.id }),
      })),
    });

    return tx.operationDispatch.update({
      where: { id: dispatchId },
      data: { status: "reserved" },
    });
  });
}

async function dispatchReservedDispatch(
  dispatchId: string,
  reason: string,
  referenceType: string,
  referenceId: string
) {
  return prisma.$transaction(async (tx) => {
    const dispatch = await tx.operationDispatch.findUniqueOrThrow({
      where: { id: dispatchId },
      include: { items: true },
    });

    const totalQuantity = dispatch.items.reduce((sum, item) => sum + item.quantity, 0);
    const event = await tx.operationDispatchEvent.create({
      data: {
        dispatchId,
        eventType: "DISPATCHED",
        quantity: totalQuantity,
        reason,
        referenceType,
        referenceId,
      },
    });

    await tx.operationFinishedGoodEvent.createMany({
      data: dispatch.items.flatMap((item) => [
        {
          finishedGoodId: item.finishedGoodId,
          eventType: "RELEASE",
          quantity: item.quantity,
          unit: item.unit,
          reason: `Liberacion previa a salida ${dispatch.code}`,
          referenceType: "dispatch",
          referenceId: dispatch.id,
          metadataJson: JSON.stringify({ dispatchCode: dispatch.code, dispatchEventId: event.id }),
        },
        {
          finishedGoodId: item.finishedGoodId,
          eventType: "ISSUE",
          quantity: item.quantity,
          unit: item.unit,
          reason: `Salida por despacho ${dispatch.code}`,
          referenceType: "dispatch",
          referenceId: dispatch.id,
          metadataJson: JSON.stringify({ dispatchCode: dispatch.code, dispatchEventId: event.id }),
        },
      ]),
    });

    return tx.operationDispatch.update({
      where: { id: dispatchId },
      data: {
        status: "dispatched",
        dispatchedAt: new Date(),
      },
    });
  });
}

async function deliverDispatch(dispatchId: string, reason: string, referenceType: string, referenceId: string) {
  return prisma.$transaction(async (tx) => {
    const dispatch = await tx.operationDispatch.findUniqueOrThrow({
      where: { id: dispatchId },
      include: { items: true },
    });

    await tx.operationDispatchEvent.create({
      data: {
        dispatchId,
        eventType: "DELIVERED",
        quantity: dispatch.items.reduce((sum, item) => sum + item.quantity, 0),
        reason,
        referenceType,
        referenceId,
      },
    });

    return tx.operationDispatch.update({
      where: { id: dispatchId },
      data: {
        status: "delivered",
        deliveredAt: new Date(),
      },
    });
  });
}

async function main() {
  if (process.env.CONFIRM_AFTER_SALES_SMOKE !== CONFIRMATION_VALUE) {
    throw new Error(
      `Set CONFIRM_AFTER_SALES_SMOKE=${CONFIRMATION_VALUE} to create smoke-test after-sales data.`
    );
  }

  const timestamp = new Date()
    .toISOString()
    .replace(/[-:.TZ]/g, "")
    .slice(0, 14);
  const prefix = `${TEST_PREFIX}_${timestamp}`;

  const codes = {
    originalFinishedGood: `${prefix}_FG_ORIG`,
    replacementFinishedGood: `${prefix}_FG_REPL`,
    commercialOrder: `${prefix}_COM`,
    originalDispatch: `${prefix}_DISP_ORIG`,
    warranty: `${prefix}_WAR`,
    replacement: `${prefix}_REP`,
    return: `${prefix}_RET`,
  };

  const originalFinishedGood = await runStep(
    "1. Crear FinishedGood original con initialQuantity",
    () =>
      prisma.operationFinishedGood.create({
        data: {
          code: codes.originalFinishedGood,
          name: "Smoke postventa producto original",
          productType: "smoke_after_sales_original",
          unit: "unit",
          notes: "W5.34C smoke test",
          events: {
            create: {
              eventType: "RECEIPT",
              quantity: 10,
              unit: "unit",
              reason: "W5.34C smoke original initial receipt",
              referenceType: "smoke_test",
              referenceId: prefix,
            },
          },
        },
      }),
    (value) => `${value.code} (${value.id})`
  );

  const replacementFinishedGood = await runStep(
    "2. Crear FinishedGood replacement con initialQuantity",
    () =>
      prisma.operationFinishedGood.create({
        data: {
          code: codes.replacementFinishedGood,
          name: "Smoke postventa producto reemplazo",
          productType: "smoke_after_sales_replacement",
          unit: "unit",
          notes: "W5.34C smoke test",
          events: {
            create: {
              eventType: "RECEIPT",
              quantity: 5,
              unit: "unit",
              reason: "W5.34C smoke replacement initial receipt",
              referenceType: "smoke_test",
              referenceId: prefix,
            },
          },
        },
      }),
    (value) => `${value.code} (${value.id})`
  );

  const originalInitialBalance = await runStep(
    "3. Confirmar balance inicial original",
    () => getFinishedGoodBalance(originalFinishedGood.id),
    (value) => `balance=${value}`
  );
  assertEqual("Original finished good initial balance", originalInitialBalance, 10);

  const replacementInitialBalance = await runStep(
    "4. Confirmar balance inicial replacement",
    () => getFinishedGoodBalance(replacementFinishedGood.id),
    (value) => `balance=${value}`
  );
  assertEqual("Replacement finished good initial balance", replacementInitialBalance, 5);

  const commercialOrder = await runStep(
    "5. Crear CommercialOrder con item original",
    () =>
      prisma.operationCommercialOrder.create({
        data: {
          code: codes.commercialOrder,
          status: "confirmed",
          customerType: "customer",
          customerName: "Smoke cliente postventa",
          customerEmail: "smoke-after-sales@example.com",
          customerPhone: "+50700000000",
          salesChannel: "admin",
          paymentStatus: "paid",
          fulfillmentStatus: "requested",
          totalAmount: 50,
          currency: "USD",
          notes: "W5.34C smoke test",
          items: {
            create: {
              finishedGoodId: originalFinishedGood.id,
              productCode: originalFinishedGood.code,
              productName: originalFinishedGood.name,
              quantity: 2,
              unitPrice: 25,
              totalPrice: 50,
              unit: "unit",
              notes: "W5.34C smoke original item",
            },
          },
          events: {
            create: [
              {
                eventType: "CREATED",
                amount: 50,
                reason: "W5.34C smoke commercial order created",
                metadataJson: JSON.stringify({ smokePrefix: prefix }),
              },
              {
                eventType: "CONFIRMED",
                amount: 50,
                reason: "W5.34C smoke commercial order confirmed",
              },
            ],
          },
        },
        include: { items: true },
      }),
    (value) => `${value.code} status=${value.status}`
  );

  const originalDispatch = await runStep(
    "6. Crear despacho original draft",
    () =>
      prisma.operationDispatch.create({
        data: {
          code: codes.originalDispatch,
          destinationType: "customer",
          destinationName: commercialOrder.customerName,
          destinationReference: commercialOrder.code,
          notes: "W5.34C smoke original dispatch",
          items: {
            create: {
              finishedGoodId: originalFinishedGood.id,
              quantity: 2,
              unit: "unit",
              notes: "W5.34C smoke original dispatch item",
            },
          },
          events: {
            create: {
              eventType: "CREATED",
              quantity: 2,
              reason: "W5.34C smoke original dispatch created",
              referenceType: "commercial_order",
              referenceId: commercialOrder.id,
            },
          },
        },
      }),
    (value) => `${value.code} status=${value.status}`
  );

  await runStep(
    "7. Vincular despacho original a CommercialOrder",
    () =>
      prisma.operationCommercialOrder.update({
        where: { id: commercialOrder.id },
        data: { dispatchId: originalDispatch.id },
      }),
    (value) => `dispatchId=${value.dispatchId}`
  );

  await runStep(
    "8. Reservar despacho original",
    () =>
      reserveDispatch(
        originalDispatch.id,
        "W5.34C smoke original reserved",
        "commercial_order",
        commercialOrder.id
      ),
    (value) => `status=${value.status}`
  );

  await runStep(
    "9. Despachar despacho original",
    () =>
      dispatchReservedDispatch(
        originalDispatch.id,
        "W5.34C smoke original dispatched",
        "commercial_order",
        commercialOrder.id
      ),
    (value) => `status=${value.status}`
  );

  await runStep(
    "10. Entregar despacho original",
    () =>
      deliverDispatch(
        originalDispatch.id,
        "W5.34C smoke original delivered",
        "commercial_order",
        commercialOrder.id
      ),
    (value) => `status=${value.status}`
  );

  const originalPostDispatchBalance = await runStep(
    "11. Confirmar balance original post-despacho",
    () => getFinishedGoodBalance(originalFinishedGood.id),
    (value) => `balance=${value}`
  );
  assertEqual("Original finished good balance after original dispatch", originalPostDispatchBalance, 8);

  const commercialOrderItemId = assertPresent(
    "Commercial order item id",
    commercialOrder.items[0]?.id
  );

  const warranty = await runStep(
    "12. Crear garantia vinculada",
    () =>
      prisma.operationWarranty.create({
        data: {
          code: codes.warranty,
          warrantyType: "standard",
          coverageStatus: "valid",
          customerName: commercialOrder.customerName,
          customerEmail: commercialOrder.customerEmail,
          customerPhone: commercialOrder.customerPhone,
          serialReference: `${prefix}_SERIAL`,
          commercialOrderId: commercialOrder.id,
          commercialOrderItemId,
          finishedGoodId: originalFinishedGood.id,
          dispatchId: originalDispatch.id,
          notes: "W5.34C smoke warranty",
          events: {
            create: {
              eventType: "CREATED",
              reason: "W5.34C smoke warranty created",
              metadataJson: JSON.stringify({ smokePrefix: prefix }),
            },
          },
        },
      }),
    (value) => `${value.code} coverage=${value.coverageStatus}`
  );

  await runStep(
    "13. Abrir reclamo de garantia",
    async () => {
      await prisma.$transaction([
        prisma.operationWarrantyEvent.create({
          data: {
            warrantyId: warranty.id,
            eventType: "CLAIM_OPENED",
            reason: "W5.34C smoke claim opened",
          },
        }),
        prisma.operationWarranty.update({
          where: { id: warranty.id },
          data: { coverageStatus: "claim_open" },
        }),
      ]);

      return prisma.operationWarranty.findUniqueOrThrow({ where: { id: warranty.id } });
    },
    (value) => `coverage=${value.coverageStatus}`
  );

  const warrantyClaimOpen = await prisma.operationWarranty.findUniqueOrThrow({ where: { id: warranty.id } });
  assertEqual("Warranty coverage after CLAIM_OPENED", warrantyClaimOpen.coverageStatus, "claim_open");

  await runStep(
    "14. Cerrar reclamo de garantia",
    async () => {
      await prisma.$transaction([
        prisma.operationWarrantyEvent.create({
          data: {
            warrantyId: warranty.id,
            eventType: "CLAIM_CLOSED",
            reason: "W5.34C smoke claim closed",
          },
        }),
        prisma.operationWarranty.update({
          where: { id: warranty.id },
          data: { coverageStatus: "claim_closed" },
        }),
      ]);

      return prisma.operationWarranty.findUniqueOrThrow({ where: { id: warranty.id } });
    },
    (value) => `coverage=${value.coverageStatus}`
  );

  const replacement = await runStep(
    "15. Crear reemplazo vinculado",
    () =>
      prisma.operationReplacement.create({
        data: {
          code: codes.replacement,
          replacementType: "warranty",
          reason: "W5.34C smoke replacement",
          customerName: commercialOrder.customerName,
          customerEmail: commercialOrder.customerEmail,
          customerPhone: commercialOrder.customerPhone,
          warrantyId: warranty.id,
          commercialOrderId: commercialOrder.id,
          originalFinishedGoodId: originalFinishedGood.id,
          replacementFinishedGoodId: replacementFinishedGood.id,
          originalDispatchId: originalDispatch.id,
          notes: "W5.34C smoke replacement",
          events: {
            create: {
              eventType: "CREATED",
              reason: "W5.34C smoke replacement created",
              metadataJson: JSON.stringify({ smokePrefix: prefix }),
            },
          },
        },
      }),
    (value) => `${value.code} status=${value.status}`
  );

  await runStep(
    "16. Aprobar reemplazo",
    async () => {
      await prisma.$transaction([
        prisma.operationReplacementEvent.create({
          data: {
            replacementId: replacement.id,
            eventType: "APPROVED",
            reason: "W5.34C smoke replacement approved",
          },
        }),
        prisma.operationReplacement.update({
          where: { id: replacement.id },
          data: { status: "approved", approvedAt: new Date() },
        }),
      ]);

      return prisma.operationReplacement.findUniqueOrThrow({ where: { id: replacement.id } });
    },
    (value) => `status=${value.status}`
  );

  await runStep(
    "17. Preparar reemplazo",
    async () => {
      await prisma.$transaction([
        prisma.operationReplacementEvent.create({
          data: {
            replacementId: replacement.id,
            eventType: "REPLACEMENT_PREPARED",
            reason: "W5.34C smoke replacement prepared",
          },
        }),
        prisma.operationReplacement.update({
          where: { id: replacement.id },
          data: { status: "prepared" },
        }),
      ]);

      return prisma.operationReplacement.findUniqueOrThrow({ where: { id: replacement.id } });
    },
    (value) => `status=${value.status}`
  );

  const replacementDispatchResult = await runStep(
    "18. Crear despacho de reemplazo",
    async () =>
      prisma.$transaction(async (tx) => {
        const event = await tx.operationReplacementEvent.create({
          data: {
            replacementId: replacement.id,
            eventType: "DISPATCH_CREATED",
            reason: "W5.34C smoke replacement dispatch created",
          },
        });

        const dispatch = await tx.operationDispatch.create({
          data: {
            code: `${replacement.code}-DISPATCH`,
            destinationType: "customer",
            destinationName: replacement.customerName,
            destinationReference: replacement.code,
            notes: "W5.34C smoke replacement dispatch",
            items: {
              create: {
                finishedGoodId: replacementFinishedGood.id,
                quantity: 1,
                unit: replacementFinishedGood.unit,
                notes: `Item de reemplazo ${replacement.code}`,
              },
            },
            events: {
              create: {
                eventType: "CREATED",
                quantity: 1,
                reason: `Despacho creado desde reemplazo ${replacement.code}`,
                referenceType: "replacement",
                referenceId: replacement.id,
                metadataJson: JSON.stringify({
                  replacementCode: replacement.code,
                  replacementEventId: event.id,
                  replacementFinishedGoodCode: replacementFinishedGood.code,
                }),
              },
            },
          },
        });

        const updatedReplacement = await tx.operationReplacement.update({
          where: { id: replacement.id },
          data: {
            status: "prepared",
            replacementDispatchId: dispatch.id,
          },
        });

        return { dispatch, replacement: updatedReplacement };
      }),
    (value) => `dispatch=${value.dispatch.code} status=${value.dispatch.status}`
  );

  assertPresent("Replacement dispatchId", replacementDispatchResult.replacement.replacementDispatchId);
  assertEqual("Replacement dispatch status after DISPATCH_CREATED", replacementDispatchResult.dispatch.status, "draft");

  const replacementPostDispatchCreatedBalance = await runStep(
    "19. Confirmar que DISPATCH_CREATED no mueve Inventario PT",
    () => getFinishedGoodBalance(replacementFinishedGood.id),
    (value) => `balance=${value}`
  );
  assertEqual(
    "Replacement finished good balance after DISPATCH_CREATED",
    replacementPostDispatchCreatedBalance,
    5
  );

  await runStep(
    "20. Reservar despacho de reemplazo",
    () =>
      reserveDispatch(
        replacementDispatchResult.dispatch.id,
        "W5.34C smoke replacement reserved",
        "replacement",
        replacement.id
      ),
    (value) => `status=${value.status}`
  );

  const replacementPostReservationBalance = await runStep(
    "21. Confirmar balance replacement post-reserva",
    () => getFinishedGoodBalance(replacementFinishedGood.id),
    (value) => `balance=${value}`
  );
  assertEqual("Replacement finished good balance after RESERVED", replacementPostReservationBalance, 4);

  await runStep(
    "22. Despachar reemplazo sin doble descuento",
    () =>
      dispatchReservedDispatch(
        replacementDispatchResult.dispatch.id,
        "W5.34C smoke replacement dispatched",
        "replacement",
        replacement.id
      ),
    (value) => `status=${value.status}`
  );

  const replacementPostDispatchBalance = await runStep(
    "23. Confirmar balance replacement post-despacho",
    () => getFinishedGoodBalance(replacementFinishedGood.id),
    (value) => `balance=${value}`
  );
  assertEqual("Replacement finished good balance after DISPATCHED", replacementPostDispatchBalance, 4);

  await runStep(
    "24. Entregar despacho de reemplazo",
    () =>
      deliverDispatch(
        replacementDispatchResult.dispatch.id,
        "W5.34C smoke replacement delivered",
        "replacement",
        replacement.id
      ),
    (value) => `status=${value.status}`
  );

  const operationReturn = await runStep(
    "25. Crear devolucion vinculada",
    () =>
      prisma.operationReturn.create({
        data: {
          code: codes.return,
          returnType: "warranty_return",
          reason: "W5.34C smoke return",
          customerName: commercialOrder.customerName,
          customerEmail: commercialOrder.customerEmail,
          customerPhone: commercialOrder.customerPhone,
          warrantyId: warranty.id,
          replacementId: replacement.id,
          commercialOrderId: commercialOrder.id,
          finishedGoodId: originalFinishedGood.id,
          originalDispatchId: originalDispatch.id,
          notes: "W5.34C smoke return",
          events: {
            create: {
              eventType: "CREATED",
              reason: "W5.34C smoke return created",
              metadataJson: JSON.stringify({ smokePrefix: prefix }),
            },
          },
        },
      }),
    (value) => `${value.code} status=${value.status}`
  );

  await runStep(
    "26. Recibir devolucion",
    async () => {
      await prisma.$transaction([
        prisma.operationReturnEvent.create({
          data: {
            returnId: operationReturn.id,
            eventType: "RECEIVED",
            quantity: 1,
            reason: "W5.34C smoke return received",
          },
        }),
        prisma.operationReturn.update({
          where: { id: operationReturn.id },
          data: {
            status: "received",
            receivedQuantity: { increment: 1 },
            receivedAt: new Date(),
          },
        }),
      ]);

      return prisma.operationReturn.findUniqueOrThrow({ where: { id: operationReturn.id } });
    },
    (value) => `status=${value.status}, received=${value.receivedQuantity}`
  );

  await runStep(
    "27. Inspeccionar devolucion",
    async () => {
      await prisma.$transaction([
        prisma.operationReturnEvent.create({
          data: {
            returnId: operationReturn.id,
            eventType: "INSPECTED",
            reason: "W5.34C smoke return inspected",
          },
        }),
        prisma.operationReturn.update({
          where: { id: operationReturn.id },
          data: {
            status: "inspected",
            inspectedAt: new Date(),
          },
        }),
      ]);

      return prisma.operationReturn.findUniqueOrThrow({ where: { id: operationReturn.id } });
    },
    (value) => `status=${value.status}`
  );

  await runStep(
    "28. Aceptar devolucion",
    async () => {
      await prisma.$transaction([
        prisma.operationReturnEvent.create({
          data: {
            returnId: operationReturn.id,
            eventType: "ACCEPTED",
            quantity: 1,
            reason: "W5.34C smoke return accepted",
          },
        }),
        prisma.operationReturn.update({
          where: { id: operationReturn.id },
          data: { acceptedQuantity: { increment: 1 } },
        }),
      ]);

      return prisma.operationReturn.findUniqueOrThrow({ where: { id: operationReturn.id } });
    },
    (value) => `accepted=${value.acceptedQuantity}`
  );

  const returnToInventoryResult = await runStep(
    "29. Retornar devolucion a Inventario PT",
    async () =>
      prisma.$transaction(async (tx) => {
        const returnEvent = await tx.operationReturnEvent.create({
          data: {
            returnId: operationReturn.id,
            eventType: "RETURNED_TO_INVENTORY",
            quantity: 1,
            reason: "W5.34C smoke return to inventory",
          },
        });

        const finishedGoodEvent = await tx.operationFinishedGoodEvent.create({
          data: {
            finishedGoodId: originalFinishedGood.id,
            eventType: "RETURN",
            quantity: 1,
            unit: originalFinishedGood.unit,
            reason: `Retorno por devolucion ${operationReturn.code}`,
            referenceType: "return",
            referenceId: operationReturn.id,
            metadataJson: JSON.stringify({
              returnCode: operationReturn.code,
              returnEventId: returnEvent.id,
              finishedGoodCode: originalFinishedGood.code,
            }),
          },
        });

        const updatedReturn = await tx.operationReturn.update({
          where: { id: operationReturn.id },
          data: { resolution: "returned_to_inventory" },
        });

        return { returnEvent, finishedGoodEvent, operationReturn: updatedReturn };
      }),
    (value) => `returnEvent=${value.returnEvent.eventType}, finishedGoodEvent=${value.finishedGoodEvent.eventType}`
  );
  assertEqual("FinishedGood event created by RETURNED_TO_INVENTORY", returnToInventoryResult.finishedGoodEvent.eventType, "RETURN");

  const originalPostReturnBalance = await runStep(
    "30. Confirmar balance original post-return",
    () => getFinishedGoodBalance(originalFinishedGood.id),
    (value) => `balance=${value}`
  );
  assertEqual("Original finished good balance after RETURNED_TO_INVENTORY", originalPostReturnBalance, 9);

  await runStep(
    "31. Completar devolucion",
    async () => {
      await prisma.$transaction([
        prisma.operationReturnEvent.create({
          data: {
            returnId: operationReturn.id,
            eventType: "COMPLETED",
            reason: "W5.34C smoke return completed",
          },
        }),
        prisma.operationReturn.update({
          where: { id: operationReturn.id },
          data: {
            status: "completed",
            completedAt: new Date(),
          },
        }),
      ]);

      return prisma.operationReturn.findUniqueOrThrow({ where: { id: operationReturn.id } });
    },
    (value) => `status=${value.status}`
  );

  const finalState = await runStep(
    "32. Confirmar estados finales y balances",
    async () => {
      const [
        finalWarranty,
        finalReplacement,
        finalReplacementDispatch,
        finalReturn,
        originalFinalBalance,
        replacementFinalBalance,
        returnFinishedGoodEventCount,
      ] = await Promise.all([
        prisma.operationWarranty.findUniqueOrThrow({ where: { id: warranty.id } }),
        prisma.operationReplacement.findUniqueOrThrow({ where: { id: replacement.id } }),
        prisma.operationDispatch.findUniqueOrThrow({ where: { id: replacementDispatchResult.dispatch.id } }),
        prisma.operationReturn.findUniqueOrThrow({ where: { id: operationReturn.id } }),
        getFinishedGoodBalance(originalFinishedGood.id),
        getFinishedGoodBalance(replacementFinishedGood.id),
        prisma.operationFinishedGoodEvent.count({
          where: {
            finishedGoodId: originalFinishedGood.id,
            eventType: "RETURN",
            referenceType: "return",
            referenceId: operationReturn.id,
          },
        }),
      ]);

      assertEqual("Final warranty coverageStatus", finalWarranty.coverageStatus, "claim_closed");
      assertEqual("Final replacement status", finalReplacement.status, "prepared");
      assertEqual("Final replacement dispatch status", finalReplacementDispatch.status, "delivered");
      assertEqual("Final return status", finalReturn.status, "completed");
      assertEqual("Final return resolution", finalReturn.resolution, "returned_to_inventory");
      assertEqual("Final original balance", originalFinalBalance, 9);
      assertEqual("Final replacement balance", replacementFinalBalance, 4);
      assertEqual("RETURN event count for original finished good", returnFinishedGoodEventCount, 1);

      return {
        warrantyStatus: finalWarranty.status,
        warrantyCoverageStatus: finalWarranty.coverageStatus,
        replacementStatus: finalReplacement.status,
        replacementDispatchStatus: finalReplacementDispatch.status,
        returnStatus: finalReturn.status,
        returnResolution: finalReturn.resolution,
        originalFinalBalance,
        replacementFinalBalance,
      };
    },
    (value) =>
      `warranty=${value.warrantyStatus}/${value.warrantyCoverageStatus}, replacement=${value.replacementStatus}, dispatch=${value.replacementDispatchStatus}, return=${value.returnStatus}/${value.returnResolution}, balances=${value.originalFinalBalance}/${value.replacementFinalBalance}`
  );

  console.log("After-sales E2E smoke completed");
  console.log("Codes:");
  console.table(codes);
  console.log("Balances:");
  console.table({
    originalInitialBalance,
    originalPostDispatchBalance,
    originalPostReturnBalance,
    originalFinalBalance: finalState.originalFinalBalance,
    replacementInitialBalance,
    replacementPostDispatchCreatedBalance,
    replacementPostReservationBalance,
    replacementPostDispatchBalance,
    replacementFinalBalance: finalState.replacementFinalBalance,
  });
  console.log("Steps:");
  console.table(results);
  console.log("Summary:");
  console.table(finalState);
}

main()
  .catch((error) => {
    console.error("After-sales E2E smoke failed");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
