import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  deleteObjects: vi.fn(),
  upsert: vi.fn(),
  findMany: vi.fn(),
  updateMany: vi.fn(),
}));

vi.mock("@/lib/storage-deletion", () => ({
  parseStorageObjectRef: vi.fn(() => ({ bucket: "profile-photos", path: "user/photo.webp" })),
  deleteStorageObjects: mocks.deleteObjects,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    storageCleanupOutbox: {
      upsert: mocks.upsert,
      findMany: mocks.findMany,
      updateMany: mocks.updateMany,
    },
  },
}));

import {
  cleanupUploadedObjectOrRecordOrphan,
  processStorageCleanupOutbox,
} from "@/lib/storage-cleanup-outbox";

describe("storage cleanup outbox", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.upsert.mockResolvedValue({ id: "cleanup-1" });
    mocks.findMany.mockResolvedValue([]);
    mocks.updateMany.mockResolvedValue({ count: 0 });
  });

  it("records a durable cleanup item when immediate compensation fails", async () => {
    mocks.deleteObjects.mockRejectedValueOnce(new Error("storage unavailable"));

    await expect(
      cleanupUploadedObjectOrRecordOrphan("https://example.test/photo.webp", {
        actorUserId: "user-1",
        accountId: "account-1",
      })
    ).resolves.toEqual({ cleaned: false, recorded: true });

    expect(mocks.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { objectKey: "profile-photos:user/photo.webp" },
      create: expect.objectContaining({
        bucket: "profile-photos",
        path: "user/photo.webp",
        actorUserId: "user-1",
      }),
    }));
  });

  it("lets only the worker holding the lease finalize cleanup", async () => {
    const now = new Date("2026-09-04T03:30:00.000Z");
    mocks.findMany.mockResolvedValue([{ 
      id: "cleanup-1",
      bucket: "profile-photos",
      path: "user/photo.webp",
      status: "pending",
      attempts: 0,
      availableAt: now,
      createdAt: now,
    }]);
    mocks.updateMany
      .mockResolvedValueOnce({ count: 0 })
      .mockResolvedValueOnce({ count: 0 })
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 1 });
    mocks.deleteObjects.mockResolvedValue(undefined);

    await expect(
      processStorageCleanupOutbox(10, { now, workerId: "worker-a" })
    ).resolves.toEqual({ claimed: 1, cleaned: 1, retrying: 0, failed: 0 });

    expect(mocks.updateMany).toHaveBeenLastCalledWith(expect.objectContaining({
      where: { id: "cleanup-1", status: "processing", lockedBy: "worker-a" },
      data: expect.objectContaining({ status: "cleaned", lockedBy: null }),
    }));
  });
});
