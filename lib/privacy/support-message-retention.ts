import type { PrismaClient } from "@prisma/client";

export const RESOLVED_SUPPORT_RETENTION_DAYS = 730;
const DAY_MS = 24 * 60 * 60 * 1000;

export function resolvedSupportCutoff(now = new Date()) {
  return new Date(now.getTime() - RESOLVED_SUPPORT_RETENTION_DAYS * DAY_MS);
}

export async function purgeExpiredResolvedSupportMessages(
  db: PrismaClient,
  options?: { now?: Date },
) {
  const cutoff = resolvedSupportCutoff(options?.now);
  const deleted = await db.supportMessage.deleteMany({
    where: {
      resolvedAt: { not: null, lt: cutoff },
    },
  });

  return {
    cutoff: cutoff.toISOString(),
    retentionDays: RESOLVED_SUPPORT_RETENTION_DAYS,
    deletedResolvedMessages: deleted.count,
  };
}
