import type { Prisma } from "@prisma/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mockPrisma, resetMockPrisma } from "../helpers/mock-prisma";

vi.mock("@/lib/constants", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/constants")>();
  return {
    ...actual,
    generateShortCode: vi.fn(() => "PUBLIC7NM42"),
    generateSerialPublic: vi.fn(() => "PRP-UNIT-0001"),
    generateActivationCode: vi.fn(() => "ABCD-EFGH-JKLM"),
  };
});

import { ensureTraceableDigitalIdentity } from "@/lib/operations/traceable-digital-identity";

const tx = mockPrisma as unknown as Prisma.TransactionClient;

function digitalItem(overrides: Record<string, unknown> = {}) {
  return {
    id: "digital-item-1",
    internalLabel: "LOT-2026-00001",
    shortCode: "PUBLIC7NM42",
    chipId: null,
    batchId: "batch-1",
    ...overrides,
  };
}

describe("ensureTraceableDigitalIdentity", () => {
  beforeEach(() => {
    resetMockPrisma();
    // This suite exercises the explicit requestOrigin path. Keep ambient CI or
    // Vercel URL variables from changing the canonical URL under test.
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "");
    vi.stubEnv("NEXTAUTH_URL", "");
    vi.stubEnv("APP_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    vi.stubEnv("VERCEL_URL", "");

    mockPrisma.chip.create.mockResolvedValue({
      id: "chip-1",
      shortCode: "PUBLIC7NM42",
      serialPublic: "PRP-UNIT-0001",
      internalLabel: "LOT-2026-00001",
      batchId: "batch-1",
      productType: "sticker_nfc_qr",
      nfcUrl: "https://prerescatepty.com/e/PUBLIC7NM42",
      qrUrl: "/api/public/qr?data=PUBLIC7NM42",
    } as never);
    mockPrisma.chipClaimToken.create.mockResolvedValue({
      id: "token-1",
      chipId: "chip-1",
      activationCode: "ABCD-EFGH-JKLM",
      status: "active",
      usedAt: null,
    } as never);
    mockPrisma.operationDigitalBatchItem.update.mockResolvedValue({
      ...digitalItem(),
      chipId: "chip-1",
    } as never);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("creates the resolver chip, activation token and digital link as one bundle", async () => {
    const result = await ensureTraceableDigitalIdentity(tx, {
      item: digitalItem(),
      productType: "sticker_nfc_qr",
      requestOrigin: "https://prerescatepty.com",
      createdAt: new Date("2026-08-27T00:00:00.000Z"),
    });

    expect(mockPrisma.chip.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          shortCode: "PUBLIC7NM42",
          internalLabel: "LOT-2026-00001",
          isPhysical: true,
          nfcUrl: "https://prerescatepty.com/e/PUBLIC7NM42",
        }),
      })
    );
    expect(mockPrisma.chipClaimToken.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ chipId: "chip-1", status: "active" }),
      })
    );
    expect(mockPrisma.operationDigitalBatchItem.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "digital-item-1" },
        data: expect.objectContaining({ chipId: "chip-1", shortCode: "PUBLIC7NM42" }),
      })
    );
    expect(result.chipCreated).toBe(true);
    expect(result.activationCodeCreated).toBe(true);
  });

  it("reuses an existing matching chip and active claim token", async () => {
    mockPrisma.chip.findUnique.mockResolvedValue({
      id: "chip-1",
      shortCode: "PUBLIC7NM42",
      internalLabel: "LOT-2026-00001",
      batchId: "batch-1",
    } as never);
    mockPrisma.chip.update.mockResolvedValue({
      id: "chip-1",
      shortCode: "PUBLIC7NM42",
      internalLabel: "LOT-2026-00001",
      batchId: "batch-1",
    } as never);
    mockPrisma.chipClaimToken.findFirst.mockResolvedValue({
      id: "token-1",
      chipId: "chip-1",
      activationCode: "EXISTING-CODE",
      usedAt: null,
      status: "active",
    } as never);

    const result = await ensureTraceableDigitalIdentity(tx, {
      item: digitalItem({ chipId: "chip-1" }),
      productType: "sticker_nfc_qr",
      requestOrigin: "https://prerescatepty.com",
    });

    expect(mockPrisma.chip.create).not.toHaveBeenCalled();
    expect(mockPrisma.chipClaimToken.create).not.toHaveBeenCalled();
    expect(result.activationCode).toBe("EXISTING-CODE");
    expect(result.chipCreated).toBe(false);
  });

  it("stops before relinking when the public identity points at another unit", async () => {
    mockPrisma.chip.findUnique.mockResolvedValue({
      id: "chip-1",
      shortCode: "PUBLIC7NM42",
      internalLabel: "ANOTHER-UNIT",
      batchId: "batch-1",
    } as never);

    await expect(
      ensureTraceableDigitalIdentity(tx, {
        item: digitalItem({ chipId: "chip-1" }),
        productType: "sticker_nfc_qr",
        requestOrigin: "https://prerescatepty.com",
      })
    ).rejects.toThrow("TRACEABLE_CHIP_ALREADY_LINKED");

    expect(mockPrisma.chipClaimToken.create).not.toHaveBeenCalled();
    expect(mockPrisma.operationDigitalBatchItem.update).not.toHaveBeenCalled();
  });

  it("rejects a public code already owned by a corporate profile", async () => {
    mockPrisma.corporatePublicProfile.findUnique.mockResolvedValue({ id: "company-profile-1" } as never);

    await expect(
      ensureTraceableDigitalIdentity(tx, {
        item: digitalItem(),
        productType: "sticker_nfc_qr",
        requestOrigin: "https://prerescatepty.com",
      })
    ).rejects.toThrow("TRACEABLE_PUBLIC_CODE_CONFLICT");

    expect(mockPrisma.chip.create).not.toHaveBeenCalled();
    expect(mockPrisma.operationDigitalBatchItem.update).not.toHaveBeenCalled();
  });
});
