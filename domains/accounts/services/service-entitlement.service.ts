import type { Prisma } from "@prisma/client";

export const ANNUAL_ACCESS_MONTHS = 12;
export const PERSONAL_PROFILE_LIMIT = 10;
export const ANNUAL_PLAN_CODE = "annual_device_access_v1";

export type AccountAccessMode = "PENDING_ACTIVATION" | "FULL" | "ESSENTIAL";

type EntitlementSnapshot = {
  id: string;
  accountId: string;
  status: string;
  startsAt: Date | null;
  endsAt: Date | null;
  graceEndsAt: Date | null;
  source: string;
  version: number;
};

function addCalendarMonthsUtc(value: Date, months: number) {
  const date = new Date(value);
  const day = date.getUTCDate();
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() + months);
  const finalDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
  date.setUTCDate(Math.min(day, finalDay));
  return date;
}

function subtractCalendarMonthsUtc(value: Date, months: number) {
  return addCalendarMonthsUtc(value, -months);
}

export function resolveAccountAccessMode(
  entitlement: Pick<EntitlementSnapshot, "status" | "endsAt" | "graceEndsAt"> | null | undefined,
  now = new Date()
): AccountAccessMode {
  if (!entitlement || entitlement.status === "pending") return "PENDING_ACTIVATION";
  if (entitlement.status === "exempt") return "FULL";

  const effectiveEnd = entitlement.graceEndsAt && entitlement.graceEndsAt > (entitlement.endsAt ?? new Date(0))
    ? entitlement.graceEndsAt
    : entitlement.endsAt;

  if (effectiveEnd && effectiveEnd.getTime() > now.getTime()) return "FULL";
  return "ESSENTIAL";
}

async function lockAccount(tx: Prisma.TransactionClient, accountId: string) {
  const updated = await tx.account.updateMany({
    where: { id: accountId },
    data: { updatedAt: new Date() },
  });
  if (updated.count !== 1) throw new Error("ACCOUNT_NOT_FOUND");
}

async function ensureEntitlement(tx: Prisma.TransactionClient, accountId: string) {
  const existing = await tx.serviceEntitlement.findUnique({ where: { accountId } });
  if (existing) return existing;

  return tx.serviceEntitlement.create({
    data: {
      accountId,
      planCode: ANNUAL_PLAN_CODE,
      status: "pending",
      source: "registration",
    },
  });
}

export async function getPhysicalUnitGrantEligibility(
  tx: Prisma.TransactionClient,
  unitId: string
): Promise<{ eligible: boolean; reason: string; months: number }> {
  const unit = await tx.operationFinishedGoodUnit.findUnique({
    where: { id: unitId },
    select: { id: true, productCode: true, reservedOrderId: true },
  });
  if (!unit) return { eligible: false, reason: "unit_not_found", months: 0 };

  const warrantyReplacement = await tx.operationReplacement.findFirst({
    where: {
      replacementUnitId: unit.id,
      replacementType: "warranty",
      status: { not: "cancelled" },
    },
    select: { id: true },
  });
  if (warrantyReplacement) {
    return { eligible: false, reason: "warranty_replacement", months: 0 };
  }

  const mapping = await tx.productOperationalMapping.findFirst({
    where: { productCode: unit.productCode },
    select: {
      grantsAnnualAccess: true,
      requiresPaidOrderForAnnualAccess: true,
    },
  });

  if (mapping?.grantsAnnualAccess === false) {
    return { eligible: false, reason: "product_configured_no_grant", months: 0 };
  }

  let hasPaidOrder = false;
  if (unit.reservedOrderId) {
    // Checkout-origin reservations are owned by the source Order.id, while
    // native/legacy Operations reservations may be owned by the operational
    // commercial-order id. When the operational projection exists it is
    // authoritative because refund/chargeback state is recorded there; only
    // fall back to the source Order when no operational row exists.
    const operationalOrder = await tx.operationCommercialOrder.findFirst({
      where: {
        OR: [
          { id: unit.reservedOrderId },
          { sourceId: unit.reservedOrderId },
        ],
      },
      select: { paymentStatus: true },
    });

    if (operationalOrder) {
      hasPaidOrder = ["paid", "succeeded"].includes(operationalOrder.paymentStatus);
    } else {
      const sourceOrder = await tx.order.findUnique({
        where: { id: unit.reservedOrderId },
        select: { paymentStatus: true },
      });
      hasPaidOrder = Boolean(
        sourceOrder && ["paid", "succeeded"].includes(sourceOrder.paymentStatus)
      );
    }
  }

  if (hasPaidOrder) {
    return { eligible: true, reason: "paid_physical_unit", months: ANNUAL_ACCESS_MONTHS };
  }

  if (mapping && mapping.grantsAnnualAccess && !mapping.requiresPaidOrderForAnnualAccess) {
    return { eligible: true, reason: "configured_promotional_grant", months: ANNUAL_ACCESS_MONTHS };
  }

  return { eligible: false, reason: "paid_order_required", months: 0 };
}

