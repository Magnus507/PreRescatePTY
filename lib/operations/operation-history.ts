import { prisma } from "@/lib/prisma";
import { getOperationMovements, type OperationMovement } from "./operation-movements";

export type HistoryEntityType =
  | "unit"
  | "commercial_order"
  | "digital_batch"
  | "print_order"
  | "production_order"
  | "dispatch"
  | "warranty"
  | "replacement"
  | "return";

export interface OperationHistorySubject {
  entityType: HistoryEntityType;
  entityId: string;
  entityCode: string | null;
  internalLabel: string | null;
  title: string;
  subtitle: string | null;
  currentStatus: string | null;
  activationStatus: string | null;
}

export interface OperationHistoryTimelineItem extends OperationMovement {
  related: {
    commercialOrderId: string | null;
    dispatchId: string | null;
    unitId: string | null;
    digitalBatchId: string | null;
    printOrderId: string | null;
    productionOrderId: string | null;
    warrantyId: string | null;
    replacementId: string | null;
    returnId: string | null;
  };
}

export interface OperationHistorySummary {
  totalEvents: number;
  firstEventAt: string | null;
  lastEventAt: string | null;
  currentStatus: string | null;
  activationStatus: string | null;
  deliveredPendingActivation: boolean | null;
}

export interface OperationHistoryResult {
  subject: OperationHistorySubject | null;
  timeline: OperationHistoryTimelineItem[];
  summary: OperationHistorySummary;
  suggestions?: Array<{ type: HistoryEntityType; id: string; label: string; subtitle: string | null }>;
}

function toTimelineItem(
  movement: OperationMovement,
  related: OperationHistoryTimelineItem["related"]
): OperationHistoryTimelineItem {
  return { ...movement, related };
}

function emptyResult(): OperationHistoryResult {
  return {
    subject: null,
    timeline: [],
    summary: {
      totalEvents: 0,
      firstEventAt: null,
      lastEventAt: null,
      currentStatus: null,
      activationStatus: null,
      deliveredPendingActivation: null,
    },
  };
}

function unitSubject(unit: {
  id: string;
  internalLabel: string;
  status: string;
  activationStatus: string;
}) {
  return {
    entityType: "unit" as const,
    entityId: unit.id,
    entityCode: unit.internalLabel,
    internalLabel: unit.internalLabel,
    title: unit.internalLabel,
    subtitle: "Unidad física",
    currentStatus: unit.status,
    activationStatus: unit.activationStatus,
  };
}

function relatedForMovement(
  movement: OperationMovement,
  entityType: HistoryEntityType,
  entityId: string | null
): OperationHistoryTimelineItem["related"] {
  return {
    commercialOrderId: movement.commercialOrderId,
    dispatchId: movement.dispatchId,
    unitId: entityType === "unit" ? entityId : null,
    digitalBatchId: entityType === "digital_batch" ? entityId : null,
    printOrderId: entityType === "print_order" ? entityId : null,
    productionOrderId: entityType === "production_order" ? entityId : null,
    warrantyId: entityType === "warranty" ? entityId : null,
    replacementId: entityType === "replacement" ? entityId : null,
    returnId: entityType === "return" ? entityId : null,
  };
}

async function buildUnitHistoryByLabel(internalLabel: string, limit: number) {
  const unit = await prisma.operationFinishedGoodUnit.findUnique({
    where: { internalLabel },
    select: { id: true, internalLabel: true, status: true, activationStatus: true },
  });
  if (!unit) return null;

  const movements = await getOperationMovements({ internalLabel, limit: Math.max(limit, 250) });
  return {
    subject: unitSubject(unit),
    timeline: movements.slice(0, limit).map((movement) =>
      toTimelineItem(movement, {
        commercialOrderId: movement.commercialOrderId,
        dispatchId: movement.dispatchId,
        unitId: unit.id,
        digitalBatchId: movement.source === "digital_batch" ? movement.entityId : null,
        printOrderId: movement.source === "print_order" ? movement.entityId : null,
        productionOrderId: movement.source === "production" ? movement.entityId : null,
        warrantyId: movement.source === "warranty" ? movement.entityId : null,
        replacementId: movement.source === "replacement" ? movement.entityId : null,
        returnId: movement.source === "return" ? movement.entityId : null,
      })
    ),
    summary: {
      totalEvents: Math.min(movements.length, limit),
      firstEventAt: movements.slice(0, limit).at(-1)?.occurredAt || null,
      lastEventAt: movements[0]?.occurredAt || null,
      currentStatus: unit.status,
      activationStatus: unit.activationStatus,
      deliveredPendingActivation:
        unit.status === "delivered" && unit.activationStatus === "not_activated",
    },
  } satisfies OperationHistoryResult;
}

