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

async function findUnitByActivationKey(params: Pick<ActivateFinishedGoodUnitParams, "internalLabel" | "shortCode">) {
  const internalLabel = params.internalLabel?.trim() || null;
  const shortCode = params.shortCode?.trim() || null;

  if (internalLabel) {
    const byLabel = await prisma.operationFinishedGoodUnit.findUnique({
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
    const byShortCode = await prisma.operationFinishedGoodUnit.findFirst({
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

export async function markFinishedGoodUnitActivated(
  params: ActivateFinishedGoodUnitParams
): Promise<ActivateFinishedGoodUnitResult> {
  const unit = await findUnitByActivationKey(params);
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

  if (["cancelled", "discarded"].includes(unit.status)) {
    return { ok: false, reason: "UNIT_NOT_ELIGIBLE" };
  }

  if (["qa_pending", "qa_failed"].includes(unit.status)) {
    return { ok: false, reason: "UNIT_NOT_ELIGIBLE" };
  }

  const activatedAt = params.activatedAt ?? new Date();

  await prisma.operationFinishedGoodUnit.update({
    where: { id: unit.id },
    data: {
      activationStatus: "activated",
      activatedAt,
      status: "activated",
      activationReferenceType: params.activationReferenceType,
      activationReferenceId: params.activationReferenceId,
      events: {
        create: {
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
      },
    },
  });

  return { ok: true, unitId: unit.id, createdEvent: true };
}
