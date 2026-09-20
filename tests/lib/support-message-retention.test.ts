import { describe, expect, it, vi } from "vitest";
import {
  RESOLVED_SUPPORT_RETENTION_DAYS,
  purgeExpiredResolvedSupportMessages,
  resolvedSupportCutoff,
} from "@/lib/privacy/support-message-retention";

describe("resolved support message retention", () => {
  it("uses a 730-day post-resolution retention window", () => {
    const now = new Date("2026-09-20T03:00:00.000Z");
    expect(RESOLVED_SUPPORT_RETENTION_DAYS).toBe(730);
    expect(resolvedSupportCutoff(now).toISOString()).toBe("2024-09-20T03:00:00.000Z");
  });

  it("purges only resolved messages older than the cutoff", async () => {
    const deleteMany = vi.fn().mockResolvedValue({ count: 2 });
    const db = { supportMessage: { deleteMany } } as never;

    const result = await purgeExpiredResolvedSupportMessages(db, {
      now: new Date("2026-09-20T03:00:00.000Z"),
    });

    expect(deleteMany).toHaveBeenCalledWith({
      where: {
        resolvedAt: {
          not: null,
          lt: new Date("2024-09-20T03:00:00.000Z"),
        },
      },
    });
    expect(result).toMatchObject({
      retentionDays: 730,
      deletedResolvedMessages: 2,
    });
  });
});
