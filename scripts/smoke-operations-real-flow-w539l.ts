import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const CONFIRM = "YES_RUN_W539L_SMOKE";
const PREFIX_BASE = "W539L_SMOKE";

type Created = {
  digitalBatchIds: string[];
  printOrderIds: string[];
  productionOrderIds: string[];
  unitIds: string[];
  commercialOrderIds: string[];
  dispatchIds: string[];
};

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function timestamp() {
  return new Date().toISOString().replace(/[-:]/g, "").replace(/\..+$/, "").slice(0, 14);
}

function smokePrefix() {
  return `${PREFIX_BASE}_${timestamp()}`;
}

function smokeCode(prefix: string, suffix: string) {
  return `${prefix}_${suffix}`;
}

function checklistPayload() {
  return {
    nfcWorks: true,
    qrWorks: true,
    internalLabelCorrect: true,
    stickerCorrect: true,
    activationCardCorrect: true,
    packagingCorrect: true,
    sealedPackage: true,
    productTypeCorrect: true,
  };
}

async function cleanup(prefix: string, created: Created) {
  const unitIds = [...created.unitIds];
  const dispatchIds = [...created.dispatchIds];
  const commercialOrderIds = [...created.commercialOrderIds];
  const productionOrderIds = [...created.productionOrderIds];
  const printOrderIds = [...created.printOrderIds];
  const digitalBatchIds = [...created.digitalBatchIds];

  await prisma.operationFinishedGoodUnitEvent.deleteMany({ where: { unitId: { in: unitIds } } });
  await prisma.operationDispatchEvent.deleteMany({ where: { dispatchId: { in: dispatchIds } } });
  await prisma.operationDispatchItem.deleteMany({ where: { dispatchId: { in: dispatchIds } } });
  await prisma.operationCommercialOrderEvent.deleteMany({ where: { commercialOrderId: { in: commercialOrderIds } } });
  await prisma.operationCommercialOrderItem.deleteMany({ where: { commercialOrderId: { in: commercialOrderIds } } });
  await prisma.operationFinishedGoodUnit.deleteMany({ where: { id: { in: unitIds } } });
  await prisma.operationProductionEvent.deleteMany({ where: { productionOrderId: { in: productionOrderIds } } });
  await prisma.operationPrintOrderItem.deleteMany({ where: { printOrderId: { in: printOrderIds } } });
  await prisma.operationDigitalBatchItem.deleteMany({ where: { batchId: { in: digitalBatchIds } } });
  await prisma.operationDispatch.deleteMany({ where: { id: { in: dispatchIds } } });
  await prisma.operationCommercialOrder.deleteMany({ where: { id: { in: commercialOrderIds } } });
  await prisma.operationProductionOrder.deleteMany({ where: { id: { in: productionOrderIds } } });
  await prisma.operationPrintOrder.deleteMany({ where: { id: { in: printOrderIds } } });
  await prisma.operationDigitalBatch.deleteMany({ where: { id: { in: digitalBatchIds } } });

  const remaining = await prisma.$queryRaw<Array<{ count: bigint }>>`
    select count(*)::bigint as count
    from "OperationDigitalBatch"
    where code like ${`${PREFIX_BASE}%`}
  `;

  assert(Number(remaining[0]?.count || 0) === 0, `Smoke cleanup incomplete for ${prefix}`);
  console.log(JSON.stringify({ prefix, remainingSmokeRecords: 0 }));
}

async function createDigitalBatch(prefix: string, labelPrefix: string, productType: string, quantity: number) {
  return prisma.operationDigitalBatch.create({
    data: {
      code: smokeCode(prefix, `${labelPrefix}_BATCH`),
      name: smokeCode(prefix, `${labelPrefix}_BATCH`),
      productType,
      finishedGoodCode: "PRP-FG-STICKER",
      prefix: smokeCode(prefix, labelPrefix),
      startNumber: 1,
      endNumber: quantity,
      quantity,
      status: "generated",
      items: {
        create: Array.from({ length: quantity }, (_, index) => ({
          internalLabel: `${smokeCode(prefix, labelPrefix)}_${String(index + 1).padStart(4, "0")}`,
          sequenceNumber: index + 1,
          qrUrl: `https://smoke.invalid/${prefix}/${labelPrefix}/qr/${index + 1}`,
          nfcUrl: `https://smoke.invalid/${prefix}/${labelPrefix}/nfc/${index + 1}`,
          activationUrl: `https://smoke.invalid/${prefix}/${labelPrefix}/activar/${index + 1}`,
          status: "available",
        })),
      },
    },
    include: { items: true },
  });
}

