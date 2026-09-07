import { BUSINESS_RULES } from "@/domains/shared/constants";

export function addServiceMonthsClamped(date: Date, months: number): Date {
  if (!Number.isInteger(months) || months <= 0) {
    throw new Error("SERVICE_MONTHS_MUST_BE_POSITIVE_INTEGER");
  }

  const result = new Date(date.getTime());
  const originalDay = result.getUTCDate();
  result.setUTCDate(1);
  result.setUTCMonth(result.getUTCMonth() + months);
  const lastDayOfTargetMonth = new Date(Date.UTC(
    result.getUTCFullYear(),
    result.getUTCMonth() + 1,
    0
  )).getUTCDate();
  result.setUTCDate(Math.min(originalDay, lastDayOfTargetMonth));
  return result;
}

export function initialServiceEndDate(
  activatedAt: Date,
  months = BUSINESS_RULES.DEFAULT_SERVICE_DURATION_MONTHS
): Date {
  return addServiceMonthsClamped(activatedAt, months);
}

/**
 * Extends the same commercial service without penalizing an early renewal.
 * Expired service renews from `now`; active service renews from its current end.
 */
export function renewedServiceEndDate(
  currentServiceEndDate: Date | null,
  now: Date,
  months = BUSINESS_RULES.DEFAULT_SERVICE_DURATION_MONTHS
): Date {
  const base = currentServiceEndDate && currentServiceEndDate.getTime() > now.getTime()
    ? currentServiceEndDate
    : now;
  return addServiceMonthsClamped(base, months);
}
