import { createHash, randomBytes } from "node:crypto";
import { Prisma } from "@prisma/client";
import { generateSecret, verifySync } from "otplib";
import { decrypt, encrypt } from "@/lib/encryption";

export const MFA_RECOVERY_CODE_COUNT = 8;
export const MFA_SETUP_CHALLENGE_TTL_MS = 10 * 60_000;
const TOTP_PATTERN = /^\d{6}$/;
const RECOVERY_PATTERN = /^[A-F0-9]{20}$/;
const RECOVERY_KEY_PREFIX = "security:mfa:recovery:";
const TOTP_REPLAY_KEY_PREFIX = "security:mfa:totp:";
const TOTP_REPLAY_TTL_MS = 90_000;

type MfaDb = Pick<Prisma.TransactionClient, "systemConfig">;

type StoredRecoveryCodes = {
  version: 1;
  codes: Array<{ hash: string; usedAt: string | null }>;
};

type StoredTotpReplayState = {
  version: 1;
  lastTokenHash: string;
  acceptedAt: string;
};

type MfaSetupChallenge = {
  version: 1;
  userId: string;
  secret: string;
  issuedAt: string;
};

function recoveryKey(userId: string): string {
  return `${RECOVERY_KEY_PREFIX}${userId}`;
}

function totpReplayKey(userId: string): string {
  return `${TOTP_REPLAY_KEY_PREFIX}${userId}`;
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

function parseTotpReplayState(value: string): StoredTotpReplayState | null {
  try {
    const parsed = JSON.parse(value) as StoredTotpReplayState;
    if (
      parsed?.version !== 1 ||
      typeof parsed.lastTokenHash !== "string" ||
      typeof parsed.acceptedAt !== "string" ||
      Number.isNaN(new Date(parsed.acceptedAt).getTime())
    ) {
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

export function createMfaSetupChallenge(userId: string, secret: string, issuedAt = new Date()): string {
  const payload: MfaSetupChallenge = {
    version: 1,
    userId,
    secret,
    issuedAt: issuedAt.toISOString(),
  };
  return encrypt(JSON.stringify(payload));
}

export function openMfaSetupChallenge(
  challenge: string,
  expectedUserId: string,
  now = new Date()
): { secret: string; issuedAt: Date } | null {
  try {
    const parsed = JSON.parse(decrypt(challenge)) as MfaSetupChallenge;
    if (
      parsed?.version !== 1 ||
      parsed.userId !== expectedUserId ||
      typeof parsed.secret !== "string" ||
      !parsed.secret ||
      typeof parsed.issuedAt !== "string"
    ) {
      return null;
    }
    const issuedAt = new Date(parsed.issuedAt);
    const issuedAtMs = issuedAt.getTime();
    const ageMs = now.getTime() - issuedAtMs;
    if (Number.isNaN(issuedAtMs) || ageMs < -60_000 || ageMs > MFA_SETUP_CHALLENGE_TTL_MS) {
      return null;
    }
    return { secret: parsed.secret, issuedAt };
  } catch {
    return null;
  }
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

function hashMfaTotpToken(token: string): string {
  return createHash("sha256").update(normalizeTotpToken(token), "utf8").digest("hex");
}

/**
 * Consumes an already cryptographically verified TOTP exactly once inside a
 * database transaction. PostgreSQL serializes concurrent upserts on the same
 * SystemConfig key, so two requests racing with the same token cannot both win.
 */
export async function consumeVerifiedMfaTotp(
  tx: MfaDb,
  userId: string,
  token: string,
  acceptedAt = new Date()
): Promise<boolean> {
  const normalized = normalizeTotpToken(token);
  if (!TOTP_PATTERN.test(normalized)) return false;

  const key = totpReplayKey(userId);
  const emptyState: StoredTotpReplayState = {
    version: 1,
    lastTokenHash: "",
    acceptedAt: new Date(0).toISOString(),
  };

  await tx.systemConfig.upsert({
    where: { key },
    create: { key, value: JSON.stringify(emptyState) },
    update: { updatedAt: acceptedAt },
  });

  const row = await tx.systemConfig.findUnique({ where: { key } });
  if (!row) return false;
  const stored = parseTotpReplayState(row.value);
  if (!stored) return false;

  const tokenHash = hashMfaTotpToken(normalized);
  const previousAcceptedAt = new Date(stored.acceptedAt).getTime();
  if (
    stored.lastTokenHash === tokenHash &&
    acceptedAt.getTime() - previousAcceptedAt <= TOTP_REPLAY_TTL_MS
  ) {
    return false;
  }

  const next: StoredTotpReplayState = {
    version: 1,
    lastTokenHash: tokenHash,
    acceptedAt: acceptedAt.toISOString(),
  };
  await tx.systemConfig.update({
    where: { key },
    data: { value: JSON.stringify(next) },
  });
  return true;
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

export async function deleteMfaTotpReplayState(tx: MfaDb, userId: string): Promise<void> {
  await tx.systemConfig.deleteMany({ where: { key: totpReplayKey(userId) } });
}

export async function deleteMfaSecurityArtifacts(tx: MfaDb, userId: string): Promise<void> {
  await tx.systemConfig.deleteMany({
    where: { key: { in: [recoveryKey(userId), totpReplayKey(userId)] } },
  });
}

export async function countRemainingMfaRecoveryCodes(tx: MfaDb, userId: string): Promise<number> {
  const row = await tx.systemConfig.findUnique({ where: { key: recoveryKey(userId) } });
  if (!row) return 0;
  const stored = parseStoredRecoveryCodes(row.value);
  if (!stored) return 0;
  return stored.codes.filter((entry) => entry.usedAt === null).length;
}
