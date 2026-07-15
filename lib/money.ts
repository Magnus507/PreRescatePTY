import { Prisma } from "@prisma/client";

export type MoneyInput = Prisma.Decimal | Prisma.DecimalJsLike | number | string | null | undefined;
type DecimalLike = Prisma.Decimal | Prisma.DecimalJsLike;
type DecimalValue = Prisma.Decimal.Value;

function toDecimal(value: MoneyInput): Prisma.Decimal {
  if (value instanceof Prisma.Decimal) {
    return value;
  }

  if (value === null || value === undefined || value === "") {
    return new Prisma.Decimal(0);
  }

  const decimal = new Prisma.Decimal(value as DecimalValue);
  if (!decimal.isFinite()) {
    throw new Error("invalid_money");
  }
  return decimal;
}

export function parseMoney(value: MoneyInput): Prisma.Decimal {
  const decimal = toDecimal(value);
  return decimal.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
}

export function addMoney(...values: MoneyInput[]): Prisma.Decimal {
  return values.reduce<Prisma.Decimal>((sum, value) => sum.add(parseMoney(value)), new Prisma.Decimal(0));
}

export function multiplyMoney(value: MoneyInput, multiplier: number | string | DecimalLike): Prisma.Decimal {
  const parsedMultiplier = new Prisma.Decimal(multiplier as DecimalValue);
  if (!parsedMultiplier.isFinite()) {
    throw new Error("invalid_money");
  }
  return parseMoney(value).mul(parsedMultiplier).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
}

export function moneyEquals(a: MoneyInput, b: MoneyInput): boolean {
  return parseMoney(a).equals(parseMoney(b));
}

export function serializeMoney(value: MoneyInput): string {
  return parseMoney(value).toFixed(2);
}

export function moneyToNumber(value: MoneyInput): number {
  return Number(serializeMoney(value));
}