async function buildCommercialOrderHistoryById(id: string, limit: number) {
  const order = await prisma.operationCommercialOrder.findUnique({
    where: { id },
    select: {
      id: true,
      code: true,
      status: true,
      fulfillmentStatus: true,
      paymentStatus: true,
    },
  });
  if (!order) return null;

  const movements = await getOperationMovements({
    commercialOrderId: id,
    limit: Math.max(limit, 250),
  });
  const exactMovements = movements.slice(0, limit);

  return {
    subject: {
      entityType: "commercial_order" as const,
      entityId: order.id,
      entityCode: order.code,
      internalLabel: null,
      title: order.code,
      subtitle: "Pedido",
      currentStatus: `${order.status} / ${order.paymentStatus} / ${order.fulfillmentStatus}`,
      activationStatus: null,
    },
    timeline: exactMovements.map((movement) =>
      toTimelineItem(movement, {
        commercialOrderId: order.id,
        dispatchId: movement.dispatchId,
        unitId: null,
        digitalBatchId: null,
        printOrderId: null,
        productionOrderId: null,
        warrantyId: null,
        replacementId: null,
        returnId: null,
      })
    ),
    summary: {
      totalEvents: exactMovements.length,
      firstEventAt: exactMovements.at(-1)?.occurredAt || null,
      lastEventAt: exactMovements[0]?.occurredAt || null,
      currentStatus: order.status,
      activationStatus: null,
      deliveredPendingActivation: null,
    },
  } satisfies OperationHistoryResult;
}

function sourceForEntityType(entityType: HistoryEntityType) {
  if (entityType === "production_order") return "production";
  if (entityType === "commercial_order") return "commercial_order";
  if (entityType === "digital_batch") return "digital_batch";
  if (entityType === "print_order") return "print_order";
  if (entityType === "dispatch") return "dispatch";
  if (entityType === "warranty") return "warranty";
  if (entityType === "replacement") return "replacement";
  if (entityType === "return") return "return";
  return null;
}

