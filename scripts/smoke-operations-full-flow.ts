import { prisma } from "@/lib/prisma";
import { getOperationMovements } from "@/lib/operations/operation-movements";
import { getOperationHistory } from "@/lib/operations/operation-history";
import { markFinishedGoodUnitActivated } from "@/lib/operations/activate-finished-good-unit";

const CONFIRM = "YES_RUN_W537V_SMOKE";
const CLEANUP_CONFIRM = "YES_CLEAN_W537V_SMOKE";
const PREFIX = "W537V_SMOKE";

function mustConfirm() {
  if (process.env.W537V_SMOKE_CONFIRM !== CONFIRM) {
    throw new Error(`Set W537V_SMOKE_CONFIRM=${CONFIRM} to run the smoke.`);
  }
}

function ts() {
  return new Date().toISOString().replace(/[-:]/g, "").replace(/\..+$/, "").slice(0, 14);
}

function smokeCode(suffix: string, label: string) {
  return `${PREFIX}_${suffix}_${label}`;
}

function assert(cond: unknown, message: string): asserts cond {
  if (!cond) throw new Error(message);
}

async function cleanupSmokeData(ids: Record<string, string[]>, suffix: string) {
  if (process.env.W537V_SMOKE_CLEANUP !== CLEANUP_CONFIRM) {
    throw new Error(`Set W537V_SMOKE_CLEANUP=${CLEANUP_CONFIRM} to cleanup smoke data.`);
  }

  const prefix = `${PREFIX}_${suffix}`;
  const counts: Record<string, number> = {};
  const del = async (key: string, action: () => Promise<{ count: number } | void>) => {
    const result = await action();
    counts[key] = typeof result === "object" && result && "count" in result ? result.count : 0;
  };

  await del("returnEvents", () => prisma.operationReturnEvent.deleteMany({ where: { returnId: { in: ids.returnIds } } }));
  await del("returns", () => prisma.operationReturn.deleteMany({ where: { id: { in: ids.returnIds } } }));
  await del("replacementEvents", () => prisma.operationReplacementEvent.deleteMany({ where: { replacementId: { in: ids.replacementIds } } }));
  await del("replacements", () => prisma.operationReplacement.deleteMany({ where: { id: { in: ids.replacementIds } } }));
  await del("warrantyEvents", () => prisma.operationWarrantyEvent.deleteMany({ where: { warrantyId: { in: ids.warrantyIds } } }));
  await del("warranties", () => prisma.operationWarranty.deleteMany({ where: { id: { in: ids.warrantyIds } } }));
  await del("dispatchEvents", () => prisma.operationDispatchEvent.deleteMany({ where: { dispatchId: { in: ids.dispatchIds } } }));
  await del("dispatchItems", () => prisma.operationDispatchItem.deleteMany({ where: { dispatchId: { in: ids.dispatchIds } } }));
  await del("dispatches", () => prisma.operationDispatch.deleteMany({ where: { id: { in: ids.dispatchIds } } }));
  await del("commercialOrderEvents", () => prisma.operationCommercialOrderEvent.deleteMany({ where: { commercialOrderId: { in: ids.commercialOrderIds } } }));
  await del("commercialOrderItems", () => prisma.operationCommercialOrderItem.deleteMany({ where: { commercialOrderId: { in: ids.commercialOrderIds } } }));
  await del("commercialOrders", () => prisma.operationCommercialOrder.deleteMany({ where: { id: { in: ids.commercialOrderIds } } }));
  await del("unitEvents", () => prisma.operationFinishedGoodUnitEvent.deleteMany({ where: { unitId: { in: ids.unitIds } } }));
  await del("units", () => prisma.operationFinishedGoodUnit.deleteMany({ where: { id: { in: ids.unitIds } } }));
  await del("productionEvents", () => prisma.operationProductionEvent.deleteMany({ where: { productionOrderId: { in: ids.productionOrderIds } } }));
  await del("productionItems", () => prisma.operationProductionOrderItem.deleteMany({ where: { productionOrderId: { in: ids.productionOrderIds } } }));
  await del("productionOrders", () => prisma.operationProductionOrder.deleteMany({ where: { id: { in: ids.productionOrderIds } } }));
  await del("printOrderItems", () => prisma.operationPrintOrderItem.deleteMany({ where: { printOrderId: { in: ids.printOrderIds } } }));
  await del("printOrders", () => prisma.operationPrintOrder.deleteMany({ where: { id: { in: ids.printOrderIds } } }));
  await del("digitalBatchItems", () => prisma.operationDigitalBatchItem.deleteMany({ where: { batchId: { in: ids.digitalBatchIds } } }));
  await del("digitalBatches", () => prisma.operationDigitalBatch.deleteMany({ where: { id: { in: ids.digitalBatchIds } } }));

  const remaining = await prisma.operationDigitalBatch.findMany({ where: { code: { startsWith: PREFIX } }, select: { code: true } });
  assert(remaining.length === 0, `Smoke cleanup incomplete: ${remaining.map((row) => row.code).join(", ")}`);
  console.log(JSON.stringify({ cleanupCounts: counts, remainingSmokeRecords: 0, prefix }));
}