async function qcPassUnit(params: {
  productionOrderId: string;
  unitId: string;
  commercialOrderId: string | null;
}) {
  const unit = await prisma.operationFinishedGoodUnit.findUnique({ where: { id: params.unitId } });
  assert(unit, "Unit not found for QC pass");
  await prisma.operationFinishedGoodUnit.update({
    where: { id: unit.id },
    data: {
      qaStatus: "passed",
      activationStatus: "not_activated",
      status: params.commercialOrderId ? "reserved" : "available",
      reservedOrderId: params.commercialOrderId,
      reservedAt: params.commercialOrderId ? new Date() : null,
      events: {
        create: [
          {
            eventType: "QA_PASSED",
            reason: "Smoke QC pass",
            metadataJson: JSON.stringify({ checklist: checklistPayload(), productionOrderId: params.productionOrderId }),
          },
          {
            eventType: params.commercialOrderId ? "UNIT_RESERVED_FOR_ORDER" : "INVENTORY_AVAILABLE",
            reason: params.commercialOrderId ? "Smoke reserve" : "Smoke inventory available",
            referenceType: params.commercialOrderId ? "commercial_order" : "production_order",
            referenceId: params.commercialOrderId || params.productionOrderId,
            metadataJson: JSON.stringify({ productionOrderId: params.productionOrderId, commercialOrderId: params.commercialOrderId }),
          },
        ],
      },
    },
  });
}