async function grantMonths(
  tx: Prisma.TransactionClient,
  input: {
    accountId: string;
    months: number;
    type: "activation" | "renewal" | "admin_grant";
    idempotencyKey: string;
    actorUserId?: string | null;
    unitId?: string | null;
    chipId?: string | null;
    paymentId?: string | null;
    reason: string;
    metadataJson?: Prisma.InputJsonValue;
    now?: Date;
  }
) {
  const now = input.now ?? new Date();
  await lockAccount(tx, input.accountId);

  const existingEvent = await tx.entitlementEvent.findUnique({
    where: { idempotencyKey: input.idempotencyKey },
  });
  if (existingEvent) {
    const current = await tx.serviceEntitlement.findUnique({ where: { accountId: input.accountId } });
    return { applied: false, entitlement: current, event: existingEvent };
  }

  const entitlement = await ensureEntitlement(tx, input.accountId);
  if (entitlement.status === "exempt") {
    const event = await tx.entitlementEvent.create({
      data: {
        entitlementId: entitlement.id,
        accountId: input.accountId,
        type: input.type,
        effectiveAt: now,
        deltaMonths: 0,
        previousEnd: entitlement.endsAt,
        newEnd: entitlement.endsAt,
        paymentId: input.paymentId ?? null,
        unitId: input.unitId ?? null,
        chipId: input.chipId ?? null,
        idempotencyKey: input.idempotencyKey,
        actorUserId: input.actorUserId ?? null,
        reason: `${input.reason}; grandfathered account remains exempt`,
        metadataJson: input.metadataJson,
      },
    });
    return { applied: false, entitlement, event };
  }

  const base = entitlement.endsAt && entitlement.endsAt.getTime() > now.getTime()
    ? entitlement.endsAt
    : now;
  const newEnd = addCalendarMonthsUtc(base, input.months);
  const updated = await tx.serviceEntitlement.update({
    where: { id: entitlement.id },
    data: {
      status: "active",
      startsAt: entitlement.startsAt ?? now,
      endsAt: newEnd,
      graceEndsAt: null,
      source: input.type === "renewal" ? "renewal" : "physical_activation",
      version: { increment: 1 },
    },
  });
  const event = await tx.entitlementEvent.create({
    data: {
      entitlementId: entitlement.id,
      accountId: input.accountId,
      type: input.type,
      effectiveAt: now,
      deltaMonths: input.months,
      previousEnd: entitlement.endsAt,
      newEnd,
      paymentId: input.paymentId ?? null,
      unitId: input.unitId ?? null,
      chipId: input.chipId ?? null,
      idempotencyKey: input.idempotencyKey,
      actorUserId: input.actorUserId ?? null,
      reason: input.reason,
      metadataJson: input.metadataJson,
    },
  });

  return { applied: true, entitlement: updated, event };
}

