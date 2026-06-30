import { PrismaClient } from "@prisma/client";

const CONFIRMATION_VALUE = "YES_RUN_OPERATIONS_SMOKE";
const TEST_PREFIX = "W530D_SMOKE";

const prisma = new PrismaClient();

type FinishedGoodBalanceEvent = {
  eventType: string;
  quantity: number;
};

type MaterialBalanceEvent = {
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

function assertPositive(label: string, value: number) {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${label}: expected positive number, got ${value}`);
  }
}

function calculateMaterialBalance(events: MaterialBalanceEvent[]) {
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

function calculateFinishedGoodBalance(events: FinishedGoodBalanceEvent[]) {
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
  if (process.env.CONFIRM_OPERATIONS_SMOKE !== CONFIRMATION_VALUE) {
    throw new Error(
      `Set CONFIRM_OPERATIONS_SMOKE=${CONFIRMATION_VALUE} to create smoke-test operations data.`
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
    finishedGood: `${prefix}_FG`,
    dispatch: `${prefix}_DISP`,
    packingLabel: `${prefix}_LBL`,
  };

  const material = await runStep(
    "1. Crear material",
    () =>
      prisma.operationMaterial.create({
        data: {
          code: codes.material,
          name: "Smoke material operaciones",
          category: "smoke",
          unit: "unit",
          notes: "W5.30D smoke test",
        },
      }),
    (value) => `${value.code} (${value.id})`
  );

  await runStep(
    "2. Registrar recepcion de material",
    () =>
      prisma.operationMaterialEvent.create({
        data: {
          materialId: material.id,
          eventType: "RECEIPT",
          quantity: 100,
          unit: "unit",
          reason: "W5.30D smoke receipt",
          referenceType: "smoke_test",
          referenceId: prefix,
        },
      }),
    (value) => `${value.eventType} ${value.quantity}`
  );

  const productionOrder = await runStep(
    "3. Crear orden de produccion",
    () =>
      prisma.operationProductionOrder.create({
        data: {
          code: codes.production,
          title: "Smoke orden de produccion",
          plannedQuantity: 10,
          outputType: "smoke_finished_good",
          notes: "W5.30D smoke test",
          items: {
            create: {
              materialId: material.id,
              plannedQuantity: 10,
              unit: "unit",
            },
          },
          events: {
            create: {
              eventType: "CREATED",
              quantity: 10,
              reason: "W5.30D smoke production created",
              metadataJson: JSON.stringify({ smokePrefix: prefix }),
            },
          },
        },
      }),
    (value) => `${value.code} status=${value.status}`
  );

  await runStep(
    "4. Planificar orden",
    async () => {
      await prisma.$transaction([
        prisma.operationProductionEvent.create({
          data: {
            productionOrderId: productionOrder.id,
            eventType: "PLANNED",
            reason: "W5.30D smoke planned",
          },
        }),
        prisma.operationProductionOrder.update({
          where: { id: productionOrder.id },
          data: { status: "planned" },
        }),
      ]);

      return prisma.operationProductionOrder.findUniqueOrThrow({
        where: { id: productionOrder.id },
      });
    },
    (value) => `status=${value.status}`
  );

  await runStep(
    "5. Iniciar orden",
    async () => {
      await prisma.$transaction([
        prisma.operationProductionEvent.create({
          data: {
            productionOrderId: productionOrder.id,
            eventType: "STARTED",
            reason: "W5.30D smoke started",
          },
        }),
        prisma.operationProductionOrder.update({
          where: { id: productionOrder.id },
          data: { status: "started" },
        }),
      ]);

      return prisma.operationProductionOrder.findUniqueOrThrow({
        where: { id: productionOrder.id },
      });
    },
    (value) => `status=${value.status}`
  );

  await runStep(
    "6. Registrar producido",
    async () => {
      await prisma.$transaction(async (tx) => {
        const current = await tx.operationProductionOrder.findUniqueOrThrow({
          where: { id: productionOrder.id },
          select: { producedQuantity: true },
        });

        await tx.operationProductionEvent.create({
          data: {
            productionOrderId: productionOrder.id,
            eventType: "PRODUCED",
            quantity: 10,
            reason: "W5.30D smoke produced",
          },
        });

        await tx.operationProductionOrder.update({
          where: { id: productionOrder.id },
          data: { producedQuantity: current.producedQuantity + 10 },
        });
      });

      return prisma.operationProductionOrder.findUniqueOrThrow({
        where: { id: productionOrder.id },
      });
    },
    (value) => `producedQuantity=${value.producedQuantity}`
  );

  await runStep(
    "7. Completar orden",
    async () => {
      await prisma.$transaction([
        prisma.operationProductionEvent.create({
          data: {
            productionOrderId: productionOrder.id,
            eventType: "COMPLETED",
            reason: "W5.30D smoke completed",
          },
        }),
        prisma.operationProductionOrder.update({
          where: { id: productionOrder.id },
          data: { status: "completed" },
        }),
      ]);

      return prisma.operationProductionOrder.findUniqueOrThrow({
        where: { id: productionOrder.id },
      });
    },
    (value) => `status=${value.status}`
  );

  const qcInspection = await runStep(
    "8. Crear inspeccion QC vinculada a produccion",
    () =>
      prisma.operationQcInspection.create({
        data: {
          code: codes.qc,
          productionOrderId: productionOrder.id,
          inspectionType: "standard",
          notes: "W5.30D smoke test",
          events: {
            create: {
              eventType: "CREATED",
              reason: "W5.30D smoke QC created",
              metadataJson: JSON.stringify({ smokePrefix: prefix }),
            },
          },
        },
      }),
    (value) => `${value.code} status=${value.status}`
  );

  await runStep(
    "9. Iniciar QC",
    async () => {
      await prisma.$transaction([
        prisma.operationQcInspectionEvent.create({
          data: {
            qcInspectionId: qcInspection.id,
            eventType: "STARTED",
            reason: "W5.30D smoke QC started",
          },
        }),
        prisma.operationQcInspection.update({
          where: { id: qcInspection.id },
          data: { status: "in_progress" },
        }),
      ]);

      return prisma.operationQcInspection.findUniqueOrThrow({
        where: { id: qcInspection.id },
      });
    },
    (value) => `status=${value.status}`
  );

  await runStep(
    "10. Aprobar cantidad",
    async () => {
      await prisma.$transaction(async (tx) => {
        const current = await tx.operationQcInspection.findUniqueOrThrow({
          where: { id: qcInspection.id },
          select: { inspectedQuantity: true, passedQuantity: true },
        });

        await tx.operationQcInspectionEvent.create({
          data: {
            qcInspectionId: qcInspection.id,
            eventType: "PASSED",
            quantity: 10,
            passedQuantity: 10,
            reason: "W5.30D smoke QC passed",
          },
        });

        await tx.operationQcInspection.update({
          where: { id: qcInspection.id },
          data: {
            inspectedQuantity: current.inspectedQuantity + 10,
            passedQuantity: current.passedQuantity + 10,
          },
        });
      });

      return prisma.operationQcInspection.findUniqueOrThrow({
        where: { id: qcInspection.id },
      });
    },
    (value) => `inspected=${value.inspectedQuantity}, passed=${value.passedQuantity}`
  );

  await runStep(
    "11. Completar QC",
    async () => {
      await prisma.$transaction([
        prisma.operationQcInspectionEvent.create({
          data: {
            qcInspectionId: qcInspection.id,
            eventType: "COMPLETED",
            reason: "W5.30D smoke QC completed",
          },
        }),
        prisma.operationQcInspection.update({
          where: { id: qcInspection.id },
          data: { status: "completed" },
        }),
      ]);

      return prisma.operationQcInspection.findUniqueOrThrow({
        where: { id: qcInspection.id },
      });
    },
    (value) => `status=${value.status}`
  );

  const packingBatch = await runStep(
    "12. Crear batch de empaque vinculado a produccion/QC",
    () =>
      prisma.operationPackingBatch.create({
        data: {
          code: codes.packing,
          productionOrderId: productionOrder.id,
          qcInspectionId: qcInspection.id,
          packageType: "standard",
          plannedQuantity: 10,
          labelCode: codes.packingLabel,
          notes: "W5.30D smoke test",
          events: {
            create: {
              eventType: "CREATED",
              reason: "W5.30D smoke packing created",
              metadataJson: JSON.stringify({ smokePrefix: prefix }),
            },
          },
        },
      }),
    (value) => `${value.code} status=${value.status}`
  );

  await runStep(
    "13. Iniciar empaque",
    async () => {
      await prisma.$transaction([
        prisma.operationPackingEvent.create({
          data: {
            packingBatchId: packingBatch.id,
            eventType: "STARTED",
            reason: "W5.30D smoke packing started",
          },
        }),
        prisma.operationPackingBatch.update({
          where: { id: packingBatch.id },
          data: { status: "in_progress" },
        }),
      ]);

      return prisma.operationPackingBatch.findUniqueOrThrow({
        where: { id: packingBatch.id },
      });
    },
    (value) => `status=${value.status}`
  );

  await runStep(
    "14. Registrar empacado",
    async () => {
      await prisma.$transaction(async (tx) => {
        const current = await tx.operationPackingBatch.findUniqueOrThrow({
          where: { id: packingBatch.id },
          select: { packedQuantity: true },
        });

        await tx.operationPackingEvent.create({
          data: {
            packingBatchId: packingBatch.id,
            eventType: "PACKED",
            quantity: 10,
            reason: "W5.30D smoke packed",
          },
        });

        await tx.operationPackingBatch.update({
          where: { id: packingBatch.id },
          data: { packedQuantity: current.packedQuantity + 10 },
        });
      });

      return prisma.operationPackingBatch.findUniqueOrThrow({
        where: { id: packingBatch.id },
      });
    },
    (value) => `packedQuantity=${value.packedQuantity}`
  );

  await runStep(
    "15. Completar empaque",
    async () => {
      await prisma.$transaction([
        prisma.operationPackingEvent.create({
          data: {
            packingBatchId: packingBatch.id,
            eventType: "COMPLETED",
            reason: "W5.30D smoke packing completed",
          },
        }),
        prisma.operationPackingBatch.update({
          where: { id: packingBatch.id },
          data: { status: "completed" },
        }),
      ]);

      return prisma.operationPackingBatch.findUniqueOrThrow({
        where: { id: packingBatch.id },
      });
    },
    (value) => `status=${value.status}`
  );

  const finishedGood = await runStep(
    "16. Crear Producto Terminado vinculado a empaque con initialQuantity",
    () =>
      prisma.operationFinishedGood.create({
        data: {
          code: codes.finishedGood,
          name: "Smoke producto terminado",
          productType: "smoke_finished_good",
          unit: "unit",
          packingBatchId: packingBatch.id,
          notes: "W5.30D smoke test",
          events: {
            create: {
              eventType: "RECEIPT",
              quantity: 10,
              unit: "unit",
              reason: "W5.30D smoke initial receipt",
              referenceType: "packing_batch",
              referenceId: packingBatch.id,
              metadataJson: JSON.stringify({ source: "smoke_initialQuantity" }),
            },
          },
        },
      }),
    (value) => `${value.code} status=${value.status}`
  );

  const dispatch = await runStep(
    "17. Crear despacho con item de Producto Terminado",
    () =>
      prisma.operationDispatch.create({
        data: {
          code: codes.dispatch,
          destinationType: "customer",
          destinationName: "Smoke destino operaciones",
          destinationReference: prefix,
          destinationAddress: "Smoke address",
          notes: "W5.30D smoke test",
          items: {
            create: {
              finishedGoodId: finishedGood.id,
              quantity: 4,
              unit: "unit",
              notes: "W5.30D smoke dispatch item",
            },
          },
          events: {
            create: {
              eventType: "CREATED",
              reason: "W5.30D smoke dispatch created",
              metadataJson: JSON.stringify({ smokePrefix: prefix, itemCount: 1 }),
            },
          },
        },
      }),
    (value) => `${value.code} status=${value.status}`
  );

  await runStep(
    "18. Reservar despacho",
    async () => {
      await prisma.$transaction([
        prisma.operationDispatchEvent.create({
          data: {
            dispatchId: dispatch.id,
            eventType: "RESERVED",
            quantity: 4,
            reason: "W5.30D smoke reserved",
          },
        }),
        prisma.operationFinishedGoodEvent.create({
          data: {
            finishedGoodId: finishedGood.id,
            eventType: "RESERVATION",
            quantity: 4,
            unit: "unit",
            reason: `Reserva por despacho ${codes.dispatch}`,
            referenceType: "dispatch",
            referenceId: dispatch.id,
            metadataJson: JSON.stringify({ dispatchCode: codes.dispatch }),
          },
        }),
        prisma.operationDispatch.update({
          where: { id: dispatch.id },
          data: { status: "reserved" },
        }),
      ]);

      return prisma.operationDispatch.findUniqueOrThrow({
        where: { id: dispatch.id },
      });
    },
    (value) => `status=${value.status}`
  );

  await runStep(
    "19. Despachar",
    async () => {
      await prisma.$transaction([
        prisma.operationDispatchEvent.create({
          data: {
            dispatchId: dispatch.id,
            eventType: "DISPATCHED",
            quantity: 4,
            reason: "W5.30D smoke dispatched",
          },
        }),
        prisma.operationFinishedGoodEvent.create({
          data: {
            finishedGoodId: finishedGood.id,
            eventType: "RELEASE",
            quantity: 4,
            unit: "unit",
            reason: `Liberacion previa a salida ${codes.dispatch}`,
            referenceType: "dispatch",
            referenceId: dispatch.id,
            metadataJson: JSON.stringify({ dispatchCode: codes.dispatch }),
          },
        }),
        prisma.operationFinishedGoodEvent.create({
          data: {
            finishedGoodId: finishedGood.id,
            eventType: "ISSUE",
            quantity: 4,
            unit: "unit",
            reason: `Salida por despacho ${codes.dispatch}`,
            referenceType: "dispatch",
            referenceId: dispatch.id,
            metadataJson: JSON.stringify({ dispatchCode: codes.dispatch }),
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

      return prisma.operationDispatch.findUniqueOrThrow({
        where: { id: dispatch.id },
      });
    },
    (value) => `status=${value.status}`
  );

  await runStep(
    "20. Marcar entregado",
    async () => {
      await prisma.$transaction([
        prisma.operationDispatchEvent.create({
          data: {
            dispatchId: dispatch.id,
            eventType: "DELIVERED",
            quantity: 4,
            reason: "W5.30D smoke delivered",
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

      return prisma.operationDispatch.findUniqueOrThrow({
        where: { id: dispatch.id },
      });
    },
    (value) => `status=${value.status}`
  );

  const summary = await runStep(
    "21. Confirmar balances finales y estados",
    async () => {
      const [
        materialEvents,
        finalProductionOrder,
        finalQcInspection,
        finalPackingBatch,
        finishedGoodEvents,
        finalDispatch,
      ] = await Promise.all([
        prisma.operationMaterialEvent.findMany({
          where: { materialId: material.id },
          select: { eventType: true, quantity: true },
        }),
        prisma.operationProductionOrder.findUniqueOrThrow({
          where: { id: productionOrder.id },
        }),
        prisma.operationQcInspection.findUniqueOrThrow({
          where: { id: qcInspection.id },
        }),
        prisma.operationPackingBatch.findUniqueOrThrow({
          where: { id: packingBatch.id },
        }),
        prisma.operationFinishedGoodEvent.findMany({
          where: { finishedGoodId: finishedGood.id },
          select: { eventType: true, quantity: true },
        }),
        prisma.operationDispatch.findUniqueOrThrow({
          where: { id: dispatch.id },
        }),
      ]);

      const materialBalance = calculateMaterialBalance(materialEvents);
      const finishedGoodBalance = calculateFinishedGoodBalance(finishedGoodEvents);

      assertEqual("Material balance", materialBalance, 100);
      assertEqual("Production status", finalProductionOrder.status, "completed");
      assertEqual("Production producedQuantity", finalProductionOrder.producedQuantity, 10);
      assertEqual("QC status", finalQcInspection.status, "completed");
      assertEqual("QC inspectedQuantity", finalQcInspection.inspectedQuantity, 10);
      assertEqual("QC passedQuantity", finalQcInspection.passedQuantity, 10);
      assertEqual("Packing status", finalPackingBatch.status, "completed");
      assertEqual("Packing packedQuantity", finalPackingBatch.packedQuantity, 10);
      assertEqual("FinishedGood final balance", finishedGoodBalance, 6);
      assertEqual("Dispatch status", finalDispatch.status, "delivered");

      assertPositive("Production plannedQuantity", finalProductionOrder.plannedQuantity);
      assertPositive("Dispatch deliveredAt timestamp", finalDispatch.deliveredAt ? 1 : 0);

      return {
        materialBalance,
        finishedGoodBalance,
        productionStatus: finalProductionOrder.status,
        productionProducedQuantity: finalProductionOrder.producedQuantity,
        qcStatus: finalQcInspection.status,
        qcInspectedQuantity: finalQcInspection.inspectedQuantity,
        qcPassedQuantity: finalQcInspection.passedQuantity,
        packingStatus: finalPackingBatch.status,
        packingPackedQuantity: finalPackingBatch.packedQuantity,
        dispatchStatus: finalDispatch.status,
      };
    },
    (value) =>
      [
        `materialBalance=${value.materialBalance}`,
        `finishedGoodBalance=${value.finishedGoodBalance}`,
        `production=${value.productionStatus}/${value.productionProducedQuantity}`,
        `qc=${value.qcStatus}/${value.qcPassedQuantity}`,
        `packing=${value.packingStatus}/${value.packingPackedQuantity}`,
        `dispatch=${value.dispatchStatus}`,
      ].join(", ")
  );

  console.log("Operations E2E smoke completed");
  console.log("Codes:");
  console.table(codes);
  console.log("Steps:");
  console.table(results);
  console.log("Summary:");
  console.table(summary);
}

main()
  .catch((error) => {
    console.error("Operations E2E smoke failed");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
