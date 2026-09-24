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
