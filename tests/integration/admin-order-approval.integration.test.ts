import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { createIntegrationPrismaClient, prepareIntegrationEnvironment, seedIntegrationUser, assertIntegrationDatabaseReady } from "./integration-db";

const mockGetServerSession = vi.hoisted(() => vi.fn());
const mockRateLimit = vi.hoisted(() => vi.fn());

vi.mock("next-auth", () => ({
  getServerSession: mockGetServerSession,
}));

vi.mock("@/lib/rateLimit", () => ({
  rateLimit: mockRateLimit,
}));

vi.mock("@/domains/accounts/services/account-state.service", () => ({
  AccountStateService: {
    invalidateCache: vi.fn().mockResolvedValue(undefined),
  },
}));

const db = createIntegrationPrismaClient();
const RUN_ID = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

let POST: typeof import("@/app/api/admin/orders/[id]/approve/route").POST;

function createApproveRequest(orderId: string) {
  return new NextRequest(`http://localhost/api/admin/orders/${orderId}/approve`, {
    method: "POST",
    body: JSON.stringify({ adminReviewNotes: "Aprobación de prueba", assignedChipIds: [] }),
  });
}

describe("PostgreSQL integration: admin approval concurrency", () => {
  beforeAll(async () => {
    prepareIntegrationEnvironment();
    await assertIntegrationDatabaseReady(db);
    ({ POST } = await import("@/app/api/admin/orders/[id]/approve/route"));
  });

  beforeEach(() => {
    mockGetServerSession.mockReset();
    mockRateLimit.mockReset();
    mockRateLimit.mockResolvedValue({ allowed: true, remaining: 1, resetAt: Date.now() + 1000 });
    mockGetServerSession.mockResolvedValue({
      user: {
        id: `admin-user-${RUN_ID}`,
        email: `admin-${RUN_ID}@test.local`,
        role: "admin",
        adminRole: "admin",
        accountId: null,
        sessionVersion: 0,
      },
    });
  });

  afterAll(async () => {
    await db.$disconnect();
  });

  it("approves the same manual order concurrently without duplicating the reserved unit", async () => {
    const account = await db.account.create({
      data: {
        accountName: "Cuenta de prueba",
        accountType: "personal",
        status: "active",
        maxChipsAllocated: 1,
        maxProfilesAllocated: 1,
      },
    });

    await seedIntegrationUser(db, {
      id: `admin-user-${RUN_ID}`,
      email: `admin-${RUN_ID}@test.local`,
      passwordHash: "$2a$10$ADMIN",
      role: "admin",
      status: "active",
      accountId: account.id,
      isAdmin: true,
      adminRole: "admin",
      sessionVersion: 0,
    });

    const manualOrder = await db.order.create({
      data: {
        id: `manual-order-${RUN_ID}`,
        amount: "25.00",
        currency: "USD",
        paymentStatus: "under_review",
        provider: "manual",
        customerEmail: `buyer-${RUN_ID}@test.local`,
        customerName: "Buyer",
        orderNumber: `ORD-MANUAL-${RUN_ID}`,
        orderStatus: "pending",
        paymentMethod: "manual",
        adminReviewStatus: "pending",
        orderType: "manual",
        userId: `admin-user-${RUN_ID}`,
      },
      select: { id: true },
    });

    const commercialOrder = await db.operationCommercialOrder.create({
      data: {
        code: `OP-LEGACY-${RUN_ID}`,
        sourceType: "legacy_order",
        sourceId: manualOrder.id,
        status: "draft",
        customerType: "customer",
        salesChannel: "admin",
        paymentStatus: "pending",
        fulfillmentStatus: "pending",
        totalAmount: "25.00",
        currency: "USD",
        notes: `[sourceType:legacy_order][sourceId:${manualOrder.id}]`,
        items: {
          create: [{
            productName: "Producto Reserva",
            quantity: 1,
            unitPrice: "25.00",
            totalPrice: "25.00",
            productCode: "PRD-RES-1",
            unit: "unit",
          }],
        },
      },
      select: { id: true },
    });

    expect(commercialOrder.id).toBeTruthy();

    const reserveUnit = await db.operationFinishedGoodUnit.create({
      data: {
        internalLabel: `FG-${RUN_ID}`,
        productCode: "PRD-RES-1",
        productName: "Producto Reserva",
        productType: "PRD-RES-1",
        status: "available",
        qaStatus: "passed",
        activationStatus: "not_activated",
      },
      select: { id: true },
    });

    const [first, second] = await Promise.all([
      POST(createApproveRequest(manualOrder.id), { params: Promise.resolve({ id: manualOrder.id }) }),
      POST(createApproveRequest(manualOrder.id), { params: Promise.resolve({ id: manualOrder.id }) }),
    ]);

    const [firstJson, secondJson] = await Promise.all([first.json(), second.json()]);
    const reservedUnits = await db.operationFinishedGoodUnit.findMany({
      where: { id: reserveUnit.id, reservedOrderId: manualOrder.id, status: "reserved" },
      select: { id: true, reservedOrderId: true },
    });
    const refreshedOrder = await db.order.findUnique({
      where: { id: manualOrder.id },
      select: { paymentStatus: true, orderStatus: true, adminReviewStatus: true },
    });

    expect([first.status, second.status].every((status) => [200, 400].includes(status))).toBe(true);
    expect([firstJson.success, secondJson.success].filter(Boolean).length).toBeGreaterThanOrEqual(1);
    expect(refreshedOrder?.paymentStatus).toBe("paid");
    expect(refreshedOrder?.orderStatus).toBe("processing");
    expect(refreshedOrder?.adminReviewStatus).toBe("approved");
    expect(reservedUnits).toHaveLength(1);
  });
});
