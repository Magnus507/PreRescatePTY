import { createHash } from "crypto";
import type { Prisma } from "@prisma/client";
import {
  decryptSensitiveValue,
  encryptSensitiveValue,
  getEncryptionVersion,
} from "@/lib/encryption";

export type ProtectedActivationCode = {
  activationCode: string;
  activationCodeHash: string;
  activationCodeLast4: string;
};

export function normalizeActivationCode(value: string): string {
  return value.trim().toUpperCase();
}

export function hashActivationCode(value: string): string {
  return createHash("sha256")
    .update(normalizeActivationCode(value), "utf8")
    .digest("hex");
}

export function protectActivationCode(value: string): ProtectedActivationCode {
  const normalized = normalizeActivationCode(value);
  if (!normalized) throw new Error("activation_code_required");

  return {
    activationCode: encryptSensitiveValue(normalized),
    activationCodeHash: hashActivationCode(normalized),
    activationCodeLast4: normalized.slice(-4),
  };
}

export function revealActivationCode(value: string): string {
  return decryptSensitiveValue(value, { allowPlaintextLegacy: true }).plaintext;
}

export function activationCodeLookupWhere(value: string): Prisma.ChipClaimTokenWhereInput {
  const normalized = normalizeActivationCode(value);
  return {
    OR: [
      { activationCodeHash: hashActivationCode(normalized) },
      // Zero-downtime compatibility until every production row is backfilled.
      { activationCode: normalized },
    ],
  };
}

export function activationCodeNeedsBackfill(value: {
  activationCode: string;
  activationCodeHash?: string | null;
  activationCodeLast4?: string | null;
}): boolean {
  return (
    getEncryptionVersion(value.activationCode) !== "v2" ||
    !value.activationCodeHash ||
    !value.activationCodeLast4
  );
}
