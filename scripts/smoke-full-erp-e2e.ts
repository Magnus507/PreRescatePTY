import { PrismaClient } from "@prisma/client";

const CONFIRMATION_VALUE = "YES_RUN_FULL_ERP_SMOKE";
const TEST_PREFIX = "W535D_SMOKE";

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

function calculateMaterialBalance(events: BalanceEvent[]) {
  return events.reduce((balance, event) => {
    if (event.eventType === "RECEIPT" || event.eventType === "RELEASE") {
      return balance + event.quantity;
    }

    if (event.eventType === "ISSUE" || event.eventType === "RESERVATION") {
      return balance - event.quantity;
    }

    if (event.eventType === "ADJUSTMENT") {
      return balance + event.quantity;
    }

    return balance;
  }, 0);
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

async function getMaterialBalance(materialId: string) {
  const events = await prisma.operationMaterialEvent.findMany({
    where: { materialId },
    select: { eventType: true, quantity: true },
  });

  return calculateMaterialBalance(events);
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

async function reserveDispatch(
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

async function deliverDispatch(
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
  if (process.env.CONFIRM_FULL_ERP_SMOKE !== CONFIRMATION_VALUE) {
    throw new Error(
      `Set CONFIRM_FULL_ERP_SMOKE=${CONFIRMATION_VALUE} to create full ERP smoke-test data.`
    );
  }

  const timestamp = new Date()
    .toISOString()
    .replace(/[-:.TZ]/g, "")
    .slice(0, 14);
  const prefix = `${TEST_PREFIX}_${timestamp}`;

  const codes = {
    material: `${prefix}_MAT`,
    production: `${prefix}_PROD`,
    qc: `${prefix}_QC`,
    packing: `${prefix}_PACK`,
    packingLabel: `${prefix}_LBL`,
    originalFinishedGood: `${prefix}_FG_ORIG`,
    replacementFinishedGood: `${prefix}_FG_REPL`,
    commercialOrder: `${prefix}_COM`,
    commercialDispatch: `DSP-${prefix}_COM`,
    warranty: `${prefix}_WAR`,
    replacement: `${prefix}_REP`,
    return: `${prefix}_RET`,
  };

  const material = await runStep(
    "1. Crear material operativo",
    () =>
      prisma.operationMaterial.create({
        data: {
          code: codes.material,
          name: "Smoke ERP material",
          category: "smoke",
          unit: "unit",
          notes: "W5.35D full ERP smoke test",
        },
      }),
    (value) => `${value.code} (${value.id})`
  );

  await runStep(
    "2. Registrar RECEIPT de material",
    () =>
      prisma.operationMaterialEvent.create({
        data: {
          materialId: material.id,
          eventType: "RECEIPT",
          quantity: 100,
          unit: "unit",
          reason: "W5.35D smoke material receipt",
          referenceType: "smoke_test",
          referenceId: prefix,
        },
      }),
    (value) => `${value.eventType} ${value.quantity}`
  );

  const materialBalance = await runStep(
    "3. Confirmar balance material",
    () => getMaterialBalance(material.id),
    (value) => `balance=${value}`
  );
  assertEqual("Material balance", materialBalance, 100);

  const productionOrder = await runStep(
    "4. Crear orden de produccion",
    () =>
      prisma.operationProductionOrder.create({
        data: {
          code: codes.production,
          title: "Smoke ERP orden de produccion",
          plannedQuantity: 20,
          outputType: "smoke_finished_good",
          notes: "W5.35D full ERP smoke test",
          items: {
            create: {
              materialId: material.id,
              plannedQuantity: 20,
              unit: "unit",
            },
          },
          events: {
            create: {
              eventType: "CREATED",
              quantity: 20,
              reason: "W5.35D smoke production created",
              metadataJson: JSON.stringify({ smokePrefix: prefix }),
            },
          },
        },
      }),
    (value) => `${value.code} status=${value.status}`
  );

  await runStep(
    "5. Planificar produccion",
    async () => {
      await prisma.$transaction([
        prisma.operationProductionEvent.create({
          data: {
            productionOrderId: productionOrder.id,
            eventType: "PLANNED",
            reason: "W5.35D smoke production planned",
          },
        }),
        prisma.operationProductionOrder.update({
          where: { id: productionOrder.id },
          data: { status: "planned" },
        }),
      ]);

      return prisma.operationProductionOrder.findUniqueOrThrow({ where: { id: productionOrder.id } });
    },
    (value) => `status=${value.status}`
  );

  await runStep(
    "6. Iniciar produccion",
    async () => {
      await prisma.$transaction([
        prisma.operationProductionEvent.create({
          data: {
            productionOrderId: productionOrder.id,
            eventType: "STARTED",
            reason: "W5.35D smoke production started",
          },
        }),
        prisma.operationProductionOrder.update({
          where: { id: productionOrder.id },
          data: { status: "started" },
        }),
      ]);

      return prisma.operationProductionOrder.findUniqueOrThrow({ where: { id: productionOrder.id } });
    },
    (value) => `status=${value.status}`
  );

  await runStep(
    "7. Registrar producido",
    async () => {
      await prisma.$transaction([
        prisma.operationProductionEvent.create({
          data: {
            productionOrderId: productionOrder.id,
            eventType: "PRODUCED",
            quantity: 20,
            reason: "W5.35D smoke production produced",
          },
        }),
        prisma.operationProductionOrder.update({
          where: { id: productionOrder.id },
          data: { producedQuantity: { increment: 20 } },
        }),
      ]);

      return prisma.operationProductionOrder.findUniqueOrThrow({ where: { id: productionOrder.id } });
    },
    (value) => `producedQuantity=${value.producedQuantity}`
  );

  await runStep(
    "8. Completar produccion",
    async () => {
      await prisma.$transaction([
        prisma.operationProductionEvent.create({
          data: {
            productionOrderId: productionOrder.id,
            eventType: "COMPLETED",
            reason: "W5.35D smoke production completed",
          },
        }),
        prisma.operationProductionOrder.update({
          where: { id: productionOrder.id },
          data: { status: "completed" },
        }),
      ]);

      return prisma.operationProductionOrder.findUniqueOrThrow({ where: { id: productionOrder.id } });
    },
    (value) => `status=${value.status}, produced=${value.producedQuantity}`
  );

  const finalProduction = await prisma.operationProductionOrder.findUniqueOrThrow({
    where: { id: productionOrder.id },
  });
  assertEqual("Production final status", finalProduction.status, "completed");
  assertEqual("Production producedQuantity", finalProduction.producedQuantity, 20);

  const qcInspection = await runStep(
    "9. Crear QC vinculado",
    () =>
      prisma.operationQcInspection.create({
        data: {
          code: codes.qc,
          productionOrderId: productionOrder.id,
          inspectionType: "standard",
          notes: "W5.35D full ERP smoke test",
          events: {
            create: {
              eventType: "CREATED",
              reason: "W5.35D smoke QC created",
              metadataJson: JSON.stringify({ smokePrefix: prefix }),
            },
          },
        },
      }),
    (value) => `${value.code} status=${value.status}`
  );

  await runStep(
    "10. Iniciar QC",
    async () => {
      await prisma.$transaction([
        prisma.operationQcInspectionEvent.create({
          data: {
            qcInspectionId: qcInspection.id,
            eventType: "STARTED",
            reason: "W5.35D smoke QC started",
          },
        }),
        prisma.operationQcInspection.update({
          where: { id: qcInspection.id },
          data: { status: "in_progress" },
        }),
      ]);

      return prisma.operationQcInspection.findUniqueOrThrow({ where: { id: qcInspection.id } });
    },
    (value) => `status=${value.status}`
  );

  await runStep(
    "11. Aprobar QC",
    async () => {
      await prisma.$transaction([
        prisma.operationQcInspectionEvent.create({
          data: {
            qcInspectionId: qcInspection.id,
            eventType: "PASSED",
            quantity: 18,
            passedQuantity: 18,
            reason: "W5.35D smoke QC passed",
          },
        }),
        prisma.operationQcInspection.update({
          where: { id: qcInspection.id },
          data: {
            inspectedQuantity: { increment: 18 },
            passedQuantity: { increment: 18 },
          },
        }),
      ]);

      return prisma.operationQcInspection.findUniqueOrThrow({ where: { id: qcInspection.id } });
    },
    (value) => `inspected=${value.inspectedQuantity}, passed=${value.passedQuantity}`
  );

  await runStep(
    "12. Rechazar QC",
    async () => {
      await prisma.$transaction([
        prisma.operationQcInspectionEvent.create({
          data: {
            qcInspectionId: qcInspection.id,
            eventType: "FAILED",
            quantity: 2,
            failedQuantity: 2,
            reason: "W5.35D smoke QC failed",
          },
        }),
        prisma.operationQcInspection.update({
          where: { id: qcInspection.id },
          data: {
            inspectedQuantity: { increment: 2 },
            failedQuantity: { increment: 2 },
          },
        }),
      ]);

      return prisma.operationQcInspection.findUniqueOrThrow({ where: { id: qcInspection.id } });
    },
    (value) => `inspected=${value.inspectedQuantity}, failed=${value.failedQuantity}`
  );

  await runStep(
    "13. Completar QC",
    async () => {
      await prisma.$transaction([
        prisma.operationQcInspectionEvent.create({
          data: {
            qcInspectionId: qcInspection.id,
            eventType: "COMPLETED",
            reason: "W5.35D smoke QC completed",
          },
        }),
        prisma.operationQcInspection.update({
          where: { id: qcInspection.id },
          data: { status: "completed" },
        }),
      ]);

      return prisma.operationQcInspection.findUniqueOrThrow({ where: { id: qcInspection.id } });
    },
    (value) => `status=${value.status}`
  );

  const finalQc = await prisma.operationQcInspection.findUniqueOrThrow({
    where: { id: qcInspection.id },
  });
  assertEqual("QC final status", finalQc.status, "completed");
  assertEqual("QC passedQuantity", finalQc.passedQuantity, 18);
  assertEqual("QC failedQuantity", finalQc.failedQuantity, 2);

  const packingBatch = await runStep(
    "14. Crear batch de empaque",
    () =>
      prisma.operationPackingBatch.create({
        data: {
          code: codes.packing,
          productionOrderId: productionOrder.id,
          qcInspectionId: qcInspection.id,
          packageType: "standard",
          plannedQuantity: 18,
          labelCode: codes.packingLabel,
          notes: "W5.35D full ERP smoke test",
          events: {
            create: {
              eventType: "CREATED",
              reason: "W5.35D smoke packing created",
              metadataJson: JSON.stringify({ smokePrefix: prefix }),
            },
          },
        },
      }),
    (value) => `${value.code} status=${value.status}`
  );

  await runStep(
    "15. Iniciar empaque",
    async () => {
      await prisma.$transaction([
        prisma.operationPackingEvent.create({
          data: {
            packingBatchId: packingBatch.id,
            eventType: "STARTED",
            reason: "W5.35D smoke packing started",
          },
        }),
        prisma.operationPackingBatch.update({
          where: { id: packingBatch.id },
          data: { status: "in_progress" },
        }),
      ]);

      return prisma.operationPackingBatch.findUniqueOrThrow({ where: { id: packingBatch.id } });
    },
    (value) => `status=${value.status}`
  );

  await runStep(
    "16. Registrar empacado",
    async () => {
      await prisma.$transaction([
        prisma.operationPackingEvent.create({
          data: {
            packingBatchId: packingBatch.id,
            eventType: "PACKED",
            quantity: 18,
            reason: "W5.35D smoke packed",
          },
        }),
        prisma.operationPackingBatch.update({
          where: { id: packingBatch.id },
          data: { packedQuantity: { increment: 18 } },
        }),
      ]);

      return prisma.operationPackingBatch.findUniqueOrThrow({ where: { id: packingBatch.id } });
    },
    (value) => `packedQuantity=${value.packedQuantity}`
  );

  await runStep(
    "17. Marcar etiqueta impresa",
    async () => {
      await prisma.operationPackingEvent.create({
        data: {
          packingBatchId: packingBatch.id,
          eventType: "LABEL_PRINTED",
          reason: "W5.35D smoke label printed",
          metadataJson: JSON.stringify({ labelCode: codes.packingLabel }),
        },
      });

      return prisma.operationPackingBatch.findUniqueOrThrow({ where: { id: packingBatch.id } });
    },
    (value) => `label=${value.labelCode}`
  );

  await runStep(
    "18. Completar empaque",
    async () => {
      await prisma.$transaction([
        prisma.operationPackingEvent.create({
          data: {
            packingBatchId: packingBatch.id,
            eventType: "COMPLETED",
            reason: "W5.35D smoke packing completed",
          },
        }),
        prisma.operationPackingBatch.update({
          where: { id: packingBatch.id },
          data: { status: "completed" },
        }),
      ]);

      return prisma.operationPackingBatch.findUniqueOrThrow({ where: { id: packingBatch.id } });
    },
    (value) => `status=${value.status}`
  );

  const finalPacking = await prisma.operationPackingBatch.findUniqueOrThrow({
    where: { id: packingBatch.id },
  });
  assertEqual("Packing final status", finalPacking.status, "completed");
  assertEqual("Packing packedQuantity", finalPacking.packedQuantity, 18);

  const originalFinishedGood = await runStep(
    "19. Crear FG_ORIG con initialQuantity",
    () =>
      prisma.operationFinishedGood.create({
        data: {
          code: codes.originalFinishedGood,
          name: "Smoke ERP producto original",
          productType: "smoke_full_erp_original",
          unit: "unit",
          packingBatchId: packingBatch.id,
          notes: "W5.35D full ERP smoke test",
          events: {
            create: {
              eventType: "RECEIPT",
              quantity: 20,
              unit: "unit",
              reason: "W5.35D smoke original initial receipt",
              referenceType: "packing_batch",
              referenceId: packingBatch.id,
              metadataJson: JSON.stringify({ source: "W5.35D" }),
            },
          },
        },
      }),
    (value) => `${value.code} (${value.id})`
  );

  const replacementFinishedGood = await runStep(
    "20. Crear FG_REPL con initialQuantity",
    () =>
      prisma.operationFinishedGood.create({
        data: {
          code: codes.replacementFinishedGood,
          name: "Smoke ERP producto reemplazo",
          productType: "smoke_full_erp_replacement",
          unit: "unit",
          notes: "W5.35D full ERP smoke test",
          events: {
            create: {
              eventType: "RECEIPT",
              quantity: 5,
              unit: "unit",
              reason: "W5.35D smoke replacement initial receipt",
              referenceType: "smoke_test",
              referenceId: prefix,
            },
          },
        },
      }),
    (value) => `${value.code} (${value.id})`
  );

  const originalInitialBalance = await runStep(
    "21. Confirmar balance inicial FG_ORIG",
    () => getFinishedGoodBalance(originalFinishedGood.id),
    (value) => `balance=${value}`
  );
  assertEqual("FG_ORIG initial balance", originalInitialBalance, 20);

  const replacementInitialBalance = await runStep(
    "22. Confirmar balance inicial FG_REPL",
    () => getFinishedGoodBalance(replacementFinishedGood.id),
    (value) => `balance=${value}`
  );
  assertEqual("FG_REPL initial balance", replacementInitialBalance, 5);

  const commercialOrder = await runStep(
    "23. Crear pedido comercial",
    () =>
      prisma.operationCommercialOrder.create({
        data: {
          code: codes.commercialOrder,
          customerType: "customer",
          customerName: "Smoke ERP cliente",
          customerEmail: "smoke-full-erp@example.com",
          customerPhone: "+50700000000",
          salesChannel: "admin",
          paymentStatus: "pending",
          fulfillmentStatus: "pending",
          totalAmount: 75,
          currency: "USD",
          notes: "W5.35D full ERP smoke test",
          items: {
            create: {
              finishedGoodId: originalFinishedGood.id,
              productCode: originalFinishedGood.code,
              productName: originalFinishedGood.name,
              quantity: 3,
              unitPrice: 25,
              totalPrice: 75,
              unit: "unit",
              notes: "W5.35D smoke commercial item",
            },
          },
          events: {
            create: {
              eventType: "CREATED",
              amount: 75,
              reason: "W5.35D smoke commercial order created",
              metadataJson: JSON.stringify({ smokePrefix: prefix }),
            },
          },
        },
        include: { items: true },
      }),
    (value) => `${value.code} status=${value.status}`
  );

  await runStep(
    "24. Confirmar pedido comercial",
    async () => {
      await prisma.$transaction([
        prisma.operationCommercialOrderEvent.create({
          data: {
            commercialOrderId: commercialOrder.id,
            eventType: "CONFIRMED",
            amount: commercialOrder.totalAmount,
            reason: "W5.35D smoke commercial confirmed",
          },
        }),
        prisma.operationCommercialOrder.update({
          where: { id: commercialOrder.id },
          data: { status: "confirmed" },
        }),
      ]);

      return prisma.operationCommercialOrder.findUniqueOrThrow({ where: { id: commercialOrder.id } });
    },
    (value) => `status=${value.status}`
  );

  await runStep(
    "25. Marcar pedido pagado",
    async () => {
      await prisma.$transaction([
        prisma.operationCommercialOrderEvent.create({
          data: {
            commercialOrderId: commercialOrder.id,
            eventType: "PAID",
            amount: commercialOrder.totalAmount,
            reason: "W5.35D smoke commercial paid",
          },
        }),
        prisma.operationCommercialOrder.update({
          where: { id: commercialOrder.id },
          data: { paymentStatus: "paid" },
        }),
      ]);

      return prisma.operationCommercialOrder.findUniqueOrThrow({ where: { id: commercialOrder.id } });
    },
    (value) => `paymentStatus=${value.paymentStatus}`
  );

  const fulfillmentResult = await runStep(
    "26. Solicitar fulfillment y crear despacho draft",
    async () =>
      prisma.$transaction(async (tx) => {
        const order = await tx.operationCommercialOrder.findUniqueOrThrow({
          where: { id: commercialOrder.id },
          include: { items: true },
        });

        const dispatch = await tx.operationDispatch.create({
          data: {
            code: codes.commercialDispatch,
            status: "draft",
            destinationType: "customer",
            destinationName: order.customerName,
            destinationReference: order.code,
            notes: `Creado desde pedido comercial ${order.code}`,
            items: {
              create: order.items.map((item) => ({
                finishedGoodId: assertPresent("Commercial item finishedGoodId", item.finishedGoodId),
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
            reason: "W5.35D smoke fulfillment requested",
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

  assertPresent("Commercial dispatchId", fulfillmentResult.commercialOrder.dispatchId);
  assertEqual("Original dispatch draft status", fulfillmentResult.dispatch.status, "draft");

  const originalPostFulfillmentBalance = await runStep(
    "27. Confirmar fulfillment sin movimiento PT",
    () => getFinishedGoodBalance(originalFinishedGood.id),
    (value) => `balance=${value}`
  );
  assertEqual("FG_ORIG balance after FULFILLMENT_REQUESTED", originalPostFulfillmentBalance, 20);

  await runStep(
    "28. Reservar despacho original",
    () =>
      reserveDispatch(
        fulfillmentResult.dispatch.id,
        "W5.35D smoke original dispatch reserved",
        "commercial_order",
        commercialOrder.id
      ),
    (value) => `status=${value.status}`
  );

  const originalPostReservationBalance = await runStep(
    "29. Confirmar balance FG_ORIG post-reserva",
    () => getFinishedGoodBalance(originalFinishedGood.id),
    (value) => `balance=${value}`
  );
  assertEqual("FG_ORIG balance after RESERVED", originalPostReservationBalance, 17);

  await runStep(
    "30. Despachar original sin doble descuento",
    () =>
      dispatchReservedDispatch(
        fulfillmentResult.dispatch.id,
        "W5.35D smoke original dispatch dispatched",
        "commercial_order",
        commercialOrder.id
      ),
    (value) => `status=${value.status}`
  );

  const originalPostDispatchBalance = await runStep(
    "31. Confirmar balance FG_ORIG post-despacho",
    () => getFinishedGoodBalance(originalFinishedGood.id),
    (value) => `balance=${value}`
  );
  assertEqual("FG_ORIG balance after DISPATCHED", originalPostDispatchBalance, 17);

  await runStep(
    "32. Entregar despacho original",
    () =>
      deliverDispatch(
        fulfillmentResult.dispatch.id,
        "W5.35D smoke original dispatch delivered",
        "commercial_order",
        commercialOrder.id
      ),
    (value) => `status=${value.status}`
  );

  const commercialOrderItemId = assertPresent("Commercial order item id", commercialOrder.items[0]?.id);

  const warranty = await runStep(
    "33. Crear garantia vinculada",
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
          dispatchId: fulfillmentResult.dispatch.id,
          notes: "W5.35D full ERP smoke test",
          events: {
            create: {
              eventType: "CREATED",
              reason: "W5.35D smoke warranty created",
              metadataJson: JSON.stringify({ smokePrefix: prefix }),
            },
          },
        },
      }),
    (value) => `${value.code} coverage=${value.coverageStatus}`
  );

  await runStep(
    "34. Activar garantia",
    async () => {
      await prisma.$transaction([
        prisma.operationWarrantyEvent.create({
          data: {
            warrantyId: warranty.id,
            eventType: "ACTIVATED",
            reason: "W5.35D smoke warranty activated",
          },
        }),
        prisma.operationWarranty.update({
          where: { id: warranty.id },
          data: { status: "active", coverageStatus: "valid", startDate: new Date() },
        }),
      ]);

      return prisma.operationWarranty.findUniqueOrThrow({ where: { id: warranty.id } });
    },
    (value) => `status=${value.status}, coverage=${value.coverageStatus}`
  );

  await runStep(
    "35. Abrir reclamo de garantia",
    async () => {
      await prisma.$transaction([
        prisma.operationWarrantyEvent.create({
          data: {
            warrantyId: warranty.id,
            eventType: "CLAIM_OPENED",
            reason: "W5.35D smoke warranty claim opened",
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
    "36. Cerrar reclamo de garantia",
    async () => {
      await prisma.$transaction([
        prisma.operationWarrantyEvent.create({
          data: {
            warrantyId: warranty.id,
            eventType: "CLAIM_CLOSED",
            reason: "W5.35D smoke warranty claim closed",
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
    "37. Crear reemplazo vinculado",
    () =>
      prisma.operationReplacement.create({
        data: {
          code: codes.replacement,
          replacementType: "warranty",
          reason: "W5.35D smoke replacement",
          customerName: commercialOrder.customerName,
          customerEmail: commercialOrder.customerEmail,
          customerPhone: commercialOrder.customerPhone,
          warrantyId: warranty.id,
          commercialOrderId: commercialOrder.id,
          originalFinishedGoodId: originalFinishedGood.id,
          replacementFinishedGoodId: replacementFinishedGood.id,
          originalDispatchId: fulfillmentResult.dispatch.id,
          notes: "W5.35D full ERP smoke test",
          events: {
            create: {
              eventType: "CREATED",
              reason: "W5.35D smoke replacement created",
              metadataJson: JSON.stringify({ smokePrefix: prefix }),
            },
          },
        },
      }),
    (value) => `${value.code} status=${value.status}`
  );

  await runStep(
    "38. Aprobar reemplazo",
    async () => {
      await prisma.$transaction([
        prisma.operationReplacementEvent.create({
          data: {
            replacementId: replacement.id,
            eventType: "APPROVED",
            reason: "W5.35D smoke replacement approved",
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
    "39. Preparar reemplazo",
    async () => {
      await prisma.$transaction([
        prisma.operationReplacementEvent.create({
          data: {
            replacementId: replacement.id,
            eventType: "REPLACEMENT_PREPARED",
            reason: "W5.35D smoke replacement prepared",
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
    "40. Crear despacho de reemplazo",
    async () =>
      prisma.$transaction(async (tx) => {
        const event = await tx.operationReplacementEvent.create({
          data: {
            replacementId: replacement.id,
            eventType: "DISPATCH_CREATED",
            reason: "W5.35D smoke replacement dispatch created",
          },
        });

        const dispatch = await tx.operationDispatch.create({
          data: {
            code: `${replacement.code}-DISPATCH`,
            destinationType: "customer",
            destinationName: replacement.customerName,
            destinationReference: replacement.code,
            notes: "W5.35D smoke replacement dispatch",
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
    "41. Confirmar DISPATCH_CREATED sin movimiento FG_REPL",
    () => getFinishedGoodBalance(replacementFinishedGood.id),
    (value) => `balance=${value}`
  );
  assertEqual("FG_REPL balance after DISPATCH_CREATED", replacementPostDispatchCreatedBalance, 5);

  await runStep(
    "42. Reservar despacho de reemplazo",
    () =>
      reserveDispatch(
        replacementDispatchResult.dispatch.id,
        "W5.35D smoke replacement dispatch reserved",
        "replacement",
        replacement.id
      ),
    (value) => `status=${value.status}`
  );

  const replacementPostReservationBalance = await runStep(
    "43. Confirmar balance FG_REPL post-reserva",
    () => getFinishedGoodBalance(replacementFinishedGood.id),
    (value) => `balance=${value}`
  );
  assertEqual("FG_REPL balance after RESERVED", replacementPostReservationBalance, 4);

  await runStep(
    "44. Despachar reemplazo sin doble descuento",
    () =>
      dispatchReservedDispatch(
        replacementDispatchResult.dispatch.id,
        "W5.35D smoke replacement dispatch dispatched",
        "replacement",
        replacement.id
      ),
    (value) => `status=${value.status}`
  );

  const replacementPostDispatchBalance = await runStep(
    "45. Confirmar balance FG_REPL post-despacho",
    () => getFinishedGoodBalance(replacementFinishedGood.id),
    (value) => `balance=${value}`
  );
  assertEqual("FG_REPL balance after DISPATCHED", replacementPostDispatchBalance, 4);

  await runStep(
    "46. Entregar despacho de reemplazo",
    () =>
      deliverDispatch(
        replacementDispatchResult.dispatch.id,
        "W5.35D smoke replacement dispatch delivered",
        "replacement",
        replacement.id
      ),
    (value) => `status=${value.status}`
  );

  await runStep(
    "47. Completar reemplazo",
    async () => {
      await prisma.$transaction([
        prisma.operationReplacementEvent.create({
          data: {
            replacementId: replacement.id,
            eventType: "COMPLETED",
            reason: "W5.35D smoke replacement completed",
          },
        }),
        prisma.operationReplacement.update({
          where: { id: replacement.id },
          data: { status: "completed", completedAt: new Date() },
        }),
      ]);

      return prisma.operationReplacement.findUniqueOrThrow({ where: { id: replacement.id } });
    },
    (value) => `status=${value.status}`
  );

  const operationReturn = await runStep(
    "48. Crear devolucion vinculada",
    () =>
      prisma.operationReturn.create({
        data: {
          code: codes.return,
          returnType: "warranty_return",
          reason: "W5.35D smoke return",
          customerName: commercialOrder.customerName,
          customerEmail: commercialOrder.customerEmail,
          customerPhone: commercialOrder.customerPhone,
          warrantyId: warranty.id,
          replacementId: replacement.id,
          commercialOrderId: commercialOrder.id,
          finishedGoodId: originalFinishedGood.id,
          originalDispatchId: fulfillmentResult.dispatch.id,
          notes: "W5.35D full ERP smoke test",
          events: {
            create: {
              eventType: "CREATED",
              reason: "W5.35D smoke return created",
              metadataJson: JSON.stringify({ smokePrefix: prefix }),
            },
          },
        },
      }),
    (value) => `${value.code} status=${value.status}`
  );

  await runStep(
    "49. Recibir devolucion",
    async () => {
      await prisma.$transaction([
        prisma.operationReturnEvent.create({
          data: {
            returnId: operationReturn.id,
            eventType: "RECEIVED",
            quantity: 1,
            reason: "W5.35D smoke return received",
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
    "50. Inspeccionar devolucion",
    async () => {
      await prisma.$transaction([
        prisma.operationReturnEvent.create({
          data: {
            returnId: operationReturn.id,
            eventType: "INSPECTED",
            reason: "W5.35D smoke return inspected",
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
    "51. Aceptar devolucion",
    async () => {
      await prisma.$transaction([
        prisma.operationReturnEvent.create({
          data: {
            returnId: operationReturn.id,
            eventType: "ACCEPTED",
            quantity: 1,
            reason: "W5.35D smoke return accepted",
          },
        }),
        prisma.operationReturn.update({
          where: { id: operationReturn.id },
          data: {
            status: "accepted",
            acceptedQuantity: { increment: 1 },
          },
        }),
      ]);

      return prisma.operationReturn.findUniqueOrThrow({ where: { id: operationReturn.id } });
    },
    (value) => `status=${value.status}, accepted=${value.acceptedQuantity}`
  );

  await runStep(
    "52. Retornar a Inventario PT",
    async () =>
      prisma.$transaction(async (tx) => {
        const returnEvent = await tx.operationReturnEvent.create({
          data: {
            returnId: operationReturn.id,
            eventType: "RETURNED_TO_INVENTORY",
            quantity: 1,
            reason: "W5.35D smoke returned to inventory",
            referenceType: "finished_good",
            referenceId: originalFinishedGood.id,
          },
        });

        const finishedGoodEvent = await tx.operationFinishedGoodEvent.create({
          data: {
            finishedGoodId: originalFinishedGood.id,
            eventType: "RETURN",
            quantity: 1,
            unit: originalFinishedGood.unit,
            reason: `Retorno por devolucion ${codes.return}`,
            referenceType: "return",
            referenceId: operationReturn.id,
            metadataJson: JSON.stringify({
              returnCode: codes.return,
              returnEventId: returnEvent.id,
            }),
          },
        });

        await tx.operationReturn.update({
          where: { id: operationReturn.id },
          data: { resolution: "returned_to_inventory" },
        });

        return finishedGoodEvent;
      }),
    (value) => `${value.eventType} ${value.quantity}`
  );

  await runStep(
    "53. Completar devolucion",
    async () => {
      await prisma.$transaction([
        prisma.operationReturnEvent.create({
          data: {
            returnId: operationReturn.id,
            eventType: "COMPLETED",
            reason: "W5.35D smoke return completed",
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

  const returnFinishedGoodEventCount = await runStep(
    "54. Confirmar evento RETURN en Inventario PT",
    () =>
      prisma.operationFinishedGoodEvent.count({
        where: {
          finishedGoodId: originalFinishedGood.id,
          eventType: "RETURN",
          referenceType: "return",
          referenceId: operationReturn.id,
        },
      }),
    (value) => `RETURN events=${value}`
  );
  assertEqual("RETURN event count", returnFinishedGoodEventCount, 1);

  const dashboardSmokeCounts = await runStep(
    "55. Verificar registros para dashboard",
    async () => {
      const [
        materialCount,
        productionCount,
        qcCount,
        packingCount,
        finishedGoodCount,
        commercialCount,
        dispatchCount,
        warrantyCount,
        replacementCount,
        returnCount,
      ] = await Promise.all([
        prisma.operationMaterial.count({ where: { code: { startsWith: prefix } } }),
        prisma.operationProductionOrder.count({ where: { code: { startsWith: prefix } } }),
        prisma.operationQcInspection.count({ where: { code: { startsWith: prefix } } }),
        prisma.operationPackingBatch.count({ where: { code: { startsWith: prefix } } }),
        prisma.operationFinishedGood.count({ where: { code: { startsWith: prefix } } }),
        prisma.operationCommercialOrder.count({ where: { code: { startsWith: prefix } } }),
        prisma.operationDispatch.count({
          where: {
            OR: [
              { code: codes.commercialDispatch },
              { code: `${codes.replacement}-DISPATCH` },
            ],
          },
        }),
        prisma.operationWarranty.count({ where: { code: { startsWith: prefix } } }),
        prisma.operationReplacement.count({ where: { code: { startsWith: prefix } } }),
        prisma.operationReturn.count({ where: { code: { startsWith: prefix } } }),
      ]);

      return {
        materialCount,
        productionCount,
        qcCount,
        packingCount,
        finishedGoodCount,
        commercialCount,
        dispatchCount,
        warrantyCount,
        replacementCount,
        returnCount,
      };
    },
    (value) => JSON.stringify(value)
  );

  Object.entries(dashboardSmokeCounts).forEach(([label, count]) => {
    if (count <= 0) {
      throw new Error(`Dashboard smoke count ${label}: expected positive count, got ${count}`);
    }
  });

  const finalState = await runStep(
    "56. Confirmar estados finales y balances",
    async () => {
      const [
        finalCommercialOrder,
        finalOriginalDispatch,
        finalReplacementDispatch,
        finalWarranty,
        finalReplacement,
        finalReturn,
        finalOriginalBalance,
        finalReplacementBalance,
      ] = await Promise.all([
        prisma.operationCommercialOrder.findUniqueOrThrow({
          where: { id: commercialOrder.id },
          include: { dispatch: true },
        }),
        prisma.operationDispatch.findUniqueOrThrow({ where: { id: fulfillmentResult.dispatch.id } }),
        prisma.operationDispatch.findUniqueOrThrow({
          where: { id: replacementDispatchResult.dispatch.id },
        }),
        prisma.operationWarranty.findUniqueOrThrow({ where: { id: warranty.id } }),
        prisma.operationReplacement.findUniqueOrThrow({ where: { id: replacement.id } }),
        prisma.operationReturn.findUniqueOrThrow({ where: { id: operationReturn.id } }),
        getFinishedGoodBalance(originalFinishedGood.id),
        getFinishedGoodBalance(replacementFinishedGood.id),
      ]);

      assertEqual("Final commercial order status", finalCommercialOrder.status, "confirmed");
      assertEqual("Final commercial paymentStatus", finalCommercialOrder.paymentStatus, "paid");
      assertEqual("Final commercial fulfillmentStatus", finalCommercialOrder.fulfillmentStatus, "requested");
      assertEqual("Final commercial dispatchId", finalCommercialOrder.dispatchId, fulfillmentResult.dispatch.id);
      assertEqual("Final original dispatch status", finalOriginalDispatch.status, "delivered");
      assertEqual("Final replacement dispatch status", finalReplacementDispatch.status, "delivered");
      assertEqual("Final warranty coverageStatus", finalWarranty.coverageStatus, "claim_closed");
      assertEqual("Final replacement status", finalReplacement.status, "completed");
      assertEqual("Final return status", finalReturn.status, "completed");
      assertEqual("Final FG_ORIG balance", finalOriginalBalance, 18);
      assertEqual("Final FG_REPL balance", finalReplacementBalance, 4);

      return {
        commercialStatus: finalCommercialOrder.status,
        commercialPaymentStatus: finalCommercialOrder.paymentStatus,
        commercialFulfillmentStatus: finalCommercialOrder.fulfillmentStatus,
        originalDispatchStatus: finalOriginalDispatch.status,
        replacementDispatchStatus: finalReplacementDispatch.status,
        warrantyCoverageStatus: finalWarranty.coverageStatus,
        replacementStatus: finalReplacement.status,
        returnStatus: finalReturn.status,
        finalOriginalBalance,
        finalReplacementBalance,
      };
    },
    (value) =>
      `FG_ORIG=${value.finalOriginalBalance}, FG_REPL=${value.finalReplacementBalance}, dispatches=${value.originalDispatchStatus}/${value.replacementDispatchStatus}`
  );

  console.log("Full ERP E2E smoke completed");
  console.log("Prefix:");
  console.log(prefix);
  console.log("Codes:");
  console.table(codes);
  console.log("Balances:");
  console.table({
    materialBalance,
    originalInitialBalance,
    originalPostFulfillmentBalance,
    originalPostReservationBalance,
    originalPostDispatchBalance,
    finalOriginalBalance: finalState.finalOriginalBalance,
    replacementInitialBalance,
    replacementPostDispatchCreatedBalance,
    replacementPostReservationBalance,
    replacementPostDispatchBalance,
    finalReplacementBalance: finalState.finalReplacementBalance,
  });
  console.log("Dashboard smoke counts:");
  console.table(dashboardSmokeCounts);
  console.log("Steps:");
  console.table(results);
  console.log("Summary:");
  console.table(finalState);
}

main()
  .catch((error) => {
    console.error("Full ERP E2E smoke failed");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
