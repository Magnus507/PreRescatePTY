import { createHash, randomBytes } from "node:crypto";
import { Prisma } from "@prisma/client";
import { generateSecret, verifySync } from "otplib";

export const MFA_RECOVERY_CODE_COUNT = 8;
const TOTP_PATTERN = /^\d{6}$/;
const RECOVERY_PATTERN = /^[A-F0-9]{20}$/;
const RECOVERY_KEY_PREFIX = "security:mfa:recovery:";

type MfaDb = Pick<Prisma.TransactionClient, "systemConfig">;

type StoredRecoveryCodes = {
  version: 1;
  codes: Array<{ hash: string; usedAt: string | null }>;
};

function recoveryKey(userId: string): string {
  return `${RECOVERY_KEY_PREFIX}${userId}`;
}

function parseStoredRecoveryCodes(value: string): StoredRecoveryCodes | null {
  try {
    const parsed = JSON.parse(value) as StoredRecoveryCodes;
    if (parsed?.version !== 1 || !Array.isArray(parsed.codes)) return null;
    if (!parsed.codes.every((entry) => typeof entry?.hash === "string" && (entry.usedAt === null || typeof entry.usedAt === "string"))) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

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
  const codes = new Set<string>();
  while (codes.size < count) {
    const raw = randomBytes(10).toString("hex").toUpperCase();
    codes.add(raw.match(/.{1,4}/g)?.join("-") || raw);
  }
  return [...codes];
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
  const value: StoredRecoveryCodes = {
    version: 1,
    codes: codes.map((code) => ({ hash: hashMfaRecoveryCode(code), usedAt: null })),
  };
  await tx.systemConfig.upsert({
    where: { key: recoveryKey(userId) },
    create: { key: recoveryKey(userId), value: JSON.stringify(value) },
    update: { value: JSON.stringify(value) },
  });
}

export async function consumeMfaRecoveryCode(
  tx: MfaDb,
  userId: string,
  code: string
): Promise<boolean> {
  if (!isRecoveryCode(code)) return false;
  const key = recoveryKey(userId);

  // A harmless timestamp write locks this user's recovery row. Concurrent
  // attempts then re-read the committed state before deciding whether a code
  // is still unused.
  const locked = await tx.systemConfig.updateMany({
    where: { key },
    data: { updatedAt: new Date() },
  });
  if (locked.count !== 1) return false;

  const row = await tx.systemConfig.findUnique({ where: { key } });
  if (!row) return false;
  const stored = parseStoredRecoveryCodes(row.value);
  if (!stored) return false;

  const hash = hashMfaRecoveryCode(code);
  const match = stored.codes.find((entry) => entry.hash === hash && entry.usedAt === null);
  if (!match) return false;

  match.usedAt = new Date().toISOString();
  await tx.systemConfig.update({
    where: { key },
    data: { value: JSON.stringify(stored) },
  });
  return true;
}

export async function deleteMfaRecoveryCodes(tx: MfaDb, userId: string): Promise<void> {
  await tx.systemConfig.deleteMany({ where: { key: recoveryKey(userId) } });
}

export async function countRemainingMfaRecoveryCodes(tx: MfaDb, userId: string): Promise<number> {
  const row = await tx.systemConfig.findUnique({ where: { key: recoveryKey(userId) } });
  if (!row) return 0;
  const stored = parseStoredRecoveryCodes(row.value);
  if (!stored) return 0;
  return stored.codes.filter((entry) => entry.usedAt === null).length;
}
