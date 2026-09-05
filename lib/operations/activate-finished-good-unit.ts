import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type ActivateFinishedGoodUnitParams = {
  internalLabel?: string | null;
  shortCode?: string | null;
  activationReferenceType: string;
  activationReferenceId: string;
  activatedAt?: Date;
  metadataJson?: Record<string, unknown> | null;
};

type ActivateFinishedGoodUnitResult =
  | { ok: true; unitId: string; createdEvent: boolean }
  | { ok: false; reason: "UNIT_NOT_FOUND" | "UNIT_NOT_ELIGIBLE" };

type FinishedGoodUnitActivationClient = Pick<
  Prisma.TransactionClient,
  "operationFinishedGoodUnit" | "operationFinishedGoodUnitEvent"
>;

async function findUnitByActivationKey(
  client: FinishedGoodUnitActivationClient,
  params: Pick<ActivateFinishedGoodUnitParams, "internalLabel" | "shortCode">
) {
  const internalLabel = params.internalLabel?.trim() || null;
  const shortCode = params.shortCode?.trim() || null;

  if (internalLabel) {
    const byLabel = await client.operationFinishedGoodUnit.findUnique({
      where: { internalLabel },
      select: {
        id: true,
        status: true,
        qaStatus: true,
        activationStatus: true,
        activationReferenceType: true,
        activationReferenceId: true,
      },
    });
    if (byLabel) return byLabel;
  }

  if (shortCode) {
    const byShortCode = await client.operationFinishedGoodUnit.findFirst({
      where: {
        digitalBatchItem: { shortCode },
      },
      select: {
        id: true,
        status: true,
        qaStatus: true,
        activationStatus: true,
        activationReferenceType: true,
        activationReferenceId: true,
      },
    });
    if (byShortCode) return byShortCode;
  }

  return null;
}

export async function markFinishedGoodUnitActivatedWithClient(
  client: FinishedGoodUnitActivationClient,
  params: ActivateFinishedGoodUnitParams
): Promise<ActivateFinishedGoodUnitResult> {
  const unit = await findUnitByActivationKey(client, params);
  if (!unit) {
    return { ok: false, reason: "UNIT_NOT_FOUND" };
  }

  if (unit.activationStatus === "activated") {
    const matchesReference =
      unit.activationReferenceType === params.activationReferenceType &&
      unit.activationReferenceId === params.activationReferenceId;
    if (matchesReference) {
      return { ok: true, unitId: unit.id, createdEvent: false };
    }
  }

  if (unit.activationStatus === "activated" || !["dispatched", "delivered"].includes(unit.status)) {
    return { ok: false, reason: "UNIT_NOT_ELIGIBLE" };
  }

  if (["qa_pending", "qa_failed"].includes(unit.status)) {
    return { ok: false, reason: "UNIT_NOT_ELIGIBLE" };
  }

  const activatedAt = params.activatedAt ?? new Date();

  const claimed = await client.operationFinishedGoodUnit.updateMany({
    where: {
      id: unit.id,
      activationStatus: unit.activationStatus,
      status: unit.status,
    },
    data: {
      activationStatus: "activated",
      activatedAt,
      status: "activated",
      activationReferenceType: params.activationReferenceType,
      activationReferenceId: params.activationReferenceId,
    },
  });

  if (claimed.count !== 1) {
    const current = await client.operationFinishedGoodUnit.findUnique({
      where: { id: unit.id },
      select: {
        activationStatus: true,
        activationReferenceType: true,
        activationReferenceId: true,
      },
    });
    if (
      current?.activationStatus === "activated" &&
      current.activationReferenceType === params.activationReferenceType &&
      current.activationReferenceId === params.activationReferenceId
    ) {
      return { ok: true, unitId: unit.id, createdEvent: false };
    }
    return { ok: false, reason: "UNIT_NOT_ELIGIBLE" };
  }

  await client.operationFinishedGoodUnitEvent.create({
    data: {
      unitId: unit.id,
      eventType: "ACTIVATED",
      referenceType: params.activationReferenceType,
      referenceId: params.activationReferenceId,
      metadataJson: {
        ...(params.metadataJson || {}),
        activatedAt: activatedAt.toISOString(),
        previousStatus: unit.status,
        previousActivationStatus: unit.activationStatus,
      },
    },
  });

  return { ok: true, unitId: unit.id, createdEvent: true };
}

export async function markFinishedGoodUnitActivated(
  params: ActivateFinishedGoodUnitParams
): Promise<ActivateFinishedGoodUnitResult> {
  return prisma.$transaction((tx) => markFinishedGoodUnitActivatedWithClient(tx, params));
}
