import { prisma } from "@/lib/prisma";

export type OperationMovementSource =
  | "material"
  | "digital_batch"
  | "print_order"
  | "production"
  | "qa"
  | "packing"
  | "finished_good"
  | "finished_good_unit"
  | "commercial_order"
  | "dispatch"
  | "warranty"
  | "replacement"
  | "return"
  | "activation";

export type OperationMovementSeverity = "info" | "success" | "warning" | "danger";

export interface OperationMovement {
  id: string;
  source: OperationMovementSource;
  sourceEventId: string;
  eventType: string;
  label: string;
  description: string | null;
  occurredAt: string;
  entityType: string;
  entityId: string;
  entityCode: string | null;
  internalLabel: string | null;
  productCode: string | null;
  productName: string | null;
  commercialOrderId: string | null;
  dispatchId: string | null;
  referenceType: string | null;
  referenceId: string | null;
  severity: OperationMovementSeverity;
  metadataSafe: Record<string, unknown>;
}

type Filters = {
  source?: string | null;
  eventType?: string | null;
  search?: string | null;
  internalLabel?: string | null;
  productCode?: string | null;
  commercialOrderId?: string | null;
  dispatchId?: string | null;
  limit?: number;
};

function safeMetadata(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const copy = { ...(value as Record<string, unknown>) };
  delete copy.customerName;
  delete copy.customerEmail;
  delete copy.customerPhone;
  delete copy.address;
  delete copy.contactPhone;
  delete copy.contactName;
  delete copy.emergencyContacts;
  delete copy.medical;
  delete copy.notes;
  delete copy.userName;
  return copy;
}

function severityFromEvent(eventType: string): OperationMovementSeverity {
  const danger = ["FAILED", "REJECTED", "CANCELLED", "DISCARDED", "EXPIRED"];
  const warning = ["RESERVED", "RELEASED", "SUSPENDED", "RETURNED_TO_INVENTORY", "DELIVERED", "RETURN_REQUESTED", "REPLACEMENT_REQUESTED"];
  const success = ["CREATED", "OPENED", "PASSED", "APPROVED", "RECEIVED", "ASSEMBLED", "PACKED", "DISPATCHED", "ACTIVATED", "QA_PASSED"];
  if (danger.some((key) => eventType.includes(key))) return "danger";
  if (warning.some((key) => eventType.includes(key))) return "warning";
  if (success.some((key) => eventType.includes(key))) return "success";
  return "info";
}

export function normalizeMovementLabel(source: OperationMovementSource, eventType: string) {
  const labels: Record<string, string> = {
    MATERIAL_CREATED: "Material creado",
    RECEIPT: "Ingreso registrado",
    RESERVATION: "Reserva registrada",
    RELEASE: "Liberación registrada",
    ISSUE: "Salida registrada",
    ADJUSTMENT: "Ajuste registrado",
    RETURN: "Retorno registrado",
    CREATED: "Movimiento creado",
    GENERATED: "Lote generado",
    SENT_TO_PRINT: "Enviado a imprenta",
    PRINTED: "Recibido de imprenta",
    ASSEMBLED: "Unidad ensamblada",
    QA_PASSED: "QA aprobado",
    QA_FAILED: "QA fallido",
    RELEASED: "Liberada",
    RESERVED: "Reservada",
    DISPATCHED: "Despachada",
    DELIVERED: "Entregada",
    ACTIVATED: "Activada",
    OPENED: "Garantía abierta",
    WARRANTY_OPENED: "Garantía abierta",
    REPLACEMENT_REQUESTED: "Reemplazo solicitado",
    RETURN_REQUESTED: "Devolución solicitada",
    APPROVED: "Aprobado",
    REJECTED: "Rechazado",
    COMPLETED: "Completado",
    CANCELLED: "Cancelado",
  };

  return labels[eventType] || `${source}: ${eventType}`;
}

function normalizeCommon(params: {
  id: string;
  source: OperationMovementSource;
  sourceEventId: string;
  eventType: string;
  occurredAt: Date;
  entityType: string;
  entityId: string;
  entityCode?: string | null;
  internalLabel?: string | null;
  productCode?: string | null;
  productName?: string | null;
  commercialOrderId?: string | null;
  dispatchId?: string | null;
  referenceType?: string | null;
  referenceId?: string | null;
  metadataJson?: unknown;
  description?: string | null;
}): OperationMovement {
  return {
    id: params.id,
    source: params.source,
    sourceEventId: params.sourceEventId,
    eventType: params.eventType,
    label: normalizeMovementLabel(params.source, params.eventType),
    description: params.description || null,
    occurredAt: params.occurredAt.toISOString(),
    entityType: params.entityType,
    entityId: params.entityId,
    entityCode: params.entityCode || null,
    internalLabel: params.internalLabel || null,
    productCode: params.productCode || null,
    productName: params.productName || null,
    commercialOrderId: params.commercialOrderId || null,
    dispatchId: params.dispatchId || null,
    referenceType: params.referenceType || null,
    referenceId: params.referenceId || null,
    severity: severityFromEvent(params.eventType),
    metadataSafe: safeMetadata(params.metadataJson),
  };
}

