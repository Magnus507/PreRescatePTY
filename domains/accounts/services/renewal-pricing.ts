import { Prisma } from "@prisma/client";

const DEFAULT_RENEWAL_PRICE_USD = "5.00";

export function getAnnualRenewalPrice() {
  const configured = process.env.ANNUAL_RENEWAL_PRICE_USD?.trim() || DEFAULT_RENEWAL_PRICE_USD;
  if (!/^\d{1,6}(?:\.\d{1,2})?$/.test(configured)) {
    return new Prisma.Decimal(DEFAULT_RENEWAL_PRICE_USD);
  }
  const value = new Prisma.Decimal(configured);
  if (value.lte(0)) return new Prisma.Decimal(DEFAULT_RENEWAL_PRICE_USD);
  return value.toDecimalPlaces(2);
}

export function getAnnualRenewalPriceNumber() {
  return getAnnualRenewalPrice().toNumber();
}
