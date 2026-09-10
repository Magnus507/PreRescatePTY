import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";
import {
  assertIntegrationDatabaseReady,
  createIntegrationPrismaClient,
  prepareIntegrationEnvironment,
} from "./integration-db";

const externalState = vi.hoisted(() => ({
  authUsers: [] as Array<{ id: string; email: string }>,
  storage: new Map<string, Set<string>>(),
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    auth: {
      admin: {
        listUsers: vi.fn(async ({ page, perPage }: { page: number; perPage: number }) => {
          const start = (page - 1) * perPage;
          return { data: { users: externalState.authUsers.slice(start, start + perPage) }, error: null };
        }),
        deleteUser: vi.fn(async (id: string) => {
          const before = externalState.authUsers.length;
          externalState.authUsers = externalState.authUsers.filter((user) => user.id !== id);
          return before === externalState.authUsers.length
            ? { data: null, error: new Error("not_found") }
            : { data: {}, error: null };
        }),
      },
    },
    storage: {
      from: (bucket: string) => ({
        list: vi.fn(async (prefix: string, options: { limit: number; offset: number }) => {
          const entries = [...(externalState.storage.get(bucket) ?? new Set<string>())]
            .filter((path) => path.startsWith(`${prefix}/`))
            .map((path) => path.slice(prefix.length + 1))
            .filter((name) => !name.includes("/"))
            .sort()
            .slice(options.offset, options.offset + options.limit)
            .map((name) => ({ name }));
          return { data: entries, error: null };
        }),
        remove: vi.fn(async (paths: string[]) => {
          const objects = externalState.storage.get(bucket) ?? new Set<string>();
          for (const path of paths) objects.delete(path);
          externalState.storage.set(bucket, objects);
          return { data: [], error: null };
        }),
      }),
    },
  })),
}));

import { SafeDeleteService } from "@/domains/users/services/safe-delete.service";
import { resolvePublicProfileByChipShortCode } from "@/lib/public-access/resolve-public-profile-by-chip";

const db = createIntegrationPrismaClient();
const run = `b3sentinel${Date.now()}${Math.random().toString(36).slice(2, 8)}`;
const ids = {
  account: `${run}-account`,
  user: `${run}-user`,
  profile: `${run}-profile`,
  contact: `${run}-contact`,
  chip: `${run}-chip`,
  order: `${run}-order`,
  attempt: `${run}-attempt`,
  invoice: `${run}-invoice`,
  dispatch: `${run}-dispatch`,
  commercial: `${run}-commercial`,
};
const shortCode = `B3${Math.random().toString(36).slice(2, 9).toUpperCase()}`;
const marker = {
  firstName: `NOMBRE_${run}`,
  lastName: `APELLIDO_${run}`,
  email: `${run}@sentinel.invalid`,
  phone: `699${String(Date.now()).slice(-5)}`,
  document: `CEDULA_${run}`,
  address: `DIRECCION_${run}`,
  city: `CIUDAD_${run}`,
  allergy: `ALERGIA_${run}`,
  condition: `CONDICION_${run}`,
  medication: `MEDICINA_${run}`,
  location: `UBICACION_${run}`,
  contact: `CONTACTO_${run}`,
  contactEmail: `${run}.contact@sentinel.invalid`,
  proof: `PRUEBA_${run}`,
};
const piiMarkers = Object.values(marker);

function addStorage(bucket: string, path: string) {
  const values = externalState.storage.get(bucket) ?? new Set<string>();
  values.add(path);
  externalState.storage.set(bucket, values);
}

function quoteIdentifier(value: string) {
  return `"${value.replaceAll('"', '""')}"`;
}

