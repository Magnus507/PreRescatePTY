import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";
import {
  assertIntegrationDatabaseReady,
  createIntegrationPrismaClient,
  prepareIntegrationEnvironment,
} from "./integration-db";

const external = vi.hoisted(() => ({
  auth: [] as Array<{ id: string; email: string }>,
  storage: new Map<string, Set<string>>(),
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    auth: { admin: {
      listUsers: vi.fn(async () => ({ data: { users: external.auth }, error: null })),
      deleteUser: vi.fn(async (id: string) => {
        external.auth = external.auth.filter((row) => row.id !== id);
        return { data: {}, error: null };
      }),
    } },
    storage: { from: (bucket: string) => ({
      list: vi.fn(async (prefix: string) => ({
        data: [...(external.storage.get(bucket) ?? new Set<string>())]
          .filter((path) => path.startsWith(`${prefix}/`))
          .map((path) => ({ name: path.slice(prefix.length + 1) }))
          .filter((row) => !row.name.includes("/")),
        error: null,
      })),
      remove: vi.fn(async (paths: string[]) => {
        const objects = external.storage.get(bucket) ?? new Set<string>();
        for (const path of paths) objects.delete(path);
        external.storage.set(bucket, objects);
        return { data: [], error: null };
      }),
    }) },
  })),
}));

import { SafeDeleteService } from "@/domains/users/services/safe-delete.service";
import { resolvePublicProfileByChipShortCode } from "@/lib/public-access/resolve-public-profile-by-chip";

const db = createIntegrationPrismaClient();
const run = `b3${Date.now()}${Math.random().toString(36).slice(2, 7)}`;
const ids = Object.fromEntries(
  ["account", "user", "profile", "contact", "chip", "order", "attempt", "invoice", "dispatch", "commercial"]
    .map((name) => [name, `${run}-${name}`]),
) as Record<string, string>;
const mark = {
  name: `NAME_${run}`,
  email: `${run}@sentinel.invalid`,
  phone: `600${String(Date.now()).slice(-5)}`,
  document: `DOC_${run}`,
  address: `ADDR_${run}`,
  health: `HEALTH_${run}`,
  location: `LOC_${run}`,
  photo: `PHOTO_${run}`,
  proof: `PROOF_${run}`,
};
const markers = Object.values(mark);
const shortCode = `B3${Math.random().toString(36).slice(2, 9).toUpperCase()}`;
const proofPath = `payments/${ids.user}/${ids.order}/${mark.proof}.webp`;

function addObject(bucket: string, path: string) {
  const set = external.storage.get(bucket) ?? new Set<string>();
  set.add(path);
  external.storage.set(bucket, set);
}

function quoted(value: string) {
  return `"${value.replaceAll('"', '""')}"`;
}

async function publicResidues() {
  const columns = await db.$queryRaw<Array<{ table_name: string; column_name: string }>>(Prisma.sql`
    SELECT table_name, column_name FROM information_schema.columns
    WHERE table_schema='public'
      AND data_type IN ('text','character varying','json','jsonb')
      AND table_name <> '_prisma_migrations'
  `);
  const hits: Array<{ table: string; column: string; marker: string }> = [];
  for (const column of columns) {
    for (const marker of markers) {
      const rows = await db.$queryRawUnsafe<Array<{ count: number }>>(
        `SELECT count(*)::int count FROM ${quoted(column.table_name)} WHERE CAST(${quoted(column.column_name)} AS text) LIKE $1`,
        `%${marker}%`,
      );
      if (Number(rows[0]?.count ?? 0) > 0) hits.push({ table: column.table_name, column: column.column_name, marker });
    }
  }
  return hits;
}