async function resolveEntitySubjectById(
  entityType: Exclude<HistoryEntityType, "unit" | "commercial_order">,
  entityId: string
): Promise<OperationHistorySubject | null> {
  if (entityType === "digital_batch") {
    const row = await prisma.operationDigitalBatch.findUnique({
      where: { id: entityId },
      select: { id: true, code: true, name: true, status: true },
    });
    return row
      ? {
          entityType,
          entityId: row.id,
          entityCode: row.code,
          internalLabel: null,
          title: row.code,
          subtitle: row.name || "Lote digital",
          currentStatus: row.status,
          activationStatus: null,
        }
      : null;
  }

  if (entityType === "print_order") {
    const row = await prisma.operationPrintOrder.findUnique({
      where: { id: entityId },
      select: { id: true, code: true, supplierName: true, status: true },
    });
    return row
      ? {
          entityType,
          entityId: row.id,
          entityCode: row.code,
          internalLabel: null,
          title: row.code,
          subtitle: row.supplierName || "Imprenta",
          currentStatus: row.status,
          activationStatus: null,
        }
      : null;
  }

  if (entityType === "production_order") {
    const row = await prisma.operationProductionOrder.findUnique({
      where: { id: entityId },
      select: { id: true, code: true, status: true },
    });
    return row
      ? {
          entityType,
          entityId: row.id,
          entityCode: row.code,
          internalLabel: null,
          title: row.code,
          subtitle: "Producción",
          currentStatus: row.status,
          activationStatus: null,
        }
      : null;
  }

  if (entityType === "dispatch") {
    const row = await prisma.operationDispatch.findUnique({
      where: { id: entityId },
      select: { id: true, code: true, destinationName: true, status: true },
    });
    return row
      ? {
          entityType,
          entityId: row.id,
          entityCode: row.code,
          internalLabel: null,
          title: row.code,
          subtitle: row.destinationName || "Despacho",
          currentStatus: row.status,
          activationStatus: null,
        }
      : null;
  }

  if (entityType === "warranty") {
    const row = await prisma.operationWarranty.findUnique({
      where: { id: entityId },
      select: {
        id: true,
        code: true,
        status: true,
        coverageStatus: true,
        internalLabel: true,
      },
    });
    return row
      ? {
          entityType,
          entityId: row.id,
          entityCode: row.code,
          internalLabel: row.internalLabel,
          title: row.code,
          subtitle: row.internalLabel || "Garantía",
          currentStatus: `${row.status} / ${row.coverageStatus}`,
          activationStatus: null,
        }
      : null;
  }

  if (entityType === "replacement") {
    const row = await prisma.operationReplacement.findUnique({
      where: { id: entityId },
      select: {
        id: true,
        code: true,
        status: true,
        originalInternalLabel: true,
        replacementInternalLabel: true,
      },
    });
    return row
      ? {
          entityType,
          entityId: row.id,
          entityCode: row.code,
          internalLabel: row.originalInternalLabel || row.replacementInternalLabel,
          title: row.code,
          subtitle: row.originalInternalLabel || "Reemplazo",
          currentStatus: row.status,
          activationStatus: null,
        }
      : null;
  }

  const row = await prisma.operationReturn.findUnique({
    where: { id: entityId },
    select: {
      id: true,
      code: true,
      status: true,
      returnType: true,
      internalLabel: true,
    },
  });
  return row
    ? {
        entityType: "return",
        entityId: row.id,
        entityCode: row.code,
        internalLabel: row.internalLabel,
        title: row.code,
        subtitle: row.internalLabel || row.returnType || "Devolución",
        currentStatus: row.status,
        activationStatus: null,
      }
    : null;
}

async function searchSuggestions(search: string, limit: number) {
  const [units, batches, prints, orders, dispatches, warranties, replacements, returns_] =
    await Promise.all([
      prisma.operationFinishedGoodUnit.findMany({
        where: { internalLabel: { contains: search, mode: "insensitive" } },
        take: 5,
        select: { id: true, internalLabel: true, productName: true },
      }),
      prisma.operationDigitalBatch.findMany({
        where: {
          OR: [
            { code: { contains: search, mode: "insensitive" } },
            { finishedGoodCode: { contains: search, mode: "insensitive" } },
          ],
        },
        take: 5,
        select: { id: true, code: true, name: true },
      }),
      prisma.operationPrintOrder.findMany({
        where: { code: { contains: search, mode: "insensitive" } },
        take: 5,
        select: { id: true, code: true, supplierName: true },
      }),
      prisma.operationCommercialOrder.findMany({
        where: { code: { contains: search, mode: "insensitive" } },
        take: 5,
        select: { id: true, code: true, customerName: true },
      }),
      prisma.operationDispatch.findMany({
        where: { code: { contains: search, mode: "insensitive" } },
        take: 5,
        select: { id: true, code: true, destinationName: true },
      }),
      prisma.operationWarranty.findMany({
        where: { code: { contains: search, mode: "insensitive" } },
        take: 5,
        select: { id: true, code: true, customerName: true },
      }),
      prisma.operationReplacement.findMany({
        where: { code: { contains: search, mode: "insensitive" } },
        take: 5,
        select: { id: true, code: true, customerName: true },
      }),
      prisma.operationReturn.findMany({
        where: { code: { contains: search, mode: "insensitive" } },
        take: 5,
        select: { id: true, code: true, customerName: true },
      }),
    ]);

  return [
    ...units.map((item) => ({
      type: "unit" as const,
      id: item.id,
      label: item.internalLabel,
      subtitle: item.productName,
    })),
    ...batches.map((item) => ({
      type: "digital_batch" as const,
      id: item.id,
      label: item.code,
      subtitle: item.name,
    })),
    ...prints.map((item) => ({
      type: "print_order" as const,
      id: item.id,
      label: item.code,
      subtitle: item.supplierName,
    })),
    ...orders.map((item) => ({
      type: "commercial_order" as const,
      id: item.id,
      label: item.code,
      subtitle: item.customerName,
    })),
    ...dispatches.map((item) => ({
      type: "dispatch" as const,
      id: item.id,
      label: item.code,
      subtitle: item.destinationName,
    })),
    ...warranties.map((item) => ({
      type: "warranty" as const,
      id: item.id,
      label: item.code,
      subtitle: item.customerName,
    })),
    ...replacements.map((item) => ({
      type: "replacement" as const,
      id: item.id,
      label: item.code,
      subtitle: item.customerName,
    })),
    ...returns_.map((item) => ({
      type: "return" as const,
      id: item.id,
      label: item.code,
      subtitle: item.customerName,
    })),
  ].slice(0, limit);
}

