import { PrismaClient } from "@prisma/client";

const CONFIRMATION_VALUE = "YES_CLEAN_OPERATIONS_SMOKE";
const DEFAULT_PREFIXES = ["W530D_SMOKE", "W531D_SMOKE", "W534C_SMOKE", "W535D_SMOKE"] as const;
const DRY_RUN = process.env.DRY_RUN !== "false";

const prisma = new PrismaClient();

type CountRow = {
  model: string;
  found: number;
  deleted: number;
};

type IdBuckets = {
  materialIds: string[];
  productionOrderIds: string[];
  productionOrderItemIds: string[];
  qcInspectionIds: string[];
  packingBatchIds: string[];
  finishedGoodIds: string[];
  dispatchIds: string[];
  dispatchItemIds: string[];
  commercialOrderIds: string[];
  commercialOrderItemIds: string[];
  warrantyIds: string[];
  replacementIds: string[];
  returnIds: string[];
};

function unique(values: string[]) {
  return [...new Set(values)];
}

function prefixFilter(field: string, prefixes: readonly string[]) {
  return prefixes.map((prefix) => ({ [field]: { startsWith: prefix } }));
}

function orStartsWith(field: string, prefixes: readonly string[]) {
  return { OR: prefixFilter(field, prefixes) };
}

