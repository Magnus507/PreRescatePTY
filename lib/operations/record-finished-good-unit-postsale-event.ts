import { Prisma } from "@prisma/client";

export async function recordFinishedGoodUnitPostSaleEvent(params: {
  tx: Prisma.TransactionClient;
  unitId: string;
  eventType: "WARRANTY_OPENED" | "REPLACEMENT_REQUESTED" | "RETURN_REQUESTED";
  referenceType: string;
  referenceId: string;
  reason?: string | null;
  metadataJson?: Record<string, unknown> | null;
}) {
  await params.tx.operationFinishedGoodUnit.update({
    where: { id: params.unitId },
    data: {
      events: {
        create: {
          eventType: params.eventType,
          referenceType: params.referenceType,
          referenceId: params.referenceId,
          reason: params.reason || null,
          metadataJson: (params.metadataJson || {}) as Prisma.InputJsonValue,
        },
      },
    },
  });
}
