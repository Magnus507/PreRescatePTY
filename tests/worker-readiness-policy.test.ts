import { describe, expect, it } from "vitest";
import { buildWorkerReadinessChecks } from "@/lib/operations/worker-readiness";

const NOW = new Date("2026-09-10T18:15:00.000Z").getTime();
const RECENT = new Date("2026-09-10T18:10:00.000Z");
const STALE = new Date("2026-09-10T04:43:42.453Z");

function base(overrides: Partial<Parameters<typeof buildWorkerReadinessChecks>[0]> = {}) {
  return {
    now: NOW,
    lastNotify: RECENT,
    lastCommerce: RECENT,
    lastExpiry: RECENT,
    oldestNotification: null,
    oldestCommerceEvent: null,
    oldestStorageCleanup: null,
    notificationDeadLetters: 0,
    commerceDeadLetters: 0,
    storageDeadLetters: 0,
    automatedNotificationDeliveryEnabled: false,
    ...overrides,
  };
}

describe("worker readiness notification delivery policy", () => {
  it("does not degrade readiness for stale notification rows when rescue delivery is manual-only", () => {
    const checks = buildWorkerReadinessChecks(
      base({
        oldestNotification: STALE,
        notificationDeadLetters: 4,
        automatedNotificationDeliveryEnabled: false,
      })
    );

    expect(checks.notificationWorker).toBe(true);
    expect(checks.notificationQueueSla).toBe(true);
    expect(checks.notificationDeadLetters).toBe(true);
    expect(Object.values(checks).every(Boolean)).toBe(true);
  });

  it("still enforces notification queue health when automated delivery is enabled", () => {
    const checks = buildWorkerReadinessChecks(
      base({
        oldestNotification: STALE,
        notificationDeadLetters: 1,
        automatedNotificationDeliveryEnabled: true,
      })
    );

    expect(checks.notificationQueueSla).toBe(false);
    expect(checks.notificationDeadLetters).toBe(false);
  });

  it("never masks stale worker heartbeats or commerce/storage failures", () => {
    const checks = buildWorkerReadinessChecks(
      base({
        lastNotify: STALE,
        commerceDeadLetters: 1,
        storageDeadLetters: 1,
      })
    );

    expect(checks.notificationWorker).toBe(false);
    expect(checks.commerceDeadLetters).toBe(false);
    expect(checks.storageDeadLetters).toBe(false);
  });
});
