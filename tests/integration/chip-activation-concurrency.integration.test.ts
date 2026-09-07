import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { createIntegrationPrismaClient, prepareIntegrationEnvironment, seedIntegrationUser, assertIntegrationDatabaseReady } from "./integration-db";
import { protectActivationCode } from "@/domains/chips/activation-code.service";

const session = vi.hoisted(() => vi.fn());
const state = vi.hoisted(() => vi.fn());
vi.mock("next-auth", () => ({ getServerSession: session }));
vi.mock("@/lib/rateLimit", () => ({ rateLimit: vi.fn().mockResolvedValue({ allowed: true }) }));
vi.mock("@/domains/accounts/services/account-state.service", () => ({ AccountStateService: {
  getAccountState: state,
  isMedicalProfileComplete: (profile: { firstName?: string; lastName?: string; bloodType?: string } | null) => Boolean(profile?.firstName && profile.lastName && profile.bloodType),
  invalidateCache: vi.fn().mockResolvedValue(undefined),
} }));

const db = createIntegrationPrismaClient();
const run = `activation-${Date.now()}`;
let POST: typeof import("@/app/api/chips/activate/route").POST;
let corporatePOST: typeof import("@/app/api/organizations/corporate-chip/activate/route").POST;
async function fixture(suffix: string, chipCount: number) {
  const account = await db.account.create({ data: { accountName: `${run}-${suffix}`, maxChipsAllocated: 1 } });
  const user = await seedIntegrationUser(db, { id: `${run}-${suffix}`, email: `${run}-${suffix}@example.invalid`, accountId: account.id });
  const profile = await db.profile.create({ data: { userId: user.id, accountId: account.id, firstName: "Synthetic", lastName: "Activation", bloodType: "O+" } });
  session.mockResolvedValue({ user: { id: user.id, accountId: account.id, role: "owner", sessionVersion: 0 } });
  state.mockResolvedValue({ accountId: account.id, serviceStatus: "active", serviceDurationMonths: 12 });
  const chips = [];
  for (let n = 0; n < chipCount; n++) {
    const key = `${run}-${suffix}-${n}`;
    const chip = await db.chip.create({ data: { shortCode: key, serialPublic: key, qrUrl: "/test", nfcUrl: "/test", status: "sold" } });
    const token = await db.chipClaimToken.create({ data: { chipId: chip.id, ...protectActivationCode(key), expiresAt: null } });
    const unit = await db.operationFinishedGoodUnit.create({ data: { internalLabel: key, chipId: chip.id, productCode: key, productName: "Synthetic", productType: "test", status: "delivered", qaStatus: "passed", activationStatus: "not_activated" } });
    chips.push({ chip, token, unit, key });
  }
  return { account, user, profile, chips };
}
function activate(code: string) {
  return POST(new NextRequest("http://localhost/api/chips/activate", { method: "POST", body: JSON.stringify({ activationCode: code }) }));
}

async function corporateFixture(suffix: string) {
  const f = await fixture(`corporate-${suffix}`, 1);
  const organization = await db.organization.create({ data: { accountId: f.account.id, legalName: "Synthetic company" } });
  const corporateProfile = await db.profile.create({ data: { accountId: f.account.id, profileType: "corporate", firstName: "Synthetic", lastName: "Employee", bloodType: "O+" } });
  const member = await db.organizationMember.create({ data: { organizationId: organization.id, profileId: f.profile.id, corporateProfileId: corporateProfile.id, corporateStatus: "paid_active" } });
  const product = await db.product.create({ data: { name: "Synthetic corporate package", price: 25 } });
  const order = await db.order.create({ data: { userId: f.user.id, amount: 25, paymentStatus: "paid", organizationId: organization.id } });
  const item = await db.corporateOrderEmployeeItem.create({ data: { orderId: order.id, organizationMemberId: member.id, productId: product.id, unitPrice: 25, subtotal: 25, fulfillmentStatus: "delivered", deliveryStatus: "delivered" } });
  await db.chip.update({ where: { id: f.chips[0].chip.id }, data: { internalLabel: f.chips[0].key } });
  return { ...f, corporateProfile, item };
}

function activateCorporate(code: string) {
  return corporatePOST(new NextRequest("http://localhost/api/organizations/corporate-chip/activate", { method: "POST", body: JSON.stringify({ activationCode: code }) }));
}

