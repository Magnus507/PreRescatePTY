import { Prisma } from "@prisma/client";

type ReleaseOrderReservationsInput = {
  orderId: string;
  actorId?: string | null;
  reason?: string | null;
  dryRun?: boolean;
};

export type ReleasedOrderReservationUnit = {
  id: string;
  internalLabel: string;
  previousStatus: string;
  newStatus: string;
};

export type BlockedOrderReservationUnit = {
  id: string;
  internalLabel: string;
  reason: string;
};

export type ReleaseOrderReservationsResult = {
  eligibleCount: number;
  releasedCount: number;
  blockedCount: number;
  releasedUnits: ReleasedOrderReservationUnit[];
  blockedUnits: BlockedOrderReservationUnit[];
};

function hasCommittedMovement(unit: {
  status: string;
  dispatchedAt?: Date | string | null;
  deliveredAt?: Date | string | null;
  activatedAt?: Date | string | null;
  activationStatus: string;
}) {
  return unit.status === "dispatched" ||
    unit.status === "delivered" ||
    Boolean(unit.dispatchedAt) ||
    Boolean(unit.deliveredAt) ||
    Boolean(unit.activatedAt) ||
    unit.activationStatus === "activated";
}

export async function releaseEligibleOrderReservations(
  prisma: {
    operationFinishedGoodUnit: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      findMany: (args: any) => Promise<Array<{
        id: string;
        internalLabel: string;
        status: string;
        reservedOrderId: string | null;
        reservedAt: Date | null;
        dispatchedAt: Date | null;
        deliveredAt: Date | null;
        activatedAt: Date | null;
        activationStatus: string;
      }>>;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      update: (args: any) => Promise<unknown>;
    };
  },
  { orderId, actorId, reason, dryRun = false }: ReleaseOrderReservationsInput
): Promise<ReleaseOrderReservationsResult> {
  const units = await prisma.operationFinishedGoodUnit.findMany({
    where: { reservedOrderId: orderId },
    select: {
      id: true,
      internalLabel: true,
      status: true,
      reservedOrderId: true,
      reservedAt: true,
      dispatchedAt: true,
      deliveredAt: true,
      activatedAt: true,
      activationStatus: true,
    },
    orderBy: [{ createdAt: "asc" }, { internalLabel: "asc" }],
  });

  const releasedUnits: ReleasedOrderReservationUnit[] = [];
  const blockedUnits: BlockedOrderReservationUnit[] = [];

  for (const unit of units) {
    if (hasCommittedMovement(unit)) {
      blockedUnits.push({
        id: unit.id,
        internalLabel: unit.internalLabel,
        reason: "Unidad ya avanzó a despacho/entrega/activación",
      });
      continue;
    }

    if (unit.status !== "reserved") {
      blockedUnits.push({
        id: unit.id,
        internalLabel: unit.internalLabel,
        reason: `Estado actual no liberable: ${unit.status}`,
      });
      continue;
    }

    releasedUnits.push({
      id: unit.id,
      internalLabel: unit.internalLabel,
      previousStatus: unit.status,
      newStatus: "available",
    });
  }

  if (!dryRun && releasedUnits.length > 0) {
    for (const unit of releasedUnits) {
      await prisma.operationFinishedGoodUnit.update({
        // A concurrent dispatch/activation must make this write fail, rather
        // than return a committed physical unit to saleable inventory.
        where: {
          id: unit.id,
          reservedOrderId: orderId,
          status: "reserved",
          dispatchedAt: null,
          deliveredAt: null,
          activatedAt: null,
          activationStatus: { not: "activated" },
        },
        data: {
          status: "available",
          reservedOrderId: null,
          reservedAt: null,
          events: {
            create: {
              eventType: "RELEASED",
              reason: reason || null,
              referenceType: "order",
              referenceId: orderId,
              metadataJson: {
                previousStatus: unit.previousStatus,
                newStatus: unit.newStatus,
                releasedFromOrderId: orderId,
                actorId: actorId || null,
              } as Prisma.InputJsonValue,
            },
          },
        },
      });
    }
  }

  return {
    eligibleCount: releasedUnits.length + blockedUnits.length,
    releasedCount: releasedUnits.length,
    blockedCount: blockedUnits.length,
    releasedUnits,
    blockedUnits,
  };
}
