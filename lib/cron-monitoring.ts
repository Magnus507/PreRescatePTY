import { prisma } from "@/lib/prisma";

export const CRON_MONITOR_KEYS = {
  notify: "cron:last-success:notify",
  commerceOrderSync: "cron:last-success:commerce-order-sync",
  expireChips: "cron:last-success:expire-chips",
} as const;

export async function recordCronSuccess(
  key: (typeof CRON_MONITOR_KEYS)[keyof typeof CRON_MONITOR_KEYS],
  summary: Record<string, unknown>
) {
  const value = JSON.stringify({ at: new Date().toISOString(), summary });
  await prisma.systemConfig.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });
}

export function parseCronRun(value: string | undefined) {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as { at?: unknown };
    if (typeof parsed.at !== "string") return null;
    const at = new Date(parsed.at);
    return Number.isNaN(at.getTime()) ? null : at;
  } catch {
    return null;
  }
}