describe("PostgreSQL: activation races and rollback", () => {
  beforeAll(async () => {
    prepareIntegrationEnvironment();
    await assertIntegrationDatabaseReady(db);
    ({ POST } = await import("@/app/api/chips/activate/route"));
    ({ POST: corporatePOST } = await import("@/app/api/organizations/corporate-chip/activate/route"));
  });
  afterAll(async () => { await db.$disconnect(); });

  it("20 requests activate the same chip exactly once", async () => {
    const f = await fixture("same", 1);
    const results = await Promise.all(Array.from({ length: 20 }, () => activate(f.chips[0].key)));
    expect(results.filter(r => r.status === 200)).toHaveLength(1);
    expect(results.filter(r => [400, 409].includes(r.status))).toHaveLength(19);
    expect(await db.chip.count({ where: { id: f.chips[0].chip.id, status: "activated", assignedProfileId: f.profile.id, ownerUserId: f.user.id } })).toBe(1);
    expect(await db.operationFinishedGoodUnitEvent.count({ where: { unitId: f.chips[0].unit.id, eventType: "ACTIVATED" } })).toBe(1);
    expect((await db.chipClaimToken.findUniqueOrThrow({ where: { id: f.chips[0].token.id } })).usedAt).not.toBeNull();
    console.log(JSON.stringify({ test: "same chip activation", requests: 20, success: 1, rejected: 19, duplicates: 0, invariant: "PASS" }));
  });

  it("individual codes activate concurrently with zero plan capacity", async () => {
    const f = await fixture("capacity", 2);
    await db.account.update({ where: { id: f.account.id }, data: { maxChipsAllocated: 0 } });
    const results = await Promise.all(f.chips.map(c => activate(c.key)));
    expect(results.map(r => r.status)).toEqual([200, 200]);
    expect(await db.chip.count({ where: { accountId: f.account.id, status: "activated" } })).toBe(2);
  });

  it("buyer A gifts to B; two different accounts race and only the winner owns the unit", async () => {
    const a = await fixture("buyer", 1);
    const b = await fixture("recipient", 0);
    const order = await db.order.create({ data: { userId: a.user.id, amount: 25, paymentStatus: "paid", orderStatus: "completed" } });
    await db.operationFinishedGoodUnit.update({ where: { id: a.chips[0].unit.id }, data: { reservedOrderId: order.id } });
    await db.account.update({ where: { id: b.account.id }, data: { maxChipsAllocated: 0 } });
    // Identity follows each invocation, not a shared mutable session.
    session.mockResolvedValueOnce({ user: { id: b.user.id } }).mockResolvedValueOnce({ user: { id: a.user.id } });
    state.mockImplementation(async (userId: string) => ({ accountId: userId === b.user.id ? b.account.id : a.account.id, serviceStatus: "active", serviceDurationMonths: 12 }));
    const results = await Promise.all([activate(a.chips[0].key), activate(a.chips[0].key)]);
    expect(results.filter(r => r.status === 200)).toHaveLength(1);
    const winner = results[0].status === 200 ? b : a;
    const chip = await db.chip.findUniqueOrThrow({ where: { id: a.chips[0].chip.id } });
    expect(chip.ownerUserId).toBe(winner.user.id);
    expect(chip.accountId).toBe(winner.account.id);
    expect(chip.assignedProfileId).toBe(winner.profile.id);
    expect((await activate(a.chips[0].key)).status).toBe(409);
    expect(await db.operationFinishedGoodUnitEvent.count({ where: { unitId: a.chips[0].unit.id, eventType: "ACTIVATED" } })).toBe(1);
  });

  it("recipient B alone can activate a unit bought by A", async () => {
    const a = await fixture("gift-buyer", 1);
    const b = await fixture("gift-recipient", 0);
    const order = await db.order.create({ data: { userId: a.user.id, amount: 25, paymentStatus: "paid", orderStatus: "completed" } });
    await db.operationFinishedGoodUnit.update({ where: { id: a.chips[0].unit.id }, data: { reservedOrderId: order.id } });
    await db.account.update({ where: { id: b.account.id }, data: { maxChipsAllocated: 0 } });
    expect((await activate(a.chips[0].key)).status).toBe(200);
    expect((await db.chip.findUniqueOrThrow({ where: { id: a.chips[0].chip.id } })).ownerUserId).toBe(b.user.id);
    expect((await db.operationFinishedGoodUnit.findUniqueOrThrow({ where: { id: a.chips[0].unit.id } })).reservedOrderId).toBe(order.id);
  });

  it.each(["reserved", "available", "qa_failed", "activated"] as const)("rejects non-activable unit %s without consuming its code", async status => {
    const f = await fixture(`invalid-${status}`, 1);
    await db.operationFinishedGoodUnit.update({ where: { id: f.chips[0].unit.id }, data: { status } });
    expect((await activate(f.chips[0].key)).status).toBe(409);
    expect((await db.chipClaimToken.findUniqueOrThrow({ where: { id: f.chips[0].token.id } })).usedAt).toBeNull();
    expect((await db.chip.findUniqueOrThrow({ where: { id: f.chips[0].chip.id } })).ownerUserId).toBeNull();
  });

  it("a previously activated chip cannot be taken over even with an inconsistent sold status", async () => {
    const f = await fixture("no-takeover", 1);
    await db.chip.update({ where: { id: f.chips[0].chip.id }, data: { activatedAt: new Date(), ownerUserId: f.user.id } });
    expect((await activate(f.chips[0].key)).status).toBe(400);
    expect((await db.chipClaimToken.findUniqueOrThrow({ where: { id: f.chips[0].token.id } })).usedAt).toBeNull();
  });

  it("rejects a revoked token without changing the chip", async () => {
    const f = await fixture("revoked", 1);
    await db.chipClaimToken.update({ where: { id: f.chips[0].token.id }, data: { status: "revoked" } });
    expect((await activate(f.chips[0].key)).status).toBe(404);
    expect((await db.chip.findUniqueOrThrow({ where: { id: f.chips[0].chip.id } })).status).toBe("sold");
  });

  it("corporate capacity remains enforced with transaction rollback", async () => {
    const f = await corporateFixture("zero-capacity");
    await db.account.update({ where: { id: f.account.id }, data: { maxChipsAllocated: 0 } });
    expect((await activateCorporate(f.chips[0].key)).status).toBe(409);
    expect((await db.chipClaimToken.findUniqueOrThrow({ where: { id: f.chips[0].token.id } })).usedAt).toBeNull();
  });

  it("20 corporate requests activate one chip, item and physical unit exactly once", async () => {
    const f = await corporateFixture("race");
    const results = await Promise.all(Array.from({ length: 20 }, () => activateCorporate(f.chips[0].key)));
    expect(results.filter(r => r.status === 200)).toHaveLength(1);
    expect(results.filter(r => r.status === 409)).toHaveLength(19);
    expect(await db.chip.count({ where: { id: f.chips[0].chip.id, status: "activated", assignedProfileId: f.corporateProfile.id, ownerUserId: f.user.id } })).toBe(1);
    expect(await db.corporateOrderEmployeeItem.count({ where: { id: f.item.id, fulfillmentStatus: "activated", chipId: f.chips[0].chip.id } })).toBe(1);
    expect(await db.operationFinishedGoodUnitEvent.count({ where: { unitId: f.chips[0].unit.id, eventType: "ACTIVATED" } })).toBe(1);
    expect((await db.chipClaimToken.findUniqueOrThrow({ where: { id: f.chips[0].token.id } })).usedAt).not.toBeNull();
    console.log(JSON.stringify({ test: "corporate activation", requests: 20, success: 1, rejected: 19, duplicates: 0, invariant: "PASS" }));
  });

  it("corporate physical-unit failure rolls back the preceding token, chip and item writes", async () => {
    const f = await corporateFixture("rollback");
    await db.operationFinishedGoodUnit.update({ where: { id: f.chips[0].unit.id }, data: { status: "qa_failed" } });
    expect((await activateCorporate(f.chips[0].key)).status).toBe(409);
    expect((await db.chipClaimToken.findUniqueOrThrow({ where: { id: f.chips[0].token.id } })).usedAt).toBeNull();
    const chip = await db.chip.findUniqueOrThrow({ where: { id: f.chips[0].chip.id } });
    expect(chip.status).toBe("sold");
    expect(chip.ownerUserId).toBeNull();
    expect(chip.assignedProfileId).toBeNull();
    const item = await db.corporateOrderEmployeeItem.findUniqueOrThrow({ where: { id: f.item.id } });
    expect(item.chipId).toBeNull();
    expect(item.fulfillmentStatus).toBe("delivered");
    expect(await db.operationFinishedGoodUnitEvent.count({ where: { unitId: f.chips[0].unit.id } })).toBe(0);
    expect(await db.auditLog.count({ where: { entityId: chip.id, action: "activate" } })).toBe(0);
  });

  it("rejects a corporate profile from another account without consuming the activation", async () => {
    const f = await corporateFixture("tenant");
    const otherAccount = await db.account.create({ data: { accountName: "Synthetic other tenant" } });
    await db.profile.update({ where: { id: f.corporateProfile.id }, data: { accountId: otherAccount.id } });
    expect((await activateCorporate(f.chips[0].key)).status).toBe(403);
    expect((await db.chipClaimToken.findUniqueOrThrow({ where: { id: f.chips[0].token.id } })).usedAt).toBeNull();
    expect((await db.chip.findUniqueOrThrow({ where: { id: f.chips[0].chip.id } })).status).toBe("sold");
  });
});
