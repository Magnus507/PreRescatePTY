import crypto from "crypto";
import { prisma } from "@/lib/prisma";

const SHORT_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const SHORT_CODE_LENGTH = 8;
const MAX_ATTEMPTS = 20;

function generateCandidateShortCode() {
  const bytes = crypto.randomBytes(SHORT_CODE_LENGTH);
  let code = "";

  for (let index = 0; index < SHORT_CODE_LENGTH; index += 1) {
    code += SHORT_CODE_ALPHABET[bytes[index] % SHORT_CODE_ALPHABET.length];
  }

  return code;
}

async function shortCodeExists(shortCode: string) {
  const [digitalItem, chip, corporateProfile] = await Promise.all([
    prisma.operationDigitalBatchItem.findUnique({
      where: { shortCode },
      select: { id: true },
    }),
    prisma.chip.findUnique({
      where: { shortCode },
      select: { id: true },
    }),
    prisma.corporatePublicProfile.findUnique({
      where: { shortCode },
      select: { id: true },
    }),
  ]);

  return Boolean(digitalItem || chip || corporateProfile);
}

export async function generateUniqueDigitalShortCode() {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    const candidate = generateCandidateShortCode();
    const exists = await shortCodeExists(candidate);
    if (!exists) return candidate;
  }

  throw new Error(`No se pudo generar un shortCode digital unico despues de ${MAX_ATTEMPTS} intentos`);
}
