import { prisma } from "./prisma";
import { logger } from "./logger";
import { 
  generateShortCode as genShort, 
  generateActivationCode as genActivation, 
  generateSerialPublic as genSerial 
} from "./constants";

/**
 * PreRescate PTY — Unique Identifier Service
 * Centralizes unique code generation with high-collision resilience.
 */

type GeneratorFn = () => string;
type CheckFn = (code: string) => Promise<boolean>;

/**
 * Generic retry logic for generating a unique identifier
 */
async function generateUnique(
  generator: GeneratorFn,
  checkExists: CheckFn,
  maxAttempts = 10
): Promise<string> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const code = generator();
    const exists = await checkExists(code);
    if (!exists) return code;
    
    logger.warn(`[Identifiers] Collision detected for code. Attempt ${attempt}/${maxAttempts}`);
  }
  
  throw new Error(`Failed to generate a unique identifier after ${maxAttempts} attempts.`);
}

/**
 * Generates a unique short code for a Chip
 */
export async function getUniqueShortCode(): Promise<string> {
  return generateUnique(
    genShort,
    async (code) => {
      const existing = await prisma.chip.findUnique({
        where: { shortCode: code },
        select: { id: true }
      });
      return !!existing;
    }
  );
}

/**
 * Generates a unique serial public for a Chip
 */
export async function getUniqueSerialPublic(): Promise<string> {
  return generateUnique(
    genSerial,
    async (code) => {
      const existing = await prisma.chip.findUnique({
        where: { serialPublic: code },
        select: { id: true }
      });
      return !!existing;
    }
  );
}

/**
 * Generates a unique activation code for a ChipClaimToken
 */
export async function getUniqueActivationCode(): Promise<string> {
  return generateUnique(
    genActivation,
    async (code) => {
      const existing = await prisma.chipClaimToken.findUnique({
        where: { activationCode: code },
        select: { id: true }
      });
      return !!existing;
    }
  );
}

/**
 * Batch utility to get multiple unique identifiers at once
 * Useful for large organization batches to reduce DB roundtrips.
 */
export async function getUniqueBatch(
  count: number,
  generator: GeneratorFn,
  checkBatchExists: (codes: string[]) => Promise<string[]>
): Promise<string[]> {
  const uniqueCodes = new Set<string>();
  let attempts = 0;
  const maxAttempts = count * 2 + 50; // Dynamic buffer

  while (uniqueCodes.size < count && attempts < maxAttempts) {
    const batch: string[] = [];
    const needed = count - uniqueCodes.size;
    
    for (let i = 0; i < needed; i++) {
      batch.push(generator());
    }

    const existing = await checkBatchExists(batch);
    const existingSet = new Set(existing);

    for (const code of batch) {
      if (!existingSet.has(code)) {
        uniqueCodes.add(code);
      }
      if (uniqueCodes.size === count) break;
    }
    attempts += needed;
  }

  if (uniqueCodes.size < count) {
    throw new Error(`Failed to generate ${count} unique identifiers. Only generated ${uniqueCodes.size}.`);
  }

  return Array.from(uniqueCodes);
}

/**
 * Batch version for Short Codes
 */
export async function getBatchUniqueShortCodes(count: number): Promise<string[]> {
  return getUniqueBatch(count, genShort, async (codes) => {
    const existing = await prisma.chip.findMany({
      where: { shortCode: { in: codes } },
      select: { shortCode: true }
    });
    return existing.map(e => e.shortCode);
  });
}

/**
 * Batch version for Serial Publics
 */
export async function getBatchUniqueSerialPublics(count: number): Promise<string[]> {
  return getUniqueBatch(count, genSerial, async (codes) => {
    const existing = await prisma.chip.findMany({
      where: { serialPublic: { in: codes } },
      select: { serialPublic: true }
    });
    return existing.map(e => e.serialPublic);
  });
}

/**
 * Batch version for Activation Codes
 */
export async function getBatchUniqueActivationCodes(count: number): Promise<string[]> {
  return getUniqueBatch(count, genActivation, async (codes) => {
    const existing = await prisma.chipClaimToken.findMany({
      where: { activationCode: { in: codes } },
      select: { activationCode: true }
    });
    return existing.map(e => e.activationCode);
  });
}
