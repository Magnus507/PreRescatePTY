import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { createIntegrationPrismaClient, prepareIntegrationEnvironment, assertIntegrationDatabaseReady } from "./integration-db";
import { reserveCommercialOrderStock } from "@/lib/operations/commercial-order-reservation";

const send = vi.hoisted(() => vi.fn().mockResolvedValue({ success: true, providerResponse: "test-provider-accepted" }));
vi.mock("@/lib/notifications", () => ({ sendEmergencyNotification: send }));

import { processPendingEmergencyNotifications, queueEmergencyNotificationsFromScan } from "@/lib/emergency-alerts";

const db = createIntegrationPrismaClient();
const run = `adv-${Date.now()}`;

function evidence(test: string, requests: number, success: number, rejected: number, duplicates: number) {
  console.log(JSON.stringify({ test, requests, success, rejected, duplicates, invariant: "PASS" }));
}

describe("Adversarial PostgreSQL concurrency (isolated, synthetic data)", () => {
  beforeAll(async () => { prepareIntegrationEnvironment(); await assertIntegrationDatabaseReady(db); });
  afterAll(async () => { await db.$disconnect(); });

  it.each([2, 10, 50])("stock=1 with %i concurrent reservations", async (count) => {
    const sku = `${run}-${count}`;
    const unit = await db.operationFinishedGoodUnit.create({ data: { internalLabel: sku, productCode: sku, productName: "Synthetic", productType: "test", status: "available", qaStatus: "passed", activationStatus: "not_activated" } });
    const orders = await Promise.all(Array.from({ length: count }, (_, n) => db.operationCommercialOrder.create({ data: {
      code: `${sku}-${n}`, sourceType: "checkout", sourceId: `${sku}-source-${n}`, customerType: "customer", salesChannel: "web", status: "draft", paymentStatus: "paid", fulfillmentStatus: "pending", totalAmount: "25", currency: "USD",
      items: { create: [{ productName: "Synthetic", productCode: sku, quantity: 1, unitPrice: "25", totalPrice: "25", unit: "unit" }] },
    } })));
    const results = await Promise.allSettled(orders.map(order => db.$transaction(tx => reserveCommercialOrderStock(tx, { orderId: order.id }), { maxWait: 60_000, timeout: 60_000 })));
    const successes = results.filter(r => r.status === "fulfilled" && r.value?.summary.reservedQty === 1).length;
    expect(successes).toBe(1);
    expect(results.filter(r => r.status === "rejected")).toHaveLength(count - 1);
    const final = await db.operationFinishedGoodUnit.findUniqueOrThrow({ where: { id: unit.id } });
    expect(final.status).toBe("reserved");
    expect(orders.map(o => o.sourceId)).toContain(final.reservedOrderId);
    expect(await db.operationFinishedGoodUnitEvent.count({ where: { unitId: unit.id, eventType: "RESERVED" } })).toBe(1);
    evidence("inventory stock=1", count, successes, count - successes, 0);
  }, 120_000);

  it("retired automatic emergency delivery remains inert under concurrent legacy callers", async () => {
    process.env.RESEND_API_KEY = "test-provider-no-network";
    process.env.TWILIO_ACCOUNT_SID = "test-provider-no-network";
    process.env.TWILIO_AUTH_TOKEN = "test-provider-no-network";
    process.env.TWILIO_PHONE_NUMBER = "+15070000000";
    process.env.TWILIO_WHATSAPP_NUMBER = "whatsapp:+15070000000";

    const account = await db.account.create({ data: { accountName: `${run}-notifications`, accountType: "personal" } });
    const profile = await db.profile.create({ data: {
      accountId: account.id,
      firstName: "Synthetic",
      lastName: "User",
      bloodType: "O+",
      profileVisibilityStatus: "active",
      contacts: { create: [{
        relationship: "Familiar",
        notifyEmail: true,
        notifySms: true,
        notifyWhatsapp: true,
        active: true,
        contact: { create: { fullName: "Synthetic contact", phone: "+50760000000", email: "synthetic@example.invalid" } },
      }] },
    } });
    const chip = await db.chip.create({ data: {
      shortCode: `${run}-SCAN`,
      serialPublic: `${run}-SERIAL`,
      qrUrl: "https://example.invalid/qr",
      nfcUrl: "https://example.invalid/nfc",
      status: "activated",
      accountId: account.id,
      assignedProfileId: profile.id,
    } });
    const scan = await db.scanEvent.create({ data: {
      chipId: chip.id,
      profileId: profile.id,
      accountId: account.id,
      notificationStatus: "pending",
      sourceType: "qr",
    } });
    await db.consent.create({ data: {
      accountId: account.id,
      profileId: profile.id,
      consentType: "automatic_emergency_alerts",
      textVersion: "historical-test",
    } });

    const queueResults = await Promise.all(Array.from({ length: 100 }, (_, i) =>
      queueEmergencyNotificationsFromScan(db, {
        scanEventId: scan.id,
        chipId: chip.id,
        profileId: profile.id,
        profileName: "Synthetic",
        shortCode: chip.shortCode,
        publicUrl: "/test",
        trigger: i % 2 ? "manual" : "automatic",
      })
    ));

    expect(queueResults.every(result => result.status === "disabled" && result.queued === 0)).toBe(true);
    expect(await db.notification.count({ where: { chipId: chip.id } })).toBe(0);
    expect((await db.scanEvent.findUniqueOrThrow({ where: { id: scan.id } })).notificationStatus).toBe("pending");
    evidence("retired automatic queue", 100, 0, 100, 0);

    // Seed a historical pending row. Retired workers must not claim, mutate or
    // deliver it even when provider environment variables are present.
    const historicalJob = await db.notification.create({ data: {
      chipId: chip.id,
      eventId: scan.id,
      channel: "email",
      recipient: "synthetic@example.invalid",
      idempotencyKey: `${run}-historical`,
      status: "pending",
    } });

    send.mockClear();
    const workers = await Promise.all(Array.from({ length: 20 }, (_, n) =>
      processPendingEmergencyNotifications(db, { workerId: `${run}-${n}` })
    ));
    expect(workers.reduce((n, worker) => n + worker.claimed, 0)).toBe(0);
    expect(workers.reduce((n, worker) => n + worker.sent, 0)).toBe(0);
    expect(send).not.toHaveBeenCalled();

    const afterWorkers = await db.notification.findUniqueOrThrow({ where: { id: historicalJob.id } });
    expect(afterWorkers.status).toBe("pending");
    expect(afterWorkers.attempts).toBe(0);
    evidence("retired worker concurrency", 20, 0, 20, 0);

    process.env.CRON_SECRET = "isolated-cron-test-secret";
    const { POST } = await import("@/app/api/cron/notify/route");
    const responses = await Promise.all(Array.from({ length: 10 }, () =>
      POST(new Request("http://localhost/api/cron/notify", {
        method: "POST",
        headers: { authorization: "Bearer isolated-cron-test-secret" },
      }))
    ));
    expect(responses.every(response => response.status === 200)).toBe(true);
    const bodies = await Promise.all(responses.map(response => response.json()));
    expect(bodies.reduce((sum, body) => sum + body.claimed, 0)).toBe(0);
    expect(bodies.reduce((sum, body) => sum + body.sent, 0)).toBe(0);
    expect(send).not.toHaveBeenCalled();

    const afterCron = await db.notification.findUniqueOrThrow({ where: { id: historicalJob.id } });
    expect(afterCron.status).toBe("pending");
    expect(afterCron.attempts).toBe(0);
    evidence("retired authenticated cron", 10, 0, 10, 0);
  }, 120_000);
});
