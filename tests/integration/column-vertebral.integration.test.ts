import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Prisma } from "@prisma/client";
import {
  assertIntegrationDatabaseReady,
  createIntegrationPrismaClient,
  prepareIntegrationEnvironment,
} from "./integration-db";

const db = createIntegrationPrismaClient();
const run = `spine-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

function chipData(suffix: string) {
  const identity = `${run}-${suffix}`;
  return {
    shortCode: identity,
    serialPublic: `${identity}-serial`,
    qrUrl: `https://example.invalid/qr/${identity}`,
    nfcUrl: `https://example.invalid/e/${identity}`,
  };
}

describe("column vertebral PostgreSQL invariants", () => {
  beforeAll(async () => {
    prepareIntegrationEnvironment();
    await assertIntegrationDatabaseReady(db);
  });

  afterAll(async () => {
    await db.$disconnect();
  });

  it.each([1, 10, 100, 1000])("creates a %i-item digital batch with no duplicate identities", async (size) => {
    const code = `${run}-bulk-${size}`;
    const batch = await db.operationDigitalBatch.create({
      data: {
        code,
        productType: "synthetic",
        prefix: code,
        startNumber: 1,
        endNumber: size,
        quantity: size,
      },
    });
    const result = await db.operationDigitalBatchItem.createMany({
      data: Array.from({ length: size }, (_, index) => ({
        batchId: batch.id,
        internalLabel: `${code}-${String(index + 1).padStart(4, "0")}`,
        sequenceNumber: index + 1,
        qrUrl: `https://example.invalid/qr/${code}/${index + 1}`,
        shortCode: `${code}-PUBLIC-${index + 1}`,
      })),
    });

    expect(result.count).toBe(size);
    expect(await db.operationDigitalBatchItem.count({ where: { batchId: batch.id } })).toBe(size);
    await db.operationDigitalBatch.delete({ where: { id: batch.id } });
  }, 120_000);

  it("rolls back the complete digital batch after a forced mid-transaction failure", async () => {
    const code = `${run}-rollback`;
    await expect(db.$transaction(async (tx) => {
      const batch = await tx.operationDigitalBatch.create({
        data: {
          code,
          productType: "synthetic",
          prefix: code,
          startNumber: 1,
          endNumber: 10,
          quantity: 10,
        },
      });
      await tx.operationDigitalBatchItem.createMany({
        data: Array.from({ length: 10 }, (_, index) => ({
          batchId: batch.id,
          internalLabel: `${code}-${index + 1}`,
          sequenceNumber: index + 1,
          qrUrl: "https://example.invalid/qr",
        })),
      });
      throw new Error("FORCED_ROLLBACK");
    })).rejects.toThrow("FORCED_ROLLBACK");

    expect(await db.operationDigitalBatch.count({ where: { code } })).toBe(0);
    expect(await db.operationDigitalBatchItem.count({ where: { internalLabel: { startsWith: code } } })).toBe(0);
  });

  it("rejects mutation of a public chip identity", async () => {
    const chip = await db.chip.create({ data: chipData("immutable") });
    await expect(
      db.chip.update({ where: { id: chip.id }, data: { shortCode: `${chip.shortCode}-changed` } })
    ).rejects.toThrow(/immutable Chip identity/i);
    expect((await db.chip.findUniqueOrThrow({ where: { id: chip.id } })).shortCode).toBe(chip.shortCode);
    await db.chip.delete({ where: { id: chip.id } });
  });

  it("rejects a profile assignment from another account", async () => {
    const accountA = await db.account.create({ data: { accountName: `${run}-A` } });
    const accountB = await db.account.create({ data: { accountName: `${run}-B` } });
    const profileA = await db.profile.create({
      data: { accountId: accountA.id, firstName: "A", lastName: "A", bloodType: "O+" },
    });
    const profileB = await db.profile.create({
      data: { accountId: accountB.id, firstName: "B", lastName: "B", bloodType: "O+" },
    });
    const chip = await db.chip.create({
      data: { ...chipData("tenant"), accountId: accountA.id, assignedProfileId: profileA.id },
    });

    await expect(
      db.chip.update({ where: { id: chip.id }, data: { assignedProfileId: profileB.id } })
    ).rejects.toThrow(/profile must belong to chip account/i);
    await db.chip.delete({ where: { id: chip.id } });
    await db.profile.deleteMany({ where: { id: { in: [profileA.id, profileB.id] } } });
    await db.account.deleteMany({ where: { id: { in: [accountA.id, accountB.id] } } });
  });

  it("allows exactly one open active activation token per chip", async () => {
    const chip = await db.chip.create({ data: chipData("token") });
    await db.chipClaimToken.create({
      data: {
        chipId: chip.id,
        activationCode: `${run}-cipher-1`,
        activationCodeHash: `${run}-hash-1`,
        activationCodeLast4: "0001",
      },
    });
    await expect(db.chipClaimToken.create({
      data: {
        chipId: chip.id,
        activationCode: `${run}-cipher-2`,
        activationCodeHash: `${run}-hash-2`,
        activationCodeLast4: "0002",
      },
    })).rejects.toBeInstanceOf(Prisma.PrismaClientKnownRequestError);
    await db.chip.delete({ where: { id: chip.id } });
  });

  it("denies direct anon access to critical identity tables", async () => {
    await expect(db.$transaction(async (tx) => {
      await tx.$executeRawUnsafe("SET LOCAL ROLE anon");
      await tx.$queryRawUnsafe('SELECT id FROM public."Chip" LIMIT 1');
    })).rejects.toThrow(/permission denied|row-level security/i);
  });
});