export async function getOperationHistory(params: {
  entityType?: HistoryEntityType | null;
  entityId?: string | null;
  identifier?: string | null;
  internalLabel?: string | null;
  search?: string | null;
  limit?: number;
}): Promise<OperationHistoryResult> {
  const limit = Math.min(params.limit || 100, 250);
  const search = params.search?.trim() || null;
  const internalLabel = params.internalLabel?.trim() || null;
  const identifier = params.identifier?.trim() || null;
  const entityType = params.entityType || null;
  const entityId = params.entityId?.trim() || null;

  if (
    (entityType === "unit" || (!entityType && internalLabel)) &&
    (internalLabel || identifier || search)
  ) {
    return (
      (await buildUnitHistoryByLabel(internalLabel || identifier || search!, limit)) ||
      emptyResult()
    );
  }

  if (entityType === "commercial_order" && entityId) {
    return (await buildCommercialOrderHistoryById(entityId, limit)) || emptyResult();
  }

  const source = entityType ? sourceForEntityType(entityType) : null;

  if (
    entityType &&
    entityType !== "unit" &&
    entityType !== "commercial_order" &&
    source &&
    entityId
  ) {
    const subject = await resolveEntitySubjectById(entityType, entityId);
    if (!subject) return emptyResult();

    const candidates = await getOperationMovements({
      source,
      limit: 500,
    });
    const movements = candidates
      .filter((movement) => movement.entityId === entityId)
      .slice(0, limit);

    return {
      subject,
      timeline: movements.map((movement) =>
        toTimelineItem(movement, relatedForMovement(movement, entityType, entityId))
      ),
      summary: {
        totalEvents: movements.length,
        firstEventAt: movements.at(-1)?.occurredAt || null,
        lastEventAt: movements[0]?.occurredAt || null,
        currentStatus: subject.currentStatus,
        activationStatus: subject.activationStatus,
        deliveredPendingActivation: null,
      },
    };
  }

  if (entityType && source && (identifier || search)) {
    const movements = await getOperationMovements({
      source,
      search: search || identifier || null,
      internalLabel: internalLabel || identifier || null,
      limit,
    });

    return {
      subject: {
        entityType,
        entityId: identifier || search || "",
        entityCode: identifier || search || null,
        internalLabel: entityType === "unit" ? internalLabel || identifier || null : null,
        title: identifier || search || entityType,
        subtitle: entityType.replaceAll("_", " "),
        currentStatus: null,
        activationStatus: null,
      },
      timeline: movements.map((movement) =>
        toTimelineItem(
          movement,
          relatedForMovement(movement, entityType, movement.entityId)
        )
      ),
      summary: {
        totalEvents: movements.length,
        firstEventAt: movements.at(-1)?.occurredAt || null,
        lastEventAt: movements[0]?.occurredAt || null,
        currentStatus: null,
        activationStatus: null,
        deliveredPendingActivation: null,
      },
    };
  }

  if (!entityType && search) {
    const suggestions = await searchSuggestions(search, limit);
    return {
      ...emptyResult(),
      suggestions,
    };
  }

  return emptyResult();
}