async function buildProductionFlow(params: {
  prefix: string;
  labelPrefix: string;
  quantity: number;
  commercialOrderId: string | null;
}) {
  const batch = await createDigitalBatch(params.prefix, params.labelPrefix, "sticker_normal", params.quantity);
  const productionOrder = await prisma.operationProductionOrder.create({
    data: {
      code: smokeCode(params.prefix, `${params.labelPrefix}_PROD`),
      title: smokeCode(params.prefix, `${params.labelPrefix}_PROD`),
      status: "draft",
      plannedQuantity: params.quantity,
      producedQuantity: 0,
      outputType: "sticker_normal",
      notes: params.commercialOrderId ? `[commercialOrderId:${params.commercialOrderId}] ${params.prefix}` : params.prefix,
      events: {
        create: {
          eventType: params.commercialOrderId ? "ORDER_SENT_TO_PRODUCTION" : "ORDER_SENT_TO_PRODUCTION",
          quantity: params.quantity,
          reason: "Smoke production created",
          metadataJson: JSON.stringify({ smokePrefix: params.prefix, commercialOrderId: params.commercialOrderId }),
        },
      },
    },
  });

  await prisma.operationProductionEvent.create({
    data: {
      productionOrderId: productionOrder.id,
      eventType: "DIGITAL_PREPARATION_CREATED",
      quantity: params.quantity,
      reason: "Smoke digital preparation",
      metadataJson: JSON.stringify({ batchId: batch.id }),
    },
  });

  await prisma.operationDigitalBatchItem.updateMany({
    where: { batchId: batch.id },
    data: {
      productionOrderId: productionOrder.id,
      shortCode: null,
      activationUrl: null,
      nfcProgrammed: true,
      qrPrepared: true,
      preparedAt: new Date(),
      status: "sent_to_print",
    },
  });

  const refreshedItems = await prisma.operationDigitalBatchItem.findMany({
    where: { batchId: batch.id },
    orderBy: { sequenceNumber: "asc" },
  });

  const printOrder = await prisma.operationPrintOrder.create({
    data: {
      code: smokeCode(params.prefix, `${params.labelPrefix}_PRINT`),
      supplierName: smokeCode(params.prefix, `${params.labelPrefix}_SUPPLIER`),
      productType: "sticker_normal",
      finishedGoodCode: "PRP-FG-STICKER",
      digitalBatchId: batch.id,
      rangeStartLabel: refreshedItems[0].internalLabel,
      rangeEndLabel: refreshedItems[refreshedItems.length - 1].internalLabel,
      quantity: refreshedItems.length,
      includesSticker: true,
      includesActivationCard: true,
      includesPresentation: true,
      includesPackaging: true,
      status: "sent",
      sentAt: new Date(),
      items: {
        create: refreshedItems.map((item) => ({
          digitalBatchItemId: item.id,
          internalLabel: item.internalLabel,
          status: "sent",
          sentAt: new Date(),
        })),
      },
    },
    include: { items: true },
  });

  await prisma.operationDigitalBatchItem.updateMany({
    where: { id: { in: refreshedItems.map((item) => item.id) } },
    data: { status: "printed" },
  });
  await prisma.operationPrintOrder.update({
    where: { id: printOrder.id },
    data: { status: "received", receivedAt: new Date() },
  });
  await prisma.operationPrintOrderItem.updateMany({
    where: { printOrderId: printOrder.id },
    data: { status: "received", receivedAt: new Date() },
  });

  const units = await prisma.$transaction(async (tx) => {
    const createdUnits = [];
    for (const item of refreshedItems) {
      const unit = await tx.operationFinishedGoodUnit.create({
        data: {
          internalLabel: item.internalLabel,
          productCode: "PRP-FG-STICKER",
          productName: "Sticker PreRescatePTY",
          productType: "sticker_normal",
          digitalBatchId: batch.id,
          digitalBatchItemId: item.id,
          printOrderId: printOrder.id,
          status: "qa_pending",
          qaStatus: "pending",
          activationStatus: "not_activated",
          events: {
            create: {
              eventType: "UNIT_COMPLETED",
              reason: "Smoke unit completed",
              metadataJson: JSON.stringify({ smokePrefix: params.prefix, batchId: batch.id }),
            },
          },
        },
      });
      await tx.operationDigitalBatchItem.update({ where: { id: item.id }, data: { status: "assembled" } });
      createdUnits.push(unit);
    }
    return createdUnits;
  });

  await prisma.operationProductionEvent.create({
    data: {
      productionOrderId: productionOrder.id,
      eventType: "PRINT_ORDER_SENT",
      quantity: units.length,
      reason: "Smoke sent to print",
      metadataJson: JSON.stringify({ printOrderId: printOrder.id }),
    },
  });
  await prisma.operationProductionEvent.create({
    data: {
      productionOrderId: productionOrder.id,
      eventType: "PRINT_RECEIVED",
      quantity: units.length,
      reason: "Smoke print received",
      metadataJson: JSON.stringify({ printOrderId: printOrder.id }),
    },
  });
  await prisma.operationProductionEvent.create({
    data: {
      productionOrderId: productionOrder.id,
      eventType: "SENT_TO_QA",
      quantity: units.length,
      reason: "Smoke sent to QC",
      metadataJson: JSON.stringify({ printOrderId: printOrder.id }),
    },
  });

  for (const unit of units) {
    await qcPassUnit({
      productionOrderId: productionOrder.id,
      unitId: unit.id,
      commercialOrderId: params.commercialOrderId,
    });
  }
  await prisma.operationProductionEvent.create({
    data: {
      productionOrderId: productionOrder.id,
      eventType: "PRODUCTION_COMPLETED",
      quantity: units.length,
      reason: "Smoke completed",
      metadataJson: JSON.stringify({ productionOrderId: productionOrder.id }),
    },
  });

  return { batch, productionOrder, printOrder, units };
}