async function main() {
  if (process.env.CONFIRM_CLEAN_OPERATIONS_SMOKE !== CONFIRMATION_VALUE) {
    throw new Error(
      `Set CONFIRM_CLEAN_OPERATIONS_SMOKE=${CONFIRMATION_VALUE} to run the operations smoke cleanup.`
    );
  }

  const prefixes = DEFAULT_PREFIXES;
  console.log("Modo seguro iniciado");
  console.log(`Dry run: ${DRY_RUN ? "si" : "no"}`);
  console.log(`Prefijos incluidos: ${prefixes.join(", ")}`);

  const [
    materials,
    productionOrders,
    qcInspections,
    packingBatches,
    finishedGoods,
    dispatches,
    commercialOrders,
    warranties,
    replacements,
    returns,
  ] = await Promise.all([
    prisma.operationMaterial.findMany({
      where: {
        OR: [
          ...prefixFilter("code", prefixes),
          ...prefixFilter("name", prefixes),
        ],
      },
      select: { id: true },
    }),
    prisma.operationProductionOrder.findMany({
      where: {
        OR: [
          ...prefixFilter("code", prefixes),
          ...prefixFilter("title", prefixes),
        ],
      },
      select: { id: true },
    }),
    prisma.operationQcInspection.findMany({
      where: orStartsWith("code", prefixes),
      select: { id: true },
    }),
    prisma.operationPackingBatch.findMany({
      where: {
        OR: [
          ...prefixFilter("code", prefixes),
          ...prefixFilter("labelCode", prefixes),
        ],
      },
      select: { id: true },
    }),
    prisma.operationFinishedGood.findMany({
      where: {
        OR: [
          ...prefixFilter("code", prefixes),
          ...prefixFilter("name", prefixes),
          ...prefixFilter("productType", prefixes),
        ],
      },
      select: { id: true },
    }),
    prisma.operationDispatch.findMany({
      where: {
        OR: [
          ...prefixFilter("code", prefixes),
          ...prefixFilter("destinationReference", prefixes),
        ],
      },
      select: { id: true },
    }),
    prisma.operationCommercialOrder.findMany({
      where: {
        OR: [
          ...prefixFilter("code", prefixes),
          ...prefixFilter("customerName", prefixes),
          ...prefixFilter("customerReference", prefixes),
        ],
      },
      select: { id: true },
    }),
    prisma.operationWarranty.findMany({
      where: {
        OR: [
          ...prefixFilter("code", prefixes),
          ...prefixFilter("customerName", prefixes),
          ...prefixFilter("serialReference", prefixes),
        ],
      },
      select: { id: true },
    }),
    prisma.operationReplacement.findMany({
      where: {
        OR: [
          ...prefixFilter("code", prefixes),
          ...prefixFilter("customerName", prefixes),
        ],
      },
      select: { id: true },
    }),
    prisma.operationReturn.findMany({
      where: {
        OR: [
          ...prefixFilter("code", prefixes),
          ...prefixFilter("customerName", prefixes),
        ],
      },
      select: { id: true },
    }),
  ]);

  const buckets: IdBuckets = {
    materialIds: unique(materials.map((row) => row.id)),
    productionOrderIds: unique(productionOrders.map((row) => row.id)),
    productionOrderItemIds: [],
    qcInspectionIds: unique(qcInspections.map((row) => row.id)),
    packingBatchIds: unique(packingBatches.map((row) => row.id)),
    finishedGoodIds: unique(finishedGoods.map((row) => row.id)),
    dispatchIds: unique(dispatches.map((row) => row.id)),
    dispatchItemIds: [],
    commercialOrderIds: unique(commercialOrders.map((row) => row.id)),
    commercialOrderItemIds: [],
    warrantyIds: unique(warranties.map((row) => row.id)),
    replacementIds: unique(replacements.map((row) => row.id)),
    returnIds: unique(returns.map((row) => row.id)),
  };

  if (
    buckets.materialIds.length === 0 &&
    buckets.productionOrderIds.length === 0 &&
    buckets.qcInspectionIds.length === 0 &&
    buckets.packingBatchIds.length === 0 &&
    buckets.finishedGoodIds.length === 0 &&
    buckets.dispatchIds.length === 0 &&
    buckets.commercialOrderIds.length === 0 &&
    buckets.warrantyIds.length === 0 &&
    buckets.replacementIds.length === 0 &&
    buckets.returnIds.length === 0
  ) {
    throw new Error("No smoke data matched the configured prefixes. Aborting without changes.");
  }

  const [
    productionOrderItems,
    dispatchItems,
    commercialOrderItems,
    materialEvents,
    productionEvents,
    qcEvents,
    packingEvents,
    finishedGoodEvents,
    dispatchEvents,
    commercialOrderEvents,
    warrantyEvents,
    replacementEvents,
    returnEvents,
  ] = await Promise.all([
    prisma.operationProductionOrderItem.findMany({
      where: { productionOrderId: { in: buckets.productionOrderIds } },
      select: { id: true },
    }),
    prisma.operationDispatchItem.findMany({
      where: { dispatchId: { in: buckets.dispatchIds } },
      select: { id: true },
    }),
    prisma.operationCommercialOrderItem.findMany({
      where: { commercialOrderId: { in: buckets.commercialOrderIds } },
      select: { id: true },
    }),
    prisma.operationMaterialEvent.findMany({
      where: { materialId: { in: buckets.materialIds } },
      select: { id: true },
    }),
    prisma.operationProductionEvent.findMany({
      where: { productionOrderId: { in: buckets.productionOrderIds } },
      select: { id: true },
    }),
    prisma.operationQcInspectionEvent.findMany({
      where: { qcInspectionId: { in: buckets.qcInspectionIds } },
      select: { id: true },
    }),
    prisma.operationPackingEvent.findMany({
      where: { packingBatchId: { in: buckets.packingBatchIds } },
      select: { id: true },
    }),
    prisma.operationFinishedGoodEvent.findMany({
      where: { finishedGoodId: { in: buckets.finishedGoodIds } },
      select: { id: true },
    }),
    prisma.operationDispatchEvent.findMany({
      where: { dispatchId: { in: buckets.dispatchIds } },
      select: { id: true },
    }),
    prisma.operationCommercialOrderEvent.findMany({
      where: { commercialOrderId: { in: buckets.commercialOrderIds } },
      select: { id: true },
    }),
    prisma.operationWarrantyEvent.findMany({
      where: { warrantyId: { in: buckets.warrantyIds } },
      select: { id: true },
    }),
    prisma.operationReplacementEvent.findMany({
      where: { replacementId: { in: buckets.replacementIds } },
      select: { id: true },
    }),
    prisma.operationReturnEvent.findMany({
      where: { returnId: { in: buckets.returnIds } },
      select: { id: true },
    }),
  ]);

  buckets.productionOrderItemIds = unique(productionOrderItems.map((row) => row.id));
  buckets.dispatchItemIds = unique(dispatchItems.map((row) => row.id));
  buckets.commercialOrderItemIds = unique(commercialOrderItems.map((row) => row.id));

  const counts: CountRow[] = [
    { model: "OperationReturnEvent", found: returnEvents.length, deleted: 0 },
    { model: "OperationReturn", found: buckets.returnIds.length, deleted: 0 },
    { model: "OperationReplacementEvent", found: replacementEvents.length, deleted: 0 },
    { model: "OperationReplacement", found: buckets.replacementIds.length, deleted: 0 },
    { model: "OperationWarrantyEvent", found: warrantyEvents.length, deleted: 0 },
    { model: "OperationWarranty", found: buckets.warrantyIds.length, deleted: 0 },
    { model: "OperationDispatchEvent", found: dispatchEvents.length, deleted: 0 },
    { model: "OperationDispatchItem", found: buckets.dispatchItemIds.length, deleted: 0 },
    { model: "OperationDispatch", found: buckets.dispatchIds.length, deleted: 0 },
    { model: "OperationCommercialOrderEvent", found: commercialOrderEvents.length, deleted: 0 },
    { model: "OperationCommercialOrderItem", found: buckets.commercialOrderItemIds.length, deleted: 0 },
    { model: "OperationCommercialOrder", found: buckets.commercialOrderIds.length, deleted: 0 },
    { model: "OperationFinishedGoodEvent", found: finishedGoodEvents.length, deleted: 0 },
    { model: "OperationFinishedGood", found: buckets.finishedGoodIds.length, deleted: 0 },
    { model: "OperationPackingEvent", found: packingEvents.length, deleted: 0 },
    { model: "OperationPackingBatch", found: buckets.packingBatchIds.length, deleted: 0 },
    { model: "OperationQcInspectionEvent", found: qcEvents.length, deleted: 0 },
    { model: "OperationQcInspection", found: buckets.qcInspectionIds.length, deleted: 0 },
    { model: "OperationProductionEvent", found: productionEvents.length, deleted: 0 },
    { model: "OperationProductionOrderItem", found: buckets.productionOrderItemIds.length, deleted: 0 },
    { model: "OperationProductionOrder", found: buckets.productionOrderIds.length, deleted: 0 },
    { model: "OperationMaterialEvent", found: materialEvents.length, deleted: 0 },
    { model: "OperationMaterial", found: buckets.materialIds.length, deleted: 0 },
  ];

  console.log("Conteo de registros encontrados por modelo:");
  for (const row of counts) {
    console.log(`- ${row.model}: ${row.found}`);
  }

  console.log("Orden de borrado:");
  [
    "OperationReturnEvent",
    "OperationReturn",
    "OperationReplacementEvent",
    "OperationReplacement",
    "OperationWarrantyEvent",
    "OperationWarranty",
    "OperationDispatchEvent",
    "OperationDispatchItem",
    "OperationDispatch",
    "OperationCommercialOrderEvent",
    "OperationCommercialOrderItem",
    "OperationCommercialOrder",
    "OperationFinishedGoodEvent",
    "OperationFinishedGood",
    "OperationPackingEvent",
    "OperationPackingBatch",
    "OperationQcInspectionEvent",
    "OperationQcInspection",
    "OperationProductionEvent",
    "OperationProductionOrderItem",
    "OperationProductionOrder",
    "OperationMaterialEvent",
    "OperationMaterial",
  ].forEach((model, index) => console.log(`${index + 1}. ${model}`));

  if (DRY_RUN) {
    console.log("Dry run activo. No se borro ningun registro.");
    return;
  }

  const deleteResult = async (model: string, count: number, action: () => Promise<{ count: number }>) => {
    const result = await action();
    const row = counts.find((item) => item.model === model);
    if (row) {
      row.deleted = result.count;
    }
    console.log(`- ${model}: borrados ${result.count} de ${count}`);
  };

  await deleteResult("OperationReturnEvent", returnEvents.length, () =>
    prisma.operationReturnEvent.deleteMany({ where: { returnId: { in: buckets.returnIds } } })
  );
  await deleteResult("OperationReturn", buckets.returnIds.length, () =>
    prisma.operationReturn.deleteMany({ where: { id: { in: buckets.returnIds } } })
  );
  await deleteResult("OperationReplacementEvent", replacementEvents.length, () =>
    prisma.operationReplacementEvent.deleteMany({ where: { replacementId: { in: buckets.replacementIds } } })
  );
  await deleteResult("OperationReplacement", buckets.replacementIds.length, () =>
    prisma.operationReplacement.deleteMany({ where: { id: { in: buckets.replacementIds } } })
  );
  await deleteResult("OperationWarrantyEvent", warrantyEvents.length, () =>
    prisma.operationWarrantyEvent.deleteMany({ where: { warrantyId: { in: buckets.warrantyIds } } })
  );
  await deleteResult("OperationWarranty", buckets.warrantyIds.length, () =>
    prisma.operationWarranty.deleteMany({ where: { id: { in: buckets.warrantyIds } } })
  );
  await deleteResult("OperationDispatchEvent", dispatchEvents.length, () =>
    prisma.operationDispatchEvent.deleteMany({ where: { dispatchId: { in: buckets.dispatchIds } } })
  );
  await deleteResult("OperationDispatchItem", buckets.dispatchItemIds.length, () =>
    prisma.operationDispatchItem.deleteMany({ where: { id: { in: buckets.dispatchItemIds } } })
  );
  await deleteResult("OperationDispatch", buckets.dispatchIds.length, () =>
    prisma.operationDispatch.deleteMany({ where: { id: { in: buckets.dispatchIds } } })
  );
  await deleteResult("OperationCommercialOrderEvent", commercialOrderEvents.length, () =>
    prisma.operationCommercialOrderEvent.deleteMany({ where: { commercialOrderId: { in: buckets.commercialOrderIds } } })
  );
  await deleteResult("OperationCommercialOrderItem", buckets.commercialOrderItemIds.length, () =>
    prisma.operationCommercialOrderItem.deleteMany({ where: { id: { in: buckets.commercialOrderItemIds } } })
  );
  await deleteResult("OperationCommercialOrder", buckets.commercialOrderIds.length, () =>
    prisma.operationCommercialOrder.deleteMany({ where: { id: { in: buckets.commercialOrderIds } } })
  );
  await deleteResult("OperationFinishedGoodEvent", finishedGoodEvents.length, () =>
    prisma.operationFinishedGoodEvent.deleteMany({ where: { finishedGoodId: { in: buckets.finishedGoodIds } } })
  );
  await deleteResult("OperationFinishedGood", buckets.finishedGoodIds.length, () =>
    prisma.operationFinishedGood.deleteMany({ where: { id: { in: buckets.finishedGoodIds } } })
  );
  await deleteResult("OperationPackingEvent", packingEvents.length, () =>
    prisma.operationPackingEvent.deleteMany({ where: { packingBatchId: { in: buckets.packingBatchIds } } })
  );
  await deleteResult("OperationPackingBatch", buckets.packingBatchIds.length, () =>
    prisma.operationPackingBatch.deleteMany({ where: { id: { in: buckets.packingBatchIds } } })
  );
  await deleteResult("OperationQcInspectionEvent", qcEvents.length, () =>
    prisma.operationQcInspectionEvent.deleteMany({ where: { qcInspectionId: { in: buckets.qcInspectionIds } } })
  );
  await deleteResult("OperationQcInspection", buckets.qcInspectionIds.length, () =>
    prisma.operationQcInspection.deleteMany({ where: { id: { in: buckets.qcInspectionIds } } })
  );
  await deleteResult("OperationProductionEvent", productionEvents.length, () =>
    prisma.operationProductionEvent.deleteMany({ where: { productionOrderId: { in: buckets.productionOrderIds } } })
  );
  await deleteResult("OperationProductionOrderItem", buckets.productionOrderItemIds.length, () =>
    prisma.operationProductionOrderItem.deleteMany({ where: { id: { in: buckets.productionOrderItemIds } } })
  );
  await deleteResult("OperationProductionOrder", buckets.productionOrderIds.length, () =>
    prisma.operationProductionOrder.deleteMany({ where: { id: { in: buckets.productionOrderIds } } })
  );
  await deleteResult("OperationMaterialEvent", materialEvents.length, () =>
    prisma.operationMaterialEvent.deleteMany({ where: { materialId: { in: buckets.materialIds } } })
  );
  await deleteResult("OperationMaterial", buckets.materialIds.length, () =>
    prisma.operationMaterial.deleteMany({ where: { id: { in: buckets.materialIds } } })
  );

  console.log("Resumen final:");
  for (const row of counts) {
    console.log(`- ${row.model}: encontrados ${row.found}, borrados ${row.deleted}`);
  }
}

main()
  .catch((error) => {
    console.error("Error en limpieza de datos smoke:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