async function findPublicTextResidues(markers: string[]) {
  const columns = await db.$queryRaw<Array<{ table_name: string; column_name: string }>>(Prisma.sql`
    SELECT table_name, column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND data_type IN ('text', 'character varying', 'json', 'jsonb')
      AND table_name <> '_prisma_migrations'
    ORDER BY table_name, ordinal_position
  `);

  const residues: Array<{ table: string; column: string; marker: string; count: number }> = [];
  for (const { table_name: table, column_name: column } of columns) {
    const sql = `SELECT count(*)::int AS count FROM ${quoteIdentifier(table)} WHERE CAST(${quoteIdentifier(column)} AS text) LIKE $1`;
    for (const value of markers) {
      const rows = await db.$queryRawUnsafe<Array<{ count: number }>>(sql, `%${value}%`);
      const count = Number(rows[0]?.count ?? 0);
      if (count > 0) residues.push({ table, column, marker: value, count });
    }
  }
  return residues;
}

describe("Block 3 privacy erasure sentinel", () => {
  beforeAll(async () => {
    prepareIntegrationEnvironment();
    await assertIntegrationDatabaseReady(db);

    externalState.authUsers = [{ id: `${run}-auth`, email: marker.email }];
    externalState.storage.clear();
    addStorage("profile-photos", `${ids.user}/${marker.proof}-photo.webp`);
    addStorage("payment-proofs", `payments/${ids.user}/${marker.proof}-payment.webp`);
    addStorage("general", `${ids.user}/${marker.proof}-orphan.webp`);

    await db.account.create({
      data: { id: ids.account, accountName: `${marker.firstName} household`, accountType: "personal" },
    });
    await db.user.create({
      data: {
        id: ids.user,
        accountId: ids.account,
        email: marker.email,
        phone: marker.phone,
        passwordHash: "$2a$10$block3sentinelhash",
      },
    });
    await db.account.update({ where: { id: ids.account }, data: { ownerUserId: ids.user } });
    await db.profile.create({
      data: {
        id: ids.profile,
        accountId: ids.account,
        userId: ids.user,
        firstName: marker.firstName,
        lastName: marker.lastName,
        displayNamePublic: `${marker.firstName} ${marker.lastName}`,
        bloodType: "O+",
        allergies: marker.allergy,
        chronicConditions: marker.condition,
        medications: marker.medication,
        additionalNotes: marker.location,
        phone: marker.phone,
        nationalId: marker.document,
        address: marker.address,
        city: marker.city,
        lastScanLocation: marker.location,
        safeReturnAddress: marker.address,
        safeReturnLocationName: marker.location,
        safeReturnContactName: marker.contact,
        safeReturnContactPhone: marker.phone,
        isInsured: true,
        insuranceProvider: `SEGURO_${run}`,
        insurancePolicyNumber: `POLIZA_${run}`,
        primaryDoctorName: `DOCTOR_${run}`,
        primaryDoctorPhone: marker.phone,
        photoUrl: `https://ci-test.supabase.co/storage/v1/object/public/profile-photos/${ids.user}/${marker.proof}-photo.webp`,
      },
    });
    await db.contact.create({
      data: { id: ids.contact, userId: ids.user, fullName: marker.contact, phone: marker.phone, email: marker.contactEmail },
    });
    await db.profileContact.create({
      data: { profileId: ids.profile, contactId: ids.contact, relationship: "Familiar" },
    });
    await db.chip.create({
      data: {
        id: ids.chip,
        shortCode,
        nfcUrl: `https://ci.test/e/${shortCode}`,
        qrUrl: `https://ci.test/e/${shortCode}`,
        serialPublic: `${run}-serial`,
        ownerUserId: ids.user,
        assignedProfileId: ids.profile,
        accountId: ids.account,
        status: "active",
        lastScanLocation: marker.location,
      },
    });
    await db.scanEvent.create({
      data: {
        chipId: ids.chip,
        profileId: ids.profile,
        accountId: ids.account,
        ipAddress: "203.0.113.45",
        userAgent: `UA_${run}`,
        address: marker.address,
        city: marker.city,
        rawMetadataJson: JSON.stringify({ location: marker.location, phone: marker.phone }),
      },
    });
    await db.notification.create({
      data: {
        chipId: ids.chip,
        eventId: `${run}-scan`,
        channel: "email",
        recipient: marker.email,
        idempotencyKey: `${run}-notification`,
        providerResponse: JSON.stringify({ recipient: marker.contactEmail }),
      },
    });
    await db.digitalPass.create({
      data: {
        profileId: ids.profile,
        passType: "apple",
        passUrl: `https://ci.test/pass/${marker.proof}`,
        serialNumber: `${run}-pass`,
        authToken: `TOKEN_${marker.proof}`,
      },
    });
    await db.consent.create({
      data: {
        accountId: ids.account,
        userId: ids.user,
        profileId: ids.profile,
        consentType: "privacy",
        textVersion: "sentinel-v1",
        ipAddress: "203.0.113.45",
        userAgent: `UA_${run}`,
        evidenceJson: JSON.stringify({ email: marker.email, address: marker.address }),
      },
    });
    await db.appNotification.create({
      data: { userId: ids.user, title: marker.firstName, message: marker.condition },
    });
    await db.passwordResetToken.create({
      data: { email: marker.email, token: `${run}-reset`, expiresAt: new Date(Date.now() + 60_000) },
    });
    await db.order.create({
      data: {
        id: ids.order,
        userId: ids.user,
        amount: "10.00",
        customerName: `${marker.firstName} ${marker.lastName}`,
        customerEmail: marker.email,
        customerPhone: marker.phone,
        customerDocument: marker.document,
        shippingAddress: marker.address,
        shippingCity: marker.city,
        shippingNotes: marker.location,
        paymentProofUrl: `https://ci-test.supabase.co/storage/v1/object/public/payment-proofs/payments/${ids.user}/${marker.proof}-payment.webp`,
        manualPaymentReference: marker.proof,
        orderNumber: `${run}-order-number`,
      },
    });
    await db.paymentAttempt.create({
      data: {
        id: ids.attempt,
        orderId: ids.order,
        providerOrderId: `${run}-provider-order`,
        idempotencyKey: `${run}-payment-idem`,
        amount: "10.00",
        expiresAt: new Date(Date.now() + 3_600_000),
        checkoutSessionJson: JSON.stringify({ email: marker.email, address: marker.address, medical: marker.condition }),
      },
    });
    await db.paymentEvent.create({
      data: {
        paymentAttemptId: ids.attempt,
        providerEventId: `${run}-provider-event`,
        eventType: "created",
        payloadJson: JSON.stringify({ email: marker.email, phone: marker.phone, proof: marker.proof }),
      },
    });
    await db.invoice.create({
      data: {
        id: ids.invoice,
        orderId: ids.order,
        sourcePaymentAttemptId: ids.attempt,
        internalNumber: `${run}-invoice-number`,
        status: "pending_configuration",
        subtotal: "10.00",
        total: "10.00",
        buyerName: `${marker.firstName} ${marker.lastName}`,
        buyerEmail: marker.email,
        buyerDocument: marker.document,
        buyerPhone: marker.phone,
        buyerAddress: marker.address,
      },
    });
    await db.operationDispatch.create({
      data: {
        id: ids.dispatch,
        code: `${run}-dispatch-code`,
        destinationName: `${marker.firstName} ${marker.lastName}`,
        destinationReference: marker.document,
        destinationAddress: marker.address,
        notes: marker.location,
      },
    });
    await db.operationDispatchEvent.create({
      data: {
        dispatchId: ids.dispatch,
        eventType: "CREATED",
        referenceType: "order",
        referenceId: ids.order,
        createdById: ids.user,
        reason: marker.location,
        metadataJson: JSON.stringify({ customerName: marker.firstName, customerPhone: marker.phone, shippingAddress: marker.address }),
      },
    });
    await db.operationCommercialOrder.create({
      data: {
        id: ids.commercial,
        code: `${run}-commercial-code`,
        sourceType: "checkout",
        sourceId: ids.order,
        customerName: `${marker.firstName} ${marker.lastName}`,
        customerEmail: marker.email,
        customerPhone: marker.phone,
        customerReference: marker.document,
        dispatchId: ids.dispatch,
        notes: marker.location,
        totalAmount: "10.00",
      },
    });
    await db.operationCommercialOrderEvent.create({
      data: {
        commercialOrderId: ids.commercial,
        eventType: "CREATED",
        createdById: ids.user,
        reason: marker.location,
        metadataJson: JSON.stringify({ customerEmail: marker.email, destinationAddress: marker.address }),
      },
    });
    await db.auditLog.create({
      data: {
        accountId: ids.account,
        actorUserId: ids.user,
        entityType: "Profile",
        entityId: ids.profile,
        action: "update",
        oldValuesJson: JSON.stringify({ firstName: marker.firstName, allergies: marker.allergy, location: marker.location }),
        newValuesJson: JSON.stringify({ email: marker.email, nationalId: marker.document, address: marker.address }),
      },
    });
    await db.commerceOrderSyncOutbox.create({
      data: {
        eventType: "commerce.order.sync_requested",
        sourceType: "checkout",
        sourceId: ids.order,
        deduplicationKey: `${run}-outbox`,
        payloadVersion: 1,
        payloadJson: JSON.stringify({ customerName: marker.firstName, contactEmail: marker.email, contactPhone: marker.phone, paymentReference: marker.proof }),
        status: "processed",
        processedAt: new Date(),
      },
    });
  });

  afterAll(async () => {
    await db.$disconnect();
  });

  it("propagates synthetic PII, SafeDeletes it, and leaves zero improper residue across DB, Storage, Auth and physical identifiers", async () => {
    const before = await resolvePublicProfileByChipShortCode(shortCode);
    expect(before.ok).toBe(true);
    if (before.ok) expect(before.profile.firstName).toBe(marker.firstName);

    await expect(SafeDeleteService.deleteUserAccount(ids.user, ids.user)).resolves.toBe(true);

    const after = await resolvePublicProfileByChipShortCode(shortCode);
    expect(after.ok).toBe(false);
    if (!after.ok) expect(["chip_not_active", "chip_unassigned", "profile_not_public"]).toContain(after.reason);
    expect(JSON.stringify(after)).not.toContain(marker.firstName);
    expect(JSON.stringify(after)).not.toContain(marker.condition);

    expect(await db.digitalPass.findUnique({ where: { profileId: ids.profile } })).toBeNull();
    expect(await db.contact.findUnique({ where: { id: ids.contact } })).toBeNull();
    expect(await db.scanEvent.count({ where: { chipId: ids.chip } })).toBe(0);
    expect(await db.notification.count({ where: { chipId: ids.chip } })).toBe(0);
    expect(await db.consent.count({ where: { userId: ids.user } })).toBe(0);
    expect(await db.appNotification.count({ where: { userId: ids.user } })).toBe(0);
    expect(await db.passwordResetToken.count({ where: { email: marker.email } })).toBe(0);

    const chip = await db.chip.findUniqueOrThrow({ where: { id: ids.chip } });
    expect(chip.status).toBe("deactivated");
    expect(chip.ownerUserId).toBeNull();
    expect(chip.assignedProfileId).toBeNull();
    expect(chip.lastScanLocation).toBeNull();

    const paymentAttempt = await db.paymentAttempt.findUniqueOrThrow({ where: { id: ids.attempt } });
    expect(paymentAttempt.checkoutSessionJson).toBeNull();
    const paymentEvents = await db.paymentEvent.findMany({ where: { paymentAttemptId: ids.attempt } });
    expect(paymentEvents.every((event) => event.payloadJson === "{}")).toBe(true);

    expect(externalState.authUsers).toEqual([]);
    for (const paths of externalState.storage.values()) {
      expect([...paths].some((path) => piiMarkers.some((value) => path.includes(value)))).toBe(false);
    }

    const cleanupRows = await db.storageCleanupOutbox.findMany({
      where: { status: "cleaned", createdAt: { gte: new Date(Date.now() - 60_000) } },
    });
    expect(cleanupRows.length).toBeGreaterThanOrEqual(3);
    for (const row of cleanupRows) {
      expect(row.bucket).toBe("erased");
      expect(row.actorUserId).toBeNull();
      expect(row.accountId).toBeNull();
      expect(piiMarkers.some((value) => row.path.includes(value) || row.objectKey.includes(value))).toBe(false);
    }

    const residues = await findPublicTextResidues(piiMarkers);
    expect(residues).toEqual([]);
  }, 30_000);
});