async function main() {
  mustConfirm();
  const suffix = ts();
  const tag = `${PREFIX}_${suffix}`;
  const created = {
    digitalBatchIds: [] as string[],
    printOrderIds: [] as string[],
    productionOrderIds: [] as string[],
    unitIds: [] as string[],
    commercialOrderIds: [] as string[],
    dispatchIds: [] as string[],
    warrantyIds: [] as string[],
    replacementIds: [] as string[],
    returnIds: [] as string[],
  };

  const validations: string[] = [];
  const createdCounts: Record<string, number> = {};

  try {
    const finishedGood = await prisma.operationFinishedGood.upsert({
      where: { code: "PRP-FG-STICKER" },
      create: { code: "PRP-FG-STICKER", name: "Sticker PreRescatePTY", productType: "sticker_normal", unit: "unit" },
      update: { name: "Sticker PreRescatePTY", productType: "sticker_normal", unit: "unit" },
    });
    assert(finishedGood.code === "PRP-FG-STICKER", "finishedGood base not ready");
    validations.push("base finished good ready");

    const batch = await prisma.operationDigitalBatch.create({
      data: {
        code: smokeCode(suffix, "DIGITAL_BATCH"),
        name: tag,
        productType: "sticker_normal",
        finishedGoodCode: "PRP-FG-STICKER",
        prefix: tag,
        startNumber: 1,
        endNumber: 3,
        quantity: 3,
        status: "generated",
        items: {
          create: Array.from({ length: 3 }, (_, i) => ({
            internalLabel: `${tag}-${String(i + 1).padStart(4, "0")}`,
            sequenceNumber: i + 1,
            qrUrl: `https://smoke.invalid/${tag}/${i + 1}`,
            nfcUrl: `https://smoke.invalid/${tag}/nfc/${i + 1}`,
            activationUrl: `https://smoke.invalid/activar/${tag}-${String(i + 1).padStart(4, "0")}`,
            status: "available",
          })),
        },
      },
      include: { items: true },
    });
    created.digitalBatchIds.push(batch.id);
    createdCounts.digitalBatches = 1;
    createdCounts.digitalBatchItems = 3;
    assert(batch.items.length === 3, "Digital batch items not created");
    validations.push("digital batch created");

    const printOrder = await prisma.operationPrintOrder.create({
      data: {
        code: smokeCode(suffix, "PRINT_ORDER"),
        supplierName: `${tag}_SUPPLIER`,
        productType: "sticker_normal",
        finishedGoodCode: "PRP-FG-STICKER",
        digitalBatchId: batch.id,
        rangeStartLabel: batch.items[0].internalLabel,
        rangeEndLabel: batch.items[2].internalLabel,
        quantity: 3,
        includesSticker: true,
        includesActivationCard: true,
        includesPresentation: true,
        includesPackaging: true,
        status: "sent",
        sentAt: new Date(),
        items: {
          create: batch.items.map((item) => ({
            digitalBatchItemId: item.id,
            internalLabel: item.internalLabel,
            status: "sent",
            sentAt: new Date(),
          })),
        },
      },
      include: { items: true },
    });
    created.printOrderIds.push(printOrder.id);
    assert(printOrder.items.length === 3, "Print order items not created");
    await prisma.operationDigitalBatchItem.updateMany({
      where: { batchId: batch.id },
      data: { status: "printed" },
    });
    await prisma.operationPrintOrder.update({
      where: { id: printOrder.id },
      data: { status: "received", receivedAt: new Date() },
    });
    validations.push("print order sent and received");

    const productionOrder = await prisma.operationProductionOrder.create({
      data: {
        code: smokeCode(suffix, "PRODUCTION"),
        title: tag,
        status: "draft",
        plannedQuantity: 3,
        producedQuantity: 0,
        outputType: "sticker_normal",
        notes: tag,
        events: { create: { eventType: "CREATED", quantity: 3, reason: "Smoke production order", metadataJson: JSON.stringify({ tag }) } },
      },
    });
    created.productionOrderIds.push(productionOrder.id);
    validations.push("production order created");

    const printedItems = await prisma.operationDigitalBatchItem.findMany({
      where: { batchId: batch.id, status: "printed" },
      orderBy: { sequenceNumber: "asc" },
    });
    assert(printedItems.length === 3, "Printed items not ready");

    const units = await prisma.$transaction(async (tx) => {
      const createdUnits = [];
      for (const item of printedItems) {
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
            events: { create: { eventType: "CREATED", reason: "Smoke unit created", metadataJson: { tag, source: "smoke" } } },
          },
        });
        await tx.operationDigitalBatchItem.update({ where: { id: item.id }, data: { status: "assembled" } });
        createdUnits.push(unit);
      }
      return createdUnits;
    });
    created.unitIds.push(...units.map((u) => u.id));
    assert(units.length === 3, "Units not created");
    validations.push("units assembled");

    const qaPassedUnits = units.slice(0, 2);
    const qaFailedUnit = units[2];
    for (const unit of qaPassedUnits) {
      await prisma.operationFinishedGoodUnit.update({
        where: { id: unit.id },
        data: {
          status: "available",
          qaStatus: "passed",
          events: { create: { eventType: "QA_PASSED", metadataJson: { ...Object.fromEntries(["nfcWorks","qrWorks","internalLabelCorrect","stickerCorrect","activationCardCorrect","packagingCorrect","sealedPackage","productTypeCorrect"].map((k) => [k, true])), tag } } },
        },
      });
    }
    await prisma.operationFinishedGoodUnit.update({
      where: { id: qaFailedUnit.id },
      data: {
        status: "qa_failed",
        qaStatus: "failed",
        events: { create: { eventType: "QA_FAILED", reason: "Smoke QA fail", metadataJson: { tag, failed: true } } },
      },
    });
    validations.push("qa processed");

    const commercialOrder = await prisma.operationCommercialOrder.create({
      data: {
        code: smokeCode(suffix, "COMMERCIAL"),
        status: "confirmed",
        customerType: "customer",
        customerName: `${tag}_CUSTOMER`,
        salesChannel: "admin",
        paymentStatus: "paid",
        fulfillmentStatus: "pending",
        totalAmount: 0,
        currency: "USD",
        notes: tag,
        items: {
          create: [
            {
              productCode: "PRP-FG-STICKER",
              productName: "Sticker PreRescatePTY",
              quantity: 2,
              unitPrice: 0,
              totalPrice: 0,
              unit: "unit",
              notes: tag,
              finishedGoodId: finishedGood.id,
            },
          ],
        },
        events: { create: { eventType: "CREATED", reason: "Smoke commercial order", metadataJson: JSON.stringify({ tag }) } },
      },
      include: { items: true },
    });
    created.commercialOrderIds.push(commercialOrder.id);
    validations.push("commercial order created");

    const reservedUnits = qaPassedUnits.slice(0, 2);
    await prisma.operationFinishedGoodUnit.updateMany({
      where: { id: { in: reservedUnits.map((u) => u.id) } },
      data: { status: "reserved", reservedOrderId: commercialOrder.id, reservedAt: new Date() },
    });
    await prisma.operationFinishedGoodUnitEvent.createMany({
      data: reservedUnits.map((unit) => ({
        unitId: unit.id,
        eventType: "RESERVED",
        reason: `Reservado para ${commercialOrder.code}`,
        referenceType: "commercial_order",
        referenceId: commercialOrder.id,
        metadataJson: { tag, commercialOrderId: commercialOrder.id },
      })),
    });
    await prisma.operationCommercialOrder.update({
      where: { id: commercialOrder.id },
      data: { status: "stock_reserved", fulfillmentStatus: "reserved" },
    });
    validations.push("units reserved");

    const dispatch = await prisma.operationDispatch.create({
      data: {
        code: smokeCode(suffix, "DISPATCH"),
        status: "pending_pick",
        destinationType: "customer",
        destinationName: `${tag}_DEST`,
        destinationReference: tag,
        notes: tag,
        items: {
          create: reservedUnits.map((unit) => ({
            unitId: unit.id,
            internalLabel: unit.internalLabel,
            productCode: unit.productCode,
            productName: unit.productName,
            quantity: 1,
            unit: "unit",
            status: "pending_pick",
          })),
        },
        events: { create: { eventType: "CREATED", reason: "Smoke dispatch created", metadataJson: JSON.stringify({ tag }) } },
      },
      include: { items: true },
    });
    created.dispatchIds.push(dispatch.id);
    validations.push("dispatch created");

    const dispatchEvents = [
      "PICKED",
      "PACKED",
      "DISPATCHED",
      "DELIVERED",
    ] as const;
    for (const eventType of dispatchEvents) {
      await prisma.operationDispatchEvent.create({
        data: {
          dispatchId: dispatch.id,
          eventType,
          reason: `Smoke ${eventType}`,
          metadataJson: JSON.stringify({ tag }),
        },
      });
      const nextStatus = eventType === "PICKED" ? "picked" : eventType === "PACKED" ? "packed" : eventType === "DISPATCHED" ? "dispatched" : "delivered";
      await prisma.operationDispatch.update({
        where: { id: dispatch.id },
        data: eventType === "DISPATCHED" ? { status: nextStatus, sentAt: new Date(), dispatchedAt: new Date() } : eventType === "DELIVERED" ? { status: nextStatus, deliveredAt: new Date() } : { status: nextStatus },
      });
      if (["PICKED", "DISPATCHED", "DELIVERED"].includes(eventType)) {
        for (const unit of reservedUnits) {
          await prisma.operationFinishedGoodUnit.update({
            where: { id: unit.id },
            data: {
              status: eventType === "DELIVERED" ? "delivered" : "dispatched",
              dispatchedAt: eventType === "DISPATCHED" ? new Date() : unit.dispatchedAt,
              deliveredAt: eventType === "DELIVERED" ? new Date() : unit.deliveredAt,
              events: {
                create: {
                  eventType,
                  reason: `Smoke ${eventType}`,
                  referenceType: "dispatch",
                  referenceId: dispatch.id,
                  metadataJson: { tag, dispatchId: dispatch.id, internalLabel: unit.internalLabel },
                },
              },
            },
          });
        }
      }
    }
    validations.push("dispatch advanced to delivered");

    const activationResult = await markFinishedGoodUnitActivated({
      internalLabel: reservedUnits[0].internalLabel,
      activationReferenceType: "smoke_test",
      activationReferenceId: tag,
    });
    assert(activationResult.ok, "Activation helper failed");
    validations.push("one unit activated");

    const warranty = await prisma.operationWarranty.create({
      data: {
        code: smokeCode(suffix, "WARRANTY"),
        status: "active",
        warrantyType: "standard",
        coverageStatus: "valid",
        customerName: `${tag}_CUSTOMER`,
        unitId: reservedUnits[0].id,
        internalLabel: reservedUnits[0].internalLabel,
        productCode: reservedUnits[0].productCode,
        productName: reservedUnits[0].productName,
        commercialOrderId: commercialOrder.id,
        finishedGoodId: finishedGood.id,
        notes: tag,
        events: { create: { eventType: "WARRANTY_OPENED", reason: "Smoke warranty", metadataJson: JSON.stringify({ tag }) } },
      },
    });
    created.warrantyIds.push(warranty.id);

    const replacement = await prisma.operationReplacement.create({
      data: {
        code: smokeCode(suffix, "REPLACEMENT"),
        status: "draft",
        replacementType: "warranty",
        reason: `${tag}_REPLACEMENT`,
        customerName: `${tag}_CUSTOMER`,
        warrantyId: warranty.id,
        commercialOrderId: commercialOrder.id,
        originalUnitId: reservedUnits[0].id,
        originalInternalLabel: reservedUnits[0].internalLabel,
        notes: tag,
        events: { create: { eventType: "REPLACEMENT_REQUESTED", reason: "Smoke replacement", metadataJson: JSON.stringify({ tag }) } },
      },
    });
    created.replacementIds.push(replacement.id);

    const returnRecord = await prisma.operationReturn.create({
      data: {
        code: smokeCode(suffix, "RETURN"),
        status: "draft",
        returnType: "customer_return",
        reason: `${tag}_RETURN`,
        customerName: `${tag}_CUSTOMER`,
        warrantyId: warranty.id,
        commercialOrderId: commercialOrder.id,
        finishedGoodId: finishedGood.id,
        originalDispatchId: dispatch.id,
        unitId: reservedUnits[0].id,
        internalLabel: reservedUnits[0].internalLabel,
        productCode: reservedUnits[0].productCode,
        productName: reservedUnits[0].productName,
        notes: tag,
        events: { create: { eventType: "RETURN_REQUESTED", reason: "Smoke return", metadataJson: JSON.stringify({ tag }) } },
      },
    });
    created.returnIds.push(returnRecord.id);
    validations.push("after sales created");

    const movements = await getOperationMovements({ search: tag, limit: 100 });
    assert(movements.length > 0, "No smoke movements found");

    const history = await getOperationHistory({ entityType: "unit", identifier: reservedUnits[0].internalLabel, limit: 100 });
    assert(history.timeline.length > 0, "History not found");

    console.log(
      JSON.stringify(
        {
          createdCounts,
          validations,
          smokeTag: tag,
          unitStatuses: await prisma.operationFinishedGoodUnit.findMany({
            where: { id: { in: created.unitIds } },
            select: { internalLabel: true, status: true, qaStatus: true, activationStatus: true, reservedOrderId: true },
          }),
          movementCount: movements.length,
          historyEvents: history.timeline.length,
        },
        null,
        2
      )
    );

    await cleanupSmokeData(created, suffix);
  } catch (error) {
    console.error("[smoke-operations-full-flow] FAILED:", error);
    console.error(JSON.stringify({ created, validations, suffix }, null, 2));
    throw error;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
