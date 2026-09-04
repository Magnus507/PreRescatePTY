import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { deleteStorageObjects, parseStorageObjectRef } from "@/lib/storage-deletion";

export const STORAGE_CLEANUP_LEASE_MS = 15 * 60_000;
export const STORAGE_CLEANUP_MAX_ATTEMPTS = 8;

function objectKey(bucket: string, path: string) {
  return `${bucket}:${path}`;
}

function nextAttemptAt(attempts: number) {
  const delayMinutes = Math.min(2 ** Math.max(attempts - 1, 0), 60);
  return new Date(Date.now() + delayMinutes * 60_000);
}

function safeError(error: unknown) {
  return (error instanceof Error ? error.message : "Storage cleanup failed").slice(0, 500);
}

export async function cleanupUploadedObjectOrRecordOrphan(
  value: string,
  context: { actorUserId: string; accountId?: string | null }
) {
  const ref = parseStorageObjectRef(value);
  if (!ref) return { cleaned: false, recorded: false };

  try {
    await deleteStorageObjects([ref]);
    return { cleaned: true, recorded: false };
  } catch (error) {
    await prisma.storageCleanupOutbox.upsert({
      where: { objectKey: objectKey(ref.bucket, ref.path) },
      update: {
        status: "pending",
        availableAt: new Date(),
        lockedAt: null,
        lockedBy: null,
        lastErrorMessage: safeError(error),
      },
      create: {
        objectKey: objectKey(ref.bucket, ref.path),
        bucket: ref.bucket,
        path: ref.path,
        actorUserId: context.actorUserId,
        accountId: context.accountId || null,
        lastErrorMessage: safeError(error),
      },
    });
    return { cleaned: false, recorded: true };
  }
}

export async function processStorageCleanupOutbox(
  limit = 50,
  options?: { now?: Date; workerId?: string }
) {
  const now = options?.now ?? new Date();
  const workerId = options?.workerId ?? `storage-cleanup-${randomUUID()}`;
  const leaseExpiredBefore = new Date(now.getTime() - STORAGE_CLEANUP_LEASE_MS);

  await prisma.storageCleanupOutbox.updateMany({
    where: {
      status: "processing",
      OR: [{ lockedAt: null }, { lockedAt: { lte: leaseExpiredBefore } }],
      attempts: { lt: STORAGE_CLEANUP_MAX_ATTEMPTS },
    },
    data: {
      status: "retrying",
      availableAt: now,
      lockedAt: null,
      lockedBy: null,
      lastErrorMessage: "Worker lease expired; cleanup returned to retry queue",
    },
  });

  await prisma.storageCleanupOutbox.updateMany({
    where: {
      status: "processing",
      OR: [{ lockedAt: null }, { lockedAt: { lte: leaseExpiredBefore } }],
      attempts: { gte: STORAGE_CLEANUP_MAX_ATTEMPTS },
    },
    data: {
      status: "failed",
      lockedAt: null,
      lockedBy: null,
      lastErrorMessage: "Worker lease expired after maximum attempts",
    },
  });

  const candidates = await prisma.storageCleanupOutbox.findMany({
    where: {
      status: { in: ["pending", "retrying"] },
      availableAt: { lte: now },
    },
    orderBy: [{ availableAt: "asc" }, { createdAt: "asc" }],
    take: Math.min(Math.max(limit, 1), 100),
  });

  let claimed = 0;
  let cleaned = 0;
  let retrying = 0;
  let failed = 0;

  for (const row of candidates) {
    const claim = await prisma.storageCleanupOutbox.updateMany({
      where: {
        id: row.id,
        status: { in: ["pending", "retrying"] },
        availableAt: { lte: now },
      },
      data: {
        status: "processing",
        lockedAt: now,
        lockedBy: workerId,
        attempts: { increment: 1 },
      },
    });
    if (claim.count !== 1) continue;
    claimed += 1;

    try {
      await deleteStorageObjects([{ bucket: row.bucket, path: row.path }]);
      const finalized = await prisma.storageCleanupOutbox.updateMany({
        where: { id: row.id, status: "processing", lockedBy: workerId },
        data: {
          status: "cleaned",
          cleanedAt: new Date(),
          lockedAt: null,
          lockedBy: null,
          lastErrorMessage: null,
        },
      });
      if (finalized.count === 1) cleaned += 1;
    } catch (error) {
      const attempts = row.attempts + 1;
      const exhausted = attempts >= STORAGE_CLEANUP_MAX_ATTEMPTS;
      const finalized = await prisma.storageCleanupOutbox.updateMany({
        where: { id: row.id, status: "processing", lockedBy: workerId },
        data: {
          status: exhausted ? "failed" : "retrying",
          availableAt: exhausted ? row.availableAt : nextAttemptAt(attempts),
          lockedAt: null,
          lockedBy: null,
          lastErrorMessage: safeError(error),
        },
      });
      if (finalized.count !== 1) continue;
      if (exhausted) failed += 1;
      else retrying += 1;
    }
  }

  return { claimed, cleaned, retrying, failed };
}
