import { createHash, randomBytes, randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { generateSecret, verifySync } from "otplib";

export const MFA_RECOVERY_CODE_COUNT = 8;
const TOTP_PATTERN = /^\d{6}$/;
const RECOVERY_PATTERN = /^[A-F0-9]{20}$/;

type MfaDb = Pick<Prisma.TransactionClient, "$executeRaw">;

function normalizeTotpToken(token: string): string {
  return token.replace(/\s/g, "");
}

export function normalizeRecoveryCode(code: string): string {
  return code.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
}

export function isTotpToken(token: string): boolean {
  return TOTP_PATTERN.test(normalizeTotpToken(token));
}

export function isRecoveryCode(token: string): boolean {
  return RECOVERY_PATTERN.test(normalizeRecoveryCode(token));
}

export function verifyMfaToken(token: string, secret: string): boolean {
  if (!token || !secret) return false;
  const normalized = normalizeTotpToken(token);
  if (!TOTP_PATTERN.test(normalized)) return false;
  return verifySync({ token: normalized, secret }).valid;
}

export function generateMfaSecret(): string {
  return generateSecret();
}

export function buildMfaProvisioningUri(email: string, secret: string): string {
  const issuer = "PreRescatePTY";
  const label = `${issuer}:${email.toLowerCase()}`;
  return `otpauth://totp/${encodeURIComponent(label)}?secret=${encodeURIComponent(secret)}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
}

export function generateMfaRecoveryCodes(count = MFA_RECOVERY_CODE_COUNT): string[] {
  return Array.from({ length: count }, () => {
    const raw = randomBytes(10).toString("hex").toUpperCase();
    return raw.match(/.{1,4}/g)?.join("-") || raw;
  });
}

export function hashMfaRecoveryCode(code: string): string {
  const normalized = normalizeRecoveryCode(code);
  return createHash("sha256").update(normalized, "utf8").digest("hex");
}

export async function replaceMfaRecoveryCodes(
  tx: MfaDb,
  userId: string,
  codes: string[]
): Promise<void> {
  await tx.$executeRaw`DELETE FROM "MfaRecoveryCode" WHERE "userId" = ${userId}`;
  for (const code of codes) {
    const id = randomUUID();
    const codeHash = hashMfaRecoveryCode(code);
    await tx.$executeRaw`
      INSERT INTO "MfaRecoveryCode" ("id", "userId", "codeHash", "createdAt")
      VALUES (${id}, ${userId}, ${codeHash}, NOW())
    `;
  }
}

export async function consumeMfaRecoveryCode(
  tx: MfaDb,
  userId: string,
  code: string
): Promise<boolean> {
  if (!isRecoveryCode(code)) return false;
  const codeHash = hashMfaRecoveryCode(code);
  const consumed = await tx.$executeRaw`
    UPDATE "MfaRecoveryCode"
    SET "usedAt" = NOW()
    WHERE "userId" = ${userId}
      AND "codeHash" = ${codeHash}
      AND "usedAt" IS NULL
  `;
  return Number(consumed) === 1;
}

export async function deleteMfaRecoveryCodes(tx: MfaDb, userId: string): Promise<void> {
  await tx.$executeRaw`DELETE FROM "MfaRecoveryCode" WHERE "userId" = ${userId}`;
}
