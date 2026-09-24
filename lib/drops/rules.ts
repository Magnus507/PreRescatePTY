import { randomBytes } from "node:crypto";

export const DROP_PASS_SPEND_USD = 25;
export const MAX_DROP_PASSES_PER_ORDER = 1000;

export function calculateEarnedDropPasses(amount: unknown): number {
  const numeric = typeof amount === "number" ? amount : Number(String(amount ?? ""));
  if (!Number.isFinite(numeric) || numeric <= 0) return 0;
  return Math.min(
    MAX_DROP_PASSES_PER_ORDER,
    Math.floor((numeric + Number.EPSILON) / DROP_PASS_SPEND_USD)
  );
}

export function pickWinnerIndex(randomHex: string, entryCount: number): number {
  if (!Number.isInteger(entryCount) || entryCount <= 0) {
    throw new Error("DROP_DRAW_REQUIRES_ENTRIES");
  }
  if (!/^[0-9a-f]+$/i.test(randomHex)) {
    throw new Error("DROP_DRAW_RANDOM_INVALID");
  }
  return Number(BigInt(`0x${randomHex}`) % BigInt(entryCount));
}

const READABLE_CODE_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
export const BONUS_CREDIT_PATTERN =
  /^BC-[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4}$/;

export function normalizeBonusCreditCode(value: string) {
  return value.trim().toUpperCase().replace(/\s+/g, "");
}

export function makeBonusCreditCode() {
  const bytes = randomBytes(12);
  let payload = "";
  for (let index = 0; index < 12; index += 1) {
    payload += READABLE_CODE_ALPHABET[bytes[index] % READABLE_CODE_ALPHABET.length];
  }
  return `BC-${payload.slice(0, 4)}-${payload.slice(4, 8)}-${payload.slice(8, 12)}`;
}


export const DROP_PASS_GRANT_CODE_PATTERN =
  /^DPG-[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4}$/;

export function normalizeDropPassGrantCode(value: string) {
  return value.trim().toUpperCase().replace(/\s+/g, "");
}

export function makeDropPassGrantCode() {
  const bytes = randomBytes(12);
  let payload = "";
  for (let index = 0; index < 12; index += 1) {
    payload +=
      READABLE_CODE_ALPHABET[bytes[index] % READABLE_CODE_ALPHABET.length];
  }
  return `DPG-${payload.slice(0, 4)}-${payload.slice(4, 8)}-${payload.slice(8, 12)}`;
}
