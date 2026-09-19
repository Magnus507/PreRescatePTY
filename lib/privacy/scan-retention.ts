import type { PrismaClient } from "@prisma/client";

export const SCAN_TELEMETRY_RETENTION_DAYS = 365;
const DAY_MS = 24 * 60 * 60 * 1000;

export function scanTelemetryCutoff(now = new Date()) {
  return new Date(now.getTime() - SCAN_TELEMETRY_RETENTION_DAYS * DAY_MS);
}

/**
 * Enforces the public privacy retention promise for scan telemetry.
 *
 * ScanEvent contains IP, user-agent and optional location data. Those records,
 * plus the denormalized "last scan" location on Chip/Profile, must not become a
 * permanent history merely because the rescue profile itself has lifetime
 * availability.
 */
export async function purgeExpiredScanTelemetry(
  db: PrismaClient,
  options?: { now?: Date },
) {
  const cutoff = scanTelemetryCutoff(options?.now);

  const [events, chips, profiles] = await db.$transaction([
    db.scanEvent.deleteMany({
      where: { scannedAt: { lt: cutoff } },
    }),
    db.chip.updateMany({
      where: { lastScanAt: { lt: cutoff } },
      data: { lastScanAt: null, lastScanLocation: null },
    }),
    db.profile.updateMany({
      where: { lastScanAt: { lt: cutoff } },
      data: { lastScanAt: null, lastScanLocation: null },
    }),
  ]);

  return {
    cutoff: cutoff.toISOString(),
    retentionDays: SCAN_TELEMETRY_RETENTION_DAYS,
    deletedScanEvents: events.count,
    clearedChipLastScan: chips.count,
    clearedProfileLastScan: profiles.count,
  };
}