export async function getOperationMovements(filters: Filters = {}): Promise<OperationMovement[]> {
  const limit = Math.min(filters.limit || 250, 500);
  const sourceFilter = filters.source || null;
  const eventTypeFilter = filters.eventType || null;
  const searchFilter = filters.search?.trim().toLowerCase() || null;
  const internalLabelFilter = filters.internalLabel?.trim() || null;
  const productCodeFilter = filters.productCode?.trim() || null;
  const commercialOrderIdFilter = filters.commercialOrderId || null;
  const dispatchIdFilter = filters.dispatchId || null;

  const queries: Promise<OperationMovement[]>[] = [];

  queries.push(
    prisma.operationMaterialEvent.findMany({
      take: limit,
      orderBy: { createdAt: "desc" },
      include: { material: true },
    }).then((rows) =>
      rows.map((row) =>
        normalizeCommon({
          id: `material:${row.id}`,
          source: "material",
          sourceEventId: row.id,
          eventType: row.eventType,
          occurredAt: row.createdAt,
          entityType: "OperationMaterial",
          entityId: row.materialId,
          entityCode: row.material.code,
          productCode: row.material.code,
          productName: row.material.name,
          referenceType: row.referenceType,
          referenceId: row.referenceId,
          metadataJson: row.metadataJson,
          description: row.reason,
        })
      )
    )
  );

  queries.push(
    prisma.operationProductionEvent.findMany({
      take: limit,
      orderBy: { createdAt: "desc" },
      include: { productionOrder: true },
    }).then((rows) =>
      rows.map((row) =>
        normalizeCommon({
          id: `production:${row.id}`,
          source: "production",
          sourceEventId: row.id,
          eventType: row.eventType,
          occurredAt: row.createdAt,
          entityType: "OperationProductionOrder",
          entityId: row.productionOrderId,
          entityCode: row.productionOrder.code,
          referenceType: null,
          referenceId: null,
          metadataJson: row.metadataJson,
          description: row.reason,
        })
      )
    )
  );

  queries.push(
    prisma.operationDigitalBatch.findMany({
      take: limit,
      orderBy: { createdAt: "desc" },
    }).then((rows) =>
      rows.map((row) =>
        normalizeCommon({
          id: `digital-batch:${row.id}`,
          source: "digital_batch",
          sourceEventId: row.id,
          eventType: row.status === "active" ? "GENERATED" : `STATUS_${row.status.toUpperCase()}`,
          occurredAt: row.createdAt,
          entityType: "OperationDigitalBatch",
          entityId: row.id,
          entityCode: row.code,
          productCode: row.finishedGoodCode || null,
          referenceType: null,
          referenceId: null,
          metadataJson: {
            productType: row.productType,
            prefix: row.prefix,
            startNumber: row.startNumber,
            endNumber: row.endNumber,
            quantity: row.quantity,
            status: row.status,
            notes: row.notes,
          },
          description: row.name || null,
        })
      )
    )
  );

  queries.push(
    prisma.operationPrintOrder.findMany({
      take: limit,
      orderBy: { createdAt: "desc" },
    }).then((rows) =>
      rows.flatMap((row) => {
        const sentMovement = normalizeCommon({
          id: `print-order:sent:${row.id}`,
          source: "print_order",
          sourceEventId: row.id,
          eventType: row.sentAt ? "SENT_TO_PRINT" : `STATUS_${row.status.toUpperCase()}`,
          occurredAt: row.sentAt || row.createdAt,
          entityType: "OperationPrintOrder",
          entityId: row.id,
          entityCode: row.code,
          productCode: row.finishedGoodCode || null,
          referenceType: null,
          referenceId: null,
          metadataJson: {
            supplierName: row.supplierName,
            supplierReference: row.supplierReference,
            productType: row.productType,
            quantity: row.quantity,
            status: row.status,
            includesSticker: row.includesSticker,
            includesActivationCard: row.includesActivationCard,
            includesPresentation: row.includesPresentation,
            includesPackaging: row.includesPackaging,
          },
          description: row.notes,
        });

        if (!row.receivedAt) return [sentMovement];

        return [
          sentMovement,
          normalizeCommon({
            id: `print-order:received:${row.id}`,
            source: "print_order",
            sourceEventId: row.id,
            eventType: "RECEIVED",
            occurredAt: row.receivedAt,
            entityType: "OperationPrintOrder",
            entityId: row.id,
            entityCode: row.code,
            productCode: row.finishedGoodCode || null,
            referenceType: null,
            referenceId: null,
            metadataJson: {
              supplierName: row.supplierName,
              supplierReference: row.supplierReference,
              productType: row.productType,
              quantity: row.quantity,
              status: row.status,
            },
            description: row.notes,
          }),
        ];
      })
    )
  );

  queries.push(
    prisma.operationQcInspectionEvent.findMany({
      take: limit,
      orderBy: { createdAt: "desc" },
      include: { qcInspection: { include: { productionOrder: true } } },
    }).then((rows) =>
      rows.map((row) =>
        normalizeCommon({
          id: `qa:${row.id}`,
          source: "qa",
          sourceEventId: row.id,
          eventType: row.eventType,
          occurredAt: row.createdAt,
          entityType: "OperationQcInspection",
          entityId: row.qcInspectionId,
          entityCode: row.qcInspection.code,
          referenceType: null,
          referenceId: null,
          metadataJson: row.metadataJson,
          description: row.reason,
        })
      )
    )
  );

  queries.push(
    prisma.operationPackingEvent.findMany({
      take: limit,
      orderBy: { createdAt: "desc" },
      include: { packingBatch: true },
    }).then((rows) =>
      rows.map((row) =>
        normalizeCommon({
          id: `packing:${row.id}`,
          source: "packing",
          sourceEventId: row.id,
          eventType: row.eventType,
          occurredAt: row.createdAt,
          entityType: "OperationPackingBatch",
          entityId: row.packingBatchId,
          entityCode: row.packingBatch.code,
          referenceType: null,
          referenceId: null,
          metadataJson: row.metadataJson,
          description: row.reason,
        })
      )
    )
  );

  queries.push(
    prisma.operationFinishedGoodEvent.findMany({
      take: limit,
      orderBy: { createdAt: "desc" },
      include: { finishedGood: true },
    }).then((rows) =>
      rows.map((row) =>
        normalizeCommon({
          id: `finished-good:${row.id}`,
          source: "finished_good",
          sourceEventId: row.id,
          eventType: row.eventType,
          occurredAt: row.createdAt,
          entityType: "OperationFinishedGood",
          entityId: row.finishedGoodId,
          entityCode: row.finishedGood.code,
          productCode: row.finishedGood.code,
          productName: row.finishedGood.name,
          referenceType: row.referenceType,
          referenceId: row.referenceId,
          metadataJson: row.metadataJson,
          description: row.reason,
        })
      )
    )
  );

  queries.push(
    prisma.operationFinishedGoodUnitEvent.findMany({
      take: limit,
      orderBy: { createdAt: "desc" },
      include: { unit: true },
    }).then((rows) =>
      rows.map((row) =>
        normalizeCommon({
          id: `unit:${row.id}`,
          source: "finished_good_unit",
          sourceEventId: row.id,
          eventType: row.eventType,
          occurredAt: row.createdAt,
          entityType: "OperationFinishedGoodUnit",
          entityId: row.unitId,
          entityCode: row.unit.internalLabel,
          internalLabel: row.unit.internalLabel,
          productCode: row.unit.productCode,
          productName: row.unit.productName,
          commercialOrderId: row.unit.reservedOrderId || null,
          referenceType: row.referenceType,
          referenceId: row.referenceId,
          metadataJson: row.metadataJson,
          description: row.reason,
        })
      )
    )
  );

  queries.push(
    prisma.operationCommercialOrderEvent.findMany({
      take: limit,
      orderBy: { createdAt: "desc" },
      include: { commercialOrder: true },
    }).then((rows) =>
      rows.map((row) =>
        normalizeCommon({
          id: `commercial:${row.id}`,
          source: "commercial_order",
          sourceEventId: row.id,
          eventType: row.eventType,
          occurredAt: row.createdAt,
          entityType: "OperationCommercialOrder",
          entityId: row.commercialOrderId,
          entityCode: row.commercialOrder.code,
          commercialOrderId: row.commercialOrderId,
          referenceType: row.referenceType,
          referenceId: row.referenceId,
          metadataJson: row.metadataJson,
          description: row.reason,
        })
      )
    )
  );

  queries.push(
    prisma.operationDispatchEvent.findMany({
      take: limit,
      orderBy: { createdAt: "desc" },
      include: { dispatch: true },
    }).then((rows) =>
      rows.map((row) =>
        normalizeCommon({
          id: `dispatch:${row.id}`,
          source: "dispatch",
          sourceEventId: row.id,
          eventType: row.eventType,
          occurredAt: row.createdAt,
          entityType: "OperationDispatch",
          entityId: row.dispatchId,
          entityCode: row.dispatch.code,
          dispatchId: row.dispatchId,
          referenceType: row.referenceType,
          referenceId: row.referenceId,
          metadataJson: row.metadataJson,
          description: row.reason,
        })
      )
    )
  );

  queries.push(
    prisma.operationWarrantyEvent.findMany({
      take: limit,
      orderBy: { createdAt: "desc" },
      include: { warranty: { include: { unit: true, commercialOrder: true, dispatch: true } } },
    }).then((rows) =>
      rows.map((row) =>
        normalizeCommon({
          id: `warranty:${row.id}`,
          source: "warranty",
          sourceEventId: row.id,
          eventType: row.eventType,
          occurredAt: row.createdAt,
          entityType: "OperationWarranty",
          entityId: row.warrantyId,
          entityCode: row.warranty.code,
          internalLabel: row.warranty.internalLabel || row.warranty.unit?.internalLabel || null,
          productCode: row.warranty.productCode || row.warranty.unit?.productCode || null,
          productName: row.warranty.productName || row.warranty.unit?.productName || null,
          commercialOrderId: row.warranty.commercialOrderId || null,
          dispatchId: row.warranty.dispatchId || null,
          referenceType: row.referenceType,
          referenceId: row.referenceId,
          metadataJson: row.metadataJson,
          description: row.reason,
        })
      )
    )
  );

  queries.push(
    prisma.operationReplacementEvent.findMany({
      take: limit,
      orderBy: { createdAt: "desc" },
      include: { replacement: { include: { originalUnit: true, replacementUnit: true } } },
    }).then((rows) =>
      rows.map((row) =>
        normalizeCommon({
          id: `replacement:${row.id}`,
          source: "replacement",
          sourceEventId: row.id,
          eventType: row.eventType,
          occurredAt: row.createdAt,
          entityType: "OperationReplacement",
          entityId: row.replacementId,
          entityCode: row.replacement.code,
          internalLabel: row.replacement.originalInternalLabel || row.replacement.originalUnit?.internalLabel || row.replacement.replacementInternalLabel || row.replacement.replacementUnit?.internalLabel || null,
          productCode: row.replacement.originalUnit?.productCode || row.replacement.replacementUnit?.productCode || null,
          productName: row.replacement.originalUnit?.productName || row.replacement.replacementUnit?.productName || null,
          commercialOrderId: row.replacement.commercialOrderId || null,
          dispatchId: row.replacement.originalDispatchId || row.replacement.replacementDispatchId || null,
          referenceType: row.referenceType,
          referenceId: row.referenceId,
          metadataJson: row.metadataJson,
          description: row.reason,
        })
      )
    )
  );

  queries.push(
    prisma.operationReturnEvent.findMany({
      take: limit,
      orderBy: { createdAt: "desc" },
      include: { return: { include: { unit: true } } },
    }).then((rows) =>
      rows.map((row) =>
        normalizeCommon({
          id: `return:${row.id}`,
          source: "return",
          sourceEventId: row.id,
          eventType: row.eventType,
          occurredAt: row.createdAt,
          entityType: "OperationReturn",
          entityId: row.returnId,
          entityCode: row.return.code,
          internalLabel: row.return.internalLabel || row.return.unit?.internalLabel || null,
          productCode: row.return.productCode || row.return.unit?.productCode || null,
          productName: row.return.productName || row.return.unit?.productName || null,
          commercialOrderId: row.return.commercialOrderId || null,
          dispatchId: row.return.originalDispatchId || null,
          referenceType: row.referenceType,
          referenceId: row.referenceId,
          metadataJson: row.metadataJson,
          description: row.reason,
        })
      )
    )
  );

  const results = await Promise.all(queries);
  const all = results.flat();

  const filtered = all.filter((movement) => {
    if (sourceFilter && movement.source !== sourceFilter) return false;
    if (eventTypeFilter && movement.eventType !== eventTypeFilter) return false;
    if (
      searchFilter &&
      ![
        movement.label,
        movement.description || "",
        movement.entityCode || "",
        movement.internalLabel || "",
        movement.productCode || "",
        movement.productName || "",
        movement.commercialOrderId || "",
        movement.dispatchId || "",
        movement.referenceId || "",
        movement.eventType,
      ].some((value) => value.toLowerCase().includes(searchFilter))
    ) {
      return false;
    }
    if (internalLabelFilter && !(movement.internalLabel || "").toLowerCase().includes(internalLabelFilter.toLowerCase())) return false;
    if (productCodeFilter && !(movement.productCode || "").toLowerCase().includes(productCodeFilter.toLowerCase())) return false;
    if (commercialOrderIdFilter && movement.commercialOrderId !== commercialOrderIdFilter) return false;
    if (dispatchIdFilter && movement.dispatchId !== dispatchIdFilter) return false;
    return true;
  });

  return filtered.sort((a, b) => b.occurredAt.localeCompare(a.occurredAt)).slice(0, limit);
}