describe("Block 3 privacy erasure sentinel", () => {
  beforeAll(async () => {
    prepareIntegrationEnvironment();
    await assertIntegrationDatabaseReady(db);
    external.auth = [{ id: `${run}-auth`, email: mark.email }];
    external.storage.clear();
    addObject("general", `${ids.user}/${mark.photo}-general.webp`);
    addObject("profile-photos", `${ids.user}/${mark.photo}.webp`);
    addObject("payment-proofs", proofPath);

    await db.account.create({ data: { id: ids.account, accountName: mark.name, accountType: "personal" } });
    await db.user.create({ data: { id: ids.user, accountId: ids.account, email: mark.email, phone: mark.phone, passwordHash: "sentinel-hash" } });
    await db.account.update({ where: { id: ids.account }, data: { ownerUserId: ids.user } });
    await db.profile.create({ data: {
      id: ids.profile, accountId: ids.account, userId: ids.user, firstName: mark.name,
      lastName: mark.name, bloodType: "O+", allergies: mark.health, chronicConditions: mark.health,
      medications: mark.health, additionalNotes: mark.location, phone: mark.phone, nationalId: mark.document,
      address: mark.address, city: mark.location, lastScanLocation: mark.location,
      photoUrl: `https://ci-test.supabase.co/storage/v1/object/public/profile-photos/${ids.user}/${mark.photo}.webp`,
    } });
    await db.contact.create({ data: { id: ids.contact, userId: ids.user, fullName: mark.name, phone: mark.phone, email: mark.email } });
    await db.profileContact.create({ data: { profileId: ids.profile, contactId: ids.contact, relationship: "Family" } });
    await db.chip.create({ data: {
      id: ids.chip, shortCode, nfcUrl: `https://ci.test/e/${shortCode}`, qrUrl: `https://ci.test/e/${shortCode}`,
      serialPublic: `${run}-serial`, ownerUserId: ids.user, assignedProfileId: ids.profile,
      accountId: ids.account, status: "activated", lastScanLocation: mark.location,
    } });
    await db.scanEvent.create({ data: { chipId: ids.chip, profileId: ids.profile, accountId: ids.account, address: mark.address, city: mark.location, rawMetadataJson: JSON.stringify(mark) } });
    await db.notification.create({ data: { chipId: ids.chip, eventId: `${run}-scan`, channel: "email", recipient: mark.email, idempotencyKey: `${run}-notification` } });
    await db.digitalPass.create({ data: { profileId: ids.profile, passType: "apple", passUrl: `https://ci.test/${mark.photo}`, serialNumber: `${run}-pass`, authToken: `${run}-pass-auth` } });
    await db.consent.create({ data: { accountId: ids.account, userId: ids.user, profileId: ids.profile, consentType: "privacy", textVersion: "sentinel", evidenceJson: JSON.stringify(mark) } });
    await db.appNotification.create({ data: { userId: ids.user, title: mark.name, message: mark.health } });
    await db.passwordResetToken.create({ data: { email: mark.email, token: `${run}-reset`, expiresAt: new Date(Date.now() + 60_000) } });
    await db.order.create({ data: {
      id: ids.order, userId: ids.user, amount: "10.00", customerName: mark.name, customerEmail: mark.email,
      customerPhone: mark.phone, customerDocument: mark.document, shippingAddress: mark.address,
      shippingCity: mark.location, shippingNotes: mark.location,
      paymentProofUrl: `/api/image-proxy?bucket=payment-proofs&path=${encodeURIComponent(proofPath)}`,
      manualPaymentReference: mark.proof, orderNumber: `${run}-order-number`,
    } });
    await db.paymentAttempt.create({ data: { id: ids.attempt, orderId: ids.order, providerOrderId: `${run}-provider`, idempotencyKey: `${run}-pay`, amount: "10.00", expiresAt: new Date(Date.now() + 60_000), checkoutSessionJson: JSON.stringify(mark) } });
    await db.paymentEvent.create({ data: { paymentAttemptId: ids.attempt, providerEventId: `${run}-event`, eventType: "created", payloadJson: JSON.stringify(mark) } });
    await db.invoice.create({ data: { id: ids.invoice, orderId: ids.order, sourcePaymentAttemptId: ids.attempt, internalNumber: `${run}-invoice`, status: "pending_configuration", subtotal: "10.00", total: "10.00", buyerName: mark.name, buyerEmail: mark.email, buyerDocument: mark.document, buyerPhone: mark.phone, buyerAddress: mark.address } });
    await db.operationDispatch.create({ data: { id: ids.dispatch, code: `${run}-dispatch`, destinationName: mark.name, destinationReference: mark.document, destinationAddress: mark.address, notes: mark.location } });
    await db.operationDispatchEvent.create({ data: { dispatchId: ids.dispatch, eventType: "CREATED", referenceType: "order", referenceId: ids.order, createdById: ids.user, reason: mark.location, metadataJson: JSON.stringify(mark) } });
    await db.operationCommercialOrder.create({ data: { id: ids.commercial, code: `${run}-commercial`, sourceType: "checkout", sourceId: ids.order, customerName: mark.name, customerEmail: mark.email, customerPhone: mark.phone, customerReference: mark.document, dispatchId: ids.dispatch, notes: mark.location, totalAmount: "10.00" } });
    await db.operationCommercialOrderEvent.create({ data: { commercialOrderId: ids.commercial, eventType: "CREATED", createdById: ids.user, reason: mark.location, metadataJson: JSON.stringify(mark) } });
    await db.auditLog.create({ data: { accountId: ids.account, actorUserId: ids.user, entityType: "Profile", entityId: ids.profile, action: "update", oldValuesJson: JSON.stringify(mark), newValuesJson: JSON.stringify(mark) } });
    await db.commerceOrderSyncOutbox.create({ data: { eventType: "commerce.order.sync_requested", sourceType: "checkout", sourceId: ids.order, deduplicationKey: `${run}-outbox`, payloadVersion: 1, payloadJson: JSON.stringify(mark), status: "processed", processedAt: new Date() } });
  });

  afterAll(async () => db.$disconnect());

  it("erases PII and external identity while retaining only allowlisted private payment evidence", async () => {
    expect((await resolvePublicProfileByChipShortCode(shortCode)).ok).toBe(true);
    await expect(SafeDeleteService.deleteUserAccount(ids.user, ids.user)).resolves.toBe(true);

    const after = await resolvePublicProfileByChipShortCode(shortCode);
    expect(after.ok).toBe(false);
    expect(JSON.stringify(after)).not.toContain(mark.name);
    expect(await db.digitalPass.findUnique({ where: { profileId: ids.profile } })).toBeNull();
    expect(await db.contact.findUnique({ where: { id: ids.contact } })).toBeNull();
    expect(await db.scanEvent.count({ where: { chipId: ids.chip } })).toBe(0);
    expect(await db.notification.count({ where: { chipId: ids.chip } })).toBe(0);
    expect(await db.consent.count({ where: { userId: ids.user } })).toBe(0);
    expect(await db.passwordResetToken.count({ where: { email: mark.email } })).toBe(0);

    const chip = await db.chip.findUniqueOrThrow({ where: { id: ids.chip } });
    expect(chip.status).toBe("deactivated");
    expect(chip.ownerUserId).toBeNull();
    expect(chip.assignedProfileId).toBeNull();
    expect(chip.lastScanLocation).toBeNull();
    expect(external.auth).toEqual([]);

    expect([...(external.storage.get("general") ?? new Set())]).toEqual([]);
    expect([...(external.storage.get("profile-photos") ?? new Set())]).toEqual([]);
    expect([...(external.storage.get("payment-proofs") ?? new Set())]).toEqual([proofPath]);

    const cleanupRows = await db.storageCleanupOutbox.findMany({ where: { status: "cleaned", createdAt: { gte: new Date(Date.now() - 60_000) } } });
    expect(cleanupRows.length).toBeGreaterThanOrEqual(2);
    expect(cleanupRows.every((row) => row.bucket === "erased" && row.actorUserId === null && row.accountId === null)).toBe(true);
    expect(await publicResidues()).toEqual([]);
  }, 30_000);
});
