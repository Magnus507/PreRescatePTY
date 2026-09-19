import { describe, expect, it, vi } from "vitest";
import {
  SCAN_TELEMETRY_RETENTION_DAYS,
  purgeExpiredScanTelemetry,
  scanTelemetryCutoff,
} from "@/lib/privacy/scan-retention";

describe("scan telemetry retention", () => {
  it("uses a finite 365-day retention window", () => {
    const now = new Date("2026-09-19T12:00:00.000Z");
    expect(SCAN_TELEMETRY_RETENTION_DAYS).toBe(365);
    expect(scanTelemetryCutoff(now).toISOString()).toBe("2025-09-19T12:00:00.000Z");
  });

  it("deletes old scan events and clears denormalized last-location telemetry", async () => {
    const scanEventDeleteMany = vi.fn().mockResolvedValue({ count: 3 });
    const chipUpdateMany = vi.fn().mockResolvedValue({ count: 2 });
    const profileUpdateMany = vi.fn().mockResolvedValue({ count: 2 });
    const transaction = vi.fn(async (ops: Array<Promise<unknown>>) => Promise.all(ops));

    const db = {
      scanEvent: { deleteMany: scanEventDeleteMany },
      chip: { updateMany: chipUpdateMany },
      profile: { updateMany: profileUpdateMany },
      $transaction: transaction,
    } as never;

    const result = await purgeExpiredScanTelemetry(db, {
      now: new Date("2026-09-19T12:00:00.000Z"),
    });

    expect(scanEventDeleteMany).toHaveBeenCalledWith({
      where: { scannedAt: { lt: new Date("2025-09-19T12:00:00.000Z") } },
    });
    expect(chipUpdateMany).toHaveBeenCalledWith({
      where: { lastScanAt: { lt: new Date("2025-09-19T12:00:00.000Z") } },
      data: { lastScanAt: null, lastScanLocation: null },
    });
    expect(profileUpdateMany).toHaveBeenCalledWith({
      where: { lastScanAt: { lt: new Date("2025-09-19T12:00:00.000Z") } },
      data: { lastScanAt: null, lastScanLocation: null },
    });
    expect(result).toMatchObject({
      retentionDays: 365,
      deletedScanEvents: 3,
      clearedChipLastScan: 2,
      clearedProfileLastScan: 2,
    });
  });
});