async function main() {
  if (process.env.CONFIRM_W539L_SMOKE !== CONFIRM) {
    throw new Error(`Set CONFIRM_W539L_SMOKE=${CONFIRM} to run the smoke.`);
  }

  const prefix = smokePrefix();
  const created: Created = {
    digitalBatchIds: [],
    printOrderIds: [],
    productionOrderIds: [],
    unitIds: [],
    commercialOrderIds: [],
    dispatchIds: [],
  };

  try {
    const baseFinishedGood = await prisma.operationFinishedGood.upsert({
      where: { code: "PRP-FG-STICKER" },
      create: { code: "PRP-FG-STICKER", name: "Sticker PreRescatePTY", productType: "sticker_normal", unit: "unit" },
      update: { name: "Sticker PreRescatePTY", productType: "sticker_normal", unit: "unit" },
    });
    assert(baseFinishedGood.code === "PRP-FG-STICKER", "Base finished good unavailable");

    const internal = await prisma.operationCommercialOrder.create({
      data: {
        code: smokeCode(prefix, "INT_ORDER"),
        status: "confirmed",
        customerType: "internal",
        customerName: smokeCode(prefix, "INTERNAL"),
        salesChannel: "admin",
        paymentStatus: "paid",
        fulfillmentStatus: "pending",
        totalAmount: 0,
        currency: "USD",
        notes: prefix,
        items: {
          create: [
            {
              productCode: "PRP-FG-STICKER",
              productName: "Sticker PreRescatePTY",
              quantity: 2,
              unitPrice: 0,
              totalPrice: 0,
              unit: "unit",
              notes: prefix,
            },
          ],
        },
        events: { create: { eventType: "CONFIRMED", reason: "Smoke internal order" } },
      },
      include: { items: true },
    });
    created.commercialOrderIds.push(internal.id);

    const internalFlow = await buildProductionFlow({
      prefix,
      labelPrefix: "INTERNAL",
      quantity: 2,
      commercialOrderId: null,
    });
    created.digitalBatchIds.push(internalFlow.batch.id);
    created.printOrderIds.push(internalFlow.printOrder.id);
    created.productionOrderIds.push(internalFlow.productionOrder.id);
    created.unitIds.push(...internalFlow.units.map((unit) => unit.id));

    const internalUnits = await prisma.operationFinishedGoodUnit.findMany({
      where: { digitalBatchId: internalFlow.batch.id },
    });
    assert(internalUnits.every((unit) => unit.status === "available"), "Internal units not available after QC");
    assert(internalUnits.every((unit) => unit.reservedOrderId === null), "Internal units should not be reserved");
    assert((await prisma.operationDispatch.count({ where: { code: { startsWith: prefix } } })) === 0, "Internal smoke created dispatch unexpectedly");

    const external = await prisma.operationCommercialOrder.create({
      data: {
        code: smokeCode(prefix, "EXT_ORDER"),
        status: "confirmed",
        customerType: "customer",
        customerName: smokeCode(prefix, "CUSTOMER"),
        salesChannel: "admin",
        paymentStatus: "paid",
        fulfillmentStatus: "pending",
        totalAmount: 0,
        currency: "USD",
        notes: prefix,
        items: {
          create: [
            {
              productCode: "PRP-FG-STICKER",
              productName: "Sticker PreRescatePTY",
              quantity: 2,
              unitPrice: 0,
              totalPrice: 0,
              unit: "unit",
              notes: prefix,
            },
          ],
        },
        events: { create: { eventType: "CONFIRMED", reason: "Smoke external order" } },
      },
      include: { items: true },
    });
    created.commercialOrderIds.push(external.id);

    const externalFlow = await buildProductionFlow({
      prefix,
      labelPrefix: "EXTERNAL",
      quantity: 2,
      commercialOrderId: external.id,
    });
    created.digitalBatchIds.push(externalFlow.batch.id);
    created.printOrderIds.push(externalFlow.printOrder.id);
    created.productionOrderIds.push(externalFlow.productionOrder.id);
    created.unitIds.push(...externalFlow.units.map((unit) => unit.id));

    const externalUnits = await prisma.operationFinishedGoodUnit.findMany({
      where: { digitalBatchId: externalFlow.batch.id },
    });
    assert(externalUnits.every((unit) => unit.status === "reserved"), "External units not reserved after QC");
    assert(externalUnits.every((unit) => unit.reservedOrderId === external.id), "External reservedOrderId mismatch");

    const dispatch = await prisma.operationDispatch.create({
      data: {
        code: smokeCode(prefix, "DISPATCH"),
        status: "pending_pick",
        destinationType: "customer",
        destinationName: external.customerName,
        destinationReference: external.customerReference,
        notes: prefix,
        items: {
          create: externalUnits.map((unit) => ({
            unitId: unit.id,
            internalLabel: unit.internalLabel,
            productCode: unit.productCode,
            productName: unit.productName,
            quantity: 1,
            unit: "unit",
            status: "pending_pick",
            notes: prefix,
          })),
        },
        events: {
          create: {
            eventType: "DISPATCH_CREATED",
            reason: "Smoke dispatch created",
            metadataJson: JSON.stringify({ commercialOrderId: external.id, unitIds: externalUnits.map((unit) => unit.id) }),
          },
        },
      },
      include: { items: true },
    });
    created.dispatchIds.push(dispatch.id);

    await prisma.operationCommercialOrder.update({
      where: { id: external.id },
      data: { dispatchId: dispatch.id, fulfillmentStatus: "reserved", status: "dispatch_created" },
    });
    await prisma.operationFinishedGoodUnitEvent.createMany({
      data: externalUnits.map((unit) => ({
        unitId: unit.id,
        eventType: "UNIT_ASSIGNED_TO_DISPATCH",
        reason: "Smoke dispatch assignment",
        referenceType: "dispatch",
        referenceId: dispatch.id,
        metadataJson: JSON.stringify({ dispatchId: dispatch.id, commercialOrderId: external.id }),
      })),
    });

    await prisma.operationDispatchEvent.create({
      data: { dispatchId: dispatch.id, eventType: "PICKED", reason: "Smoke pick" },
    });
    await prisma.operationFinishedGoodUnit.updateMany({
      where: { id: { in: externalUnits.map((unit) => unit.id) } },
      data: { status: "reserved" },
    });
    await prisma.operationDispatch.update({ where: { id: dispatch.id }, data: { status: "picked" } });

    await prisma.operationDispatchEvent.create({
      data: { dispatchId: dispatch.id, eventType: "PACKED", reason: "Smoke pack" },
    });
    await prisma.operationDispatch.update({ where: { id: dispatch.id }, data: { status: "packed" } });

    await prisma.operationDispatchEvent.create({
      data: { dispatchId: dispatch.id, eventType: "DISPATCHED", reason: "Smoke dispatched" },
    });
    await prisma.operationFinishedGoodUnit.updateMany({
      where: { id: { in: externalUnits.map((unit) => unit.id) } },
      data: { status: "dispatched", dispatchedAt: new Date() },
    });
    await prisma.operationDispatch.update({
      where: { id: dispatch.id },
      data: { status: "dispatched", sentAt: new Date(), dispatchedAt: new Date() },
    });

    await prisma.operationDispatchEvent.create({
      data: { dispatchId: dispatch.id, eventType: "DELIVERED", reason: "Smoke delivered" },
    });
    await prisma.operationFinishedGoodUnit.updateMany({
      where: { id: { in: externalUnits.map((unit) => unit.id) } },
      data: { status: "delivered", deliveredAt: new Date() },
    });
    await prisma.operationDispatch.update({ where: { id: dispatch.id }, data: { status: "delivered", deliveredAt: new Date() } });

    const deliveredUnits = await prisma.operationFinishedGoodUnit.findMany({ where: { id: { in: externalUnits.map((unit) => unit.id) } } });
    assert(deliveredUnits.every((unit) => unit.status === "delivered"), "External units not delivered");
    assert(deliveredUnits.every((unit) => unit.activationStatus === "not_activated"), "External units must stay not activated");

    const qcFailBatch = await createDigitalBatch(prefix, "QCFAIL", "sticker_normal", 1);
    created.digitalBatchIds.push(qcFailBatch.id);
    const qcFailProd = await prisma.operationProductionOrder.create({
      data: {
        code: smokeCode(prefix, "QCFAIL_PROD"),
        title: smokeCode(prefix, "QCFAIL_PROD"),
        status: "qa_pending",
        plannedQuantity: 1,
        producedQuantity: 1,
        outputType: "sticker_normal",
        notes: prefix,
      },
    });
    created.productionOrderIds.push(qcFailProd.id);
    const qcFailItem = qcFailBatch.items[0];
    await prisma.operationDigitalBatchItem.update({
      where: { id: qcFailItem.id },
      data: {
        productionOrderId: qcFailProd.id,
        nfcProgrammed: true,
        qrPrepared: true,
        preparedAt: new Date(),
        status: "assembled",
      },
    });
    const qcFailUnit = await prisma.operationFinishedGoodUnit.create({
      data: {
        internalLabel: qcFailItem.internalLabel,
        productCode: "PRP-FG-STICKER",
        productName: "Sticker PreRescatePTY",
        productType: "sticker_normal",
        digitalBatchId: qcFailBatch.id,
        digitalBatchItemId: qcFailItem.id,
        status: "qa_failed",
        qaStatus: "failed",
        activationStatus: "not_activated",
        events: {
          create: {
            eventType: "QA_FAILED",
            reason: "Smoke qc fail",
            metadataJson: JSON.stringify({ smokePrefix: prefix }),
          },
        },
      },
    });
    created.unitIds.push(qcFailUnit.id);

    console.log(
      JSON.stringify({
        prefix,
        internalUnitsAvailable: internalUnits.length,
        externalUnitsReserved: externalUnits.length,
        dispatchId: dispatch.id,
        qcFailUnitId: qcFailUnit.id,
        remainingSmokeRecords: "cleanup-pending",
      })
    );
  } finally {
    await cleanup(prefix, created);
  }
}

main().catch((error) => {
  console.error("[smoke-operations-real-flow-w539l] FAILED:", error);
  process.exitCode = 1;
});