export async function grantForPhysicalUnitActivation(
  tx: Prisma.TransactionClient,
  input: {
    accountId: string;
    unitId: string;
    chipId: string;
    actorUserId: string;
    now?: Date;
  }
) {
  const eligibility = await getPhysicalUnitGrantEligibility(tx, input.unitId);
  if (!eligibility.eligible) {
    return { applied: false, eligibility, entitlement: await ensureEntitlement(tx, input.accountId) };
  }

  const result = await grantMonths(tx, {
    accountId: input.accountId,
    months: eligibility.months,
    type: "activation",
    idempotencyKey: `physical-unit:${input.unitId}:annual-access`,
    actorUserId: input.actorUserId,
    unitId: input.unitId,
    chipId: input.chipId,
    reason: eligibility.reason,
    metadataJson: {
      accessMonths: eligibility.months,
      physicalUnitId: input.unitId,
      chipId: input.chipId,
    },
    now: input.now,
  });
  return { ...result, eligibility };
}

export async function grantForConfirmedRenewalPayment(
  tx: Prisma.TransactionClient,
  input: {
    accountId: string;
    paymentId: string;
    actorUserId?: string | null;
    now?: Date;
  }
) {
  return grantMonths(tx, {
    accountId: input.accountId,
    months: ANNUAL_ACCESS_MONTHS,
    type: "renewal",
    idempotencyKey: `renewal-payment:${input.paymentId}:annual-access`,
    actorUserId: input.actorUserId ?? null,
    paymentId: input.paymentId,
    reason: "confirmed_annual_renewal_payment",
    metadataJson: { accessMonths: ANNUAL_ACCESS_MONTHS },
    now: input.now,
  });
}

export async function reversePhysicalUnitGrant(
  tx: Prisma.TransactionClient,
  input: {
    accountId: string;
    unitId: string;
    reversalType: "refund" | "chargeback";
    actorUserId?: string | null;
    reason: string;
    now?: Date;
  }
) {
  const now = input.now ?? new Date();
  await lockAccount(tx, input.accountId);

  // A physical activation grant can be reversed only once, regardless of
  // whether the financial system reports that reversal as a refund first or
  // later as a chargeback. Using one canonical key prevents subtracting the
  // same 12-month grant twice across different reversal event types.
  const idempotencyKey = `reversal:physical-unit:${input.unitId}:annual-access`;
  const priorReversal = await tx.entitlementEvent.findUnique({ where: { idempotencyKey } });
  if (priorReversal) {
    return { applied: false, event: priorReversal };
  }

  const original = await tx.entitlementEvent.findFirst({
    where: {
      accountId: input.accountId,
      unitId: input.unitId,
      type: "activation",
      deltaMonths: { gt: 0 },
    },
    orderBy: { createdAt: "asc" },
  });
  if (!original) return { applied: false, reason: "no_grant_to_reverse" as const };

  const entitlement = await tx.serviceEntitlement.findUnique({ where: { accountId: input.accountId } });
  if (!entitlement || entitlement.status === "exempt" || !entitlement.endsAt) {
    return { applied: false, reason: "entitlement_not_reversible" as const };
  }

  const proposedEnd = subtractCalendarMonthsUtc(entitlement.endsAt, original.deltaMonths);
  const newEnd = proposedEnd.getTime() > now.getTime() ? proposedEnd : now;
  const updated = await tx.serviceEntitlement.update({
    where: { id: entitlement.id },
    data: {
      endsAt: newEnd,
      graceEndsAt: null,
      status: newEnd.getTime() > now.getTime() ? "active" : "expired",
      source: input.reversalType,
      version: { increment: 1 },
    },
  });
  const event = await tx.entitlementEvent.create({
    data: {
      entitlementId: entitlement.id,
      accountId: input.accountId,
      type: input.reversalType,
      effectiveAt: now,
      deltaMonths: -original.deltaMonths,
      previousEnd: entitlement.endsAt,
      newEnd,
      unitId: input.unitId,
      chipId: original.chipId,
      idempotencyKey,
      actorUserId: input.actorUserId ?? null,
      reason: input.reason,
      metadataJson: {
        reversedEventId: original.id,
        originalDeltaMonths: original.deltaMonths,
      },
    },
  });
  return { applied: true, entitlement: updated, event };
}
