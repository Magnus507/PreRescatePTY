import type { Prisma } from "@prisma/client";
import {
  generateActivationCode,
  generateSerialPublic,
  generateShortCode,
} from "@/lib/constants";
import { buildProductionDigitalIdentity } from "@/lib/operations/digital-identity";
import {
  hashActivationCode,
  protectActivationCode,
  revealActivationCode,
} from "@/domains/chips/activation-code.service";

const MAX_IDENTIFIER_ATTEMPTS = 20;
const PHYSICAL_TOKEN_LIFETIME_MS = 10 * 365 * 24 * 60 * 60 * 1000;

type TraceableItem = {
  id: string;
  internalLabel: string;
  shortCode: string | null;
  chipId: string | null;
  batchId: string;
};

type EnsureTraceableIdentityInput = {
  item: TraceableItem;
  productType: string;
  requestOrigin?: string | null;
  createdAt?: Date;
};

async function generateAvailableShortCode(
  tx: Prisma.TransactionClient,
  itemId: string
) {
  for (let attempt = 0; attempt < MAX_IDENTIFIER_ATTEMPTS; attempt += 1) {
    const candidate = generateShortCode(26);
    const [digitalItem, chip, corporateProfile] = await Promise.all([
      tx.operationDigitalBatchItem.findFirst({
        where: { shortCode: candidate, id: { not: itemId } },
        select: { id: true },
      }),
      tx.chip.findUnique({ where: { shortCode: candidate }, select: { id: true } }),
      tx.corporatePublicProfile.findUnique({
        where: { shortCode: candidate },
        select: { id: true },
      }),
    ]);

    if (!digitalItem && !chip && !corporateProfile) return candidate;
  }

  throw new Error("TRACEABLE_SHORT_CODE_EXHAUSTED");
}

async function generateAvailableSerial(tx: Prisma.TransactionClient) {
  for (let attempt = 0; attempt < MAX_IDENTIFIER_ATTEMPTS; attempt += 1) {
    const candidate = generateSerialPublic();
    const existing = await tx.chip.findUnique({
      where: { serialPublic: candidate },
      select: { id: true },
    });
    if (!existing) return candidate;
  }

  throw new Error("TRACEABLE_SERIAL_EXHAUSTED");
}

async function generateAvailableActivationCode(tx: Prisma.TransactionClient) {
  for (let attempt = 0; attempt < MAX_IDENTIFIER_ATTEMPTS; attempt += 1) {
    const candidate = generateActivationCode();
    const existing = await tx.chipClaimToken.findFirst({
      where: {
        OR: [
          { activationCodeHash: hashActivationCode(candidate) },
          { activationCode: candidate },
        ],
      },
      select: { id: true },
    });
    if (!existing) return candidate;
  }

  throw new Error("TRACEABLE_ACTIVATION_CODE_EXHAUSTED");
}

/**
 * Guarantees that a printable digital item resolves to one real Chip and has a
 * single-use activation credential. The caller must execute this inside the
 * same transaction that creates or repairs the digital item.
 */
export async function ensureTraceableDigitalIdentity(
  tx: Prisma.TransactionClient,
  input: EnsureTraceableIdentityInput
) {
  const { item, productType, requestOrigin } = input;
  const createdAt = input.createdAt || new Date();
  const shortCode = item.shortCode || (await generateAvailableShortCode(tx, item.id));
  const corporateCodeConflict = await tx.corporatePublicProfile.findUnique({
    where: { shortCode },
    select: { id: true },
  });
  if (corporateCodeConflict) {
    throw new Error("TRACEABLE_PUBLIC_CODE_CONFLICT");
  }
  const identity = buildProductionDigitalIdentity({
    internalLabel: item.internalLabel,
    shortCode,
    requestOrigin,
  });

  if (!identity.canPrint || !identity.canonicalPublicUrl || !identity.qrImageUrl) {
    throw new Error("TRACEABLE_IDENTITY_NOT_PRINTABLE");
  }

  let chip = item.chipId
    ? await tx.chip.findUnique({ where: { id: item.chipId } })
    : await tx.chip.findUnique({ where: { shortCode } });

  if (item.chipId && !chip) {
    throw new Error("TRACEABLE_LINKED_CHIP_NOT_FOUND");
  }

  if (chip && chip.shortCode !== shortCode) {
    throw new Error("TRACEABLE_SHORT_CODE_MISMATCH");
  }

  if (chip && chip.internalLabel && chip.internalLabel !== item.internalLabel) {
    throw new Error("TRACEABLE_CHIP_ALREADY_LINKED");
  }

  let chipCreated = false;
  if (!chip) {
    chip = await tx.chip.create({
      data: {
        shortCode,
        serialPublic: await generateAvailableSerial(tx),
        internalLabel: item.internalLabel,
        nfcUrl: identity.canonicalPublicUrl,
        qrUrl: identity.qrImageUrl,
        batchId: item.batchId,
        productType,
        status: "inventory",
        isPhysical: true,
      },
    });
    chipCreated = true;
  } else {
    chip = await tx.chip.update({
      where: { id: chip.id },
      data: {
        internalLabel: chip.internalLabel || item.internalLabel,
        nfcUrl: identity.canonicalPublicUrl,
        qrUrl: identity.qrImageUrl,
        batchId: chip.batchId || item.batchId,
        productType,
        isPhysical: true,
      },
    });
  }

  let token = await tx.chipClaimToken.findFirst({
    where: {
      chipId: chip.id,
      usedAt: null,
      status: "active",
      OR: [{ expiresAt: null }, { expiresAt: { gt: createdAt } }],
    },
    orderBy: { createdAt: "desc" },
  });
  let activationCodeCreated = false;

  if (!token) {
    const rawActivationCode = await generateAvailableActivationCode(tx);
    token = await tx.chipClaimToken.create({
      data: {
        chipId: chip.id,
        ...protectActivationCode(rawActivationCode),
        expiresAt: new Date(createdAt.getTime() + PHYSICAL_TOKEN_LIFETIME_MS),
        status: "active",
      },
    });
    activationCodeCreated = true;
  }

  const updatedItem = await tx.operationDigitalBatchItem.update({
    where: { id: item.id },
    data: {
      shortCode,
      chipId: chip.id,
      activationUrl: identity.activationFallbackUrl,
      qrUrl: identity.qrImageUrl,
      nfcUrl: identity.canonicalPublicUrl,
    },
  });

  return {
    item: updatedItem,
    chip,
    token,
    activationCode: revealActivationCode(token.activationCode),
    chipCreated,
    activationCodeCreated,
  };
}
