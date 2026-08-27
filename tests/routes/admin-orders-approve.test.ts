import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { mockPrisma } from '../helpers/mock-prisma'
import { resetAllMocks } from '../helpers/reset-mocks'
import { createMockSession } from '../helpers/mock-auth'

vi.mock('next-auth', () => ({ getServerSession: vi.fn() }))
vi.mock('@/lib/auth', () => ({ authOptions: {} }))
vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }))

const mockRateLimit = vi.hoisted(() => vi.fn())
const mockInvalidateCache = vi.hoisted(() => vi.fn())
const mockNormalizeAssignedChipIds = vi.hoisted(() => vi.fn())
const mockCalculatePurchasedChips = vi.hoisted(() => vi.fn())
const mockCalculateCapacityIncrement = vi.hoisted(() => vi.fn())
const mockWasOrderAlreadyApproved = vi.hoisted(() => vi.fn())
const mockApplyCapacityIfFirstApproval = vi.hoisted(() => vi.fn())
const mockReserveAssignedChipsForOrder = vi.hoisted(() => vi.fn())
const mockReserveCommercialOrderStock = vi.hoisted(() => vi.fn())
const mockEnsurePendingInvoice = vi.hoisted(() => vi.fn())
const mockEnsureCustomerBackorderProduction = vi.hoisted(() => vi.fn())
const mockSyncRealOrderToOperations = vi.hoisted(() => vi.fn())

vi.mock('@/lib/rateLimit', () => ({ rateLimit: mockRateLimit }))
vi.mock('@/domains/accounts/services/account-state.service', () => ({
  AccountStateService: { invalidateCache: mockInvalidateCache },
}))
vi.mock('@/domains/orders/services/order-fulfillment.service', () => ({
  OrderFulfillmentService: {
    normalizeAssignedChipIds: mockNormalizeAssignedChipIds,
    calculatePurchasedChips: mockCalculatePurchasedChips,
    calculateCapacityIncrement: mockCalculateCapacityIncrement,
    wasOrderAlreadyApproved: mockWasOrderAlreadyApproved,
    applyCapacityIfFirstApproval: mockApplyCapacityIfFirstApproval,
    reserveAssignedChipsForOrder: mockReserveAssignedChipsForOrder,
  },
}))
vi.mock('@/lib/operations/commercial-order-reservation', () => ({
  reserveCommercialOrderStock: mockReserveCommercialOrderStock,
}))
vi.mock('@/lib/operations/customer-order-production', () => ({
  ensureCustomerBackorderProduction: mockEnsureCustomerBackorderProduction,
}))
vi.mock('@/lib/operations/sync-real-order-to-operations', () => ({
  syncRealOrderToOperations: mockSyncRealOrderToOperations,
}))
vi.mock('@/domains/invoices/services/invoice.service', () => ({
  InvoiceService: { ensurePendingForPaidOrder: mockEnsurePendingInvoice },
}))

import { POST } from '@/app/api/admin/orders/[id]/approve/route'
import { getServerSession } from 'next-auth'

const TEST_ADMIN_ID = 'admin-1'
const TEST_USER_ID = 'test-user-1'
const TEST_ACCOUNT_ID = 'test-account-id'
const TEST_ORDER_ID = 'order-1'
const TEST_PACKAGE_ID = 'pkg_123'

function routeParams(orderId: string = TEST_ORDER_ID) {
  return { params: Promise.resolve({ id: orderId }) }
}

function createApproveRequest(body: Record<string, unknown> = {}) {
  return new NextRequest(`http://localhost/api/admin/orders/${TEST_ORDER_ID}/approve`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

function createEligibleOrder(overrides: Record<string, unknown> = {}) {
  return {
    id: TEST_ORDER_ID,
    orderNumber: 'PR-TEST-001',
    userId: TEST_USER_ID,
    provider: 'manual',
    providerReference: null,
    paymentStatus: 'under_review',
    orderStatus: 'processing',
    adminReviewStatus: 'pending',
    adminReviewNotes: null,
    adminReviewedAt: null,
    updatedAt: new Date(),
    orderType: 'manual',
    packageId: TEST_PACKAGE_ID,
    customerName: 'Cliente Test',
    customerEmail: 'cliente@example.com',
    customerPhone: '60000000',
    manualPaymentReference: null,
    paymentProofUrl: null,
    currency: 'USD',
    amount: 25,
    items: [{
      id: 'item-1',
      profileId: null,
      chipId: null,
      productId: null,
      productType: 'sticker_prerescatepty',
      productCode: 'PRP-FG-STICKER',
      productName: 'Sticker PreRescatePTY',
      quantity: 1,
      unitPrice: 25,
      operationalFinishedGoodId: null,
      operationalMappingId: null,
      operationalProductCode: 'PRP-FG-STICKER',
      operationalProductName: 'Sticker PreRescatePTY',
    }],
    corporateEmployeeItems: [],
    ...overrides,
  }
}

function setupUserLookup() {
  mockPrisma.user.findUnique.mockImplementation(async (args: { where: { id: string } }) => {
    if (args.where.id === TEST_ADMIN_ID) {
      return {
        id: TEST_ADMIN_ID,
        status: 'active',
        role: 'admin',
        adminRole: 'admin',
        isAdmin: true,
        accountId: null,
        sessionVersion: 0,
        deletedAt: null,
      } as never
    }
    if (args.where.id === TEST_USER_ID) {
      return {
        id: TEST_USER_ID,
        status: 'active',
        role: 'owner',
        adminRole: null,
        isAdmin: false,
        accountId: TEST_ACCOUNT_ID,
        sessionVersion: 0,
        deletedAt: null,
      } as never
    }
    if (args.where.id === 'user-1') {
      return {
        id: 'user-1',
        status: 'active',
        role: 'owner',
        adminRole: null,
        isAdmin: false,
        accountId: 'owner-account',
        sessionVersion: 0,
        deletedAt: null,
      } as never
    }
    return null as never
  })
}

function setupDefaultMocks(orderOverrides: Record<string, unknown> = {}) {
  const order = createEligibleOrder(orderOverrides)
  vi.mocked(getServerSession).mockResolvedValue(
    createMockSession({ id: TEST_ADMIN_ID, role: 'admin' }) as never
  )
  mockRateLimit.mockResolvedValue({ allowed: true })
  mockNormalizeAssignedChipIds.mockReturnValue([])
  mockCalculatePurchasedChips.mockReturnValue(1)
  mockCalculateCapacityIncrement.mockReturnValue({ maxChips: 5, maxProfiles: 3 })
  mockWasOrderAlreadyApproved.mockReturnValue(false)
  mockApplyCapacityIfFirstApproval.mockReturnValue({ maxChipsAllocated: 5, maxProfilesAllocated: 3 })
  mockReserveAssignedChipsForOrder.mockResolvedValue(undefined)
  mockReserveCommercialOrderStock.mockResolvedValue({
    order: { id: 'commercial-order-auto', status: 'stock_reserved', paymentStatus: 'paid', fulfillmentStatus: 'reserved' },
    reservedUnits: [],
    missingItems: [],
    summary: { requestedQty: 1, reservedQty: 1, missingQty: 0, status: 'stock_reserved' },
  })
  mockEnsureCustomerBackorderProduction.mockResolvedValue({ id: 'production-1' })
  mockSyncRealOrderToOperations.mockResolvedValue({
    order: { id: 'commercial-order-auto' },
    created: true,
    sourceKey: `checkout:${TEST_ORDER_ID}`,
  })
  mockEnsurePendingInvoice.mockResolvedValue({ id: 'invoice-1' })
  mockInvalidateCache.mockResolvedValue(undefined)

  mockPrisma.order.findUnique.mockResolvedValue(order as never)
  mockPrisma.operationCommercialOrder.findFirst.mockResolvedValue(null as never)
  setupUserLookup()
  mockPrisma.package.findUnique.mockResolvedValue({
    id: TEST_PACKAGE_ID,
    name: 'Plan Básico',
    price: 49.99,
    isActive: true,
    accountType: 'personal',
    maxChips: 5,
    maxProfiles: 3,
  } as never)
  mockPrisma.order.update.mockImplementation(async (args: { data: Record<string, unknown> }) => ({
    ...order,
    ...args.data,
  }) as never)
  mockPrisma.account.findUnique.mockResolvedValue({
    id: TEST_ACCOUNT_ID,
    maxChipsAllocated: 1,
    maxProfilesAllocated: 1,
  } as never)
  mockPrisma.account.update.mockResolvedValue({ id: TEST_ACCOUNT_ID } as never)
  mockPrisma.auditLog.create.mockResolvedValue({} as never)
  mockPrisma.$transaction.mockImplementation(async (callback: (tx: typeof mockPrisma) => Promise<unknown>) => callback(mockPrisma))
}

describe('POST /api/admin/orders/[id]/approve', () => {
  beforeEach(() => {
    resetAllMocks()
    for (const mock of [
      mockRateLimit,
      mockInvalidateCache,
      mockNormalizeAssignedChipIds,
      mockCalculatePurchasedChips,
      mockCalculateCapacityIncrement,
      mockWasOrderAlreadyApproved,
      mockApplyCapacityIfFirstApproval,
      mockReserveAssignedChipsForOrder,
      mockReserveCommercialOrderStock,
      mockEnsurePendingInvoice,
      mockEnsureCustomerBackorderProduction,
      mockSyncRealOrderToOperations,
    ]) mock.mockReset()
    setupUserLookup()
  })

  it('denies users without an allowed admin role', async () => {
    vi.mocked(getServerSession).mockResolvedValue(createMockSession({ id: 'user-1', role: 'owner' }) as never)
    const res = await POST(createApproveRequest(), routeParams())
    expect(res.status).toBe(403)
  })

  it('returns 429 when the admin rate limit is exceeded', async () => {
    setupDefaultMocks()
    mockRateLimit.mockResolvedValue({ allowed: false })
    const res = await POST(createApproveRequest(), routeParams())
    expect(res.status).toBe(429)
  })

  it('returns 404 when the manual order does not exist', async () => {
    setupDefaultMocks()
    mockPrisma.order.findUnique.mockResolvedValue(null as never)
    const res = await POST(createApproveRequest(), routeParams())
    expect(res.status).toBe(404)
  })

  it('does not reapprove an already approved order', async () => {
    setupDefaultMocks({ adminReviewStatus: 'approved', paymentStatus: 'paid' })
    const res = await POST(createApproveRequest(), routeParams())
    expect(res.status).toBe(400)
  })

  it('does not approve a rejected order', async () => {
    setupDefaultMocks({ adminReviewStatus: 'rejected', paymentStatus: 'rejected' })
    const res = await POST(createApproveRequest(), routeParams())
    expect(res.status).toBe(400)
  })

  it('rejects an order that is not in an approvable state', async () => {
    setupDefaultMocks({ paymentStatus: 'pending', orderStatus: 'pending' })
    const res = await POST(createApproveRequest(), routeParams())
    expect(res.status).toBe(400)
  })

  it('rejects a package order when its package is missing or inactive', async () => {
    setupDefaultMocks()
    mockPrisma.package.findUnique.mockResolvedValue(null as never)
    const res = await POST(createApproveRequest(), routeParams())
    const json = await res.json()
    expect(res.status).toBe(400)
    expect(json.error).toMatch(/paquete/i)
  })

  it('approves a package order, updates capacity and records the audit inside one transaction', async () => {
    setupDefaultMocks()
    const res = await POST(createApproveRequest(), routeParams())
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.orderId).toBe(TEST_ORDER_ID)
    expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1)
    expect(mockPrisma.order.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: TEST_ORDER_ID },
      data: expect.objectContaining({ paymentStatus: 'paid', orderStatus: 'processing', adminReviewStatus: 'approved' }),
    }))
    expect(mockPrisma.account.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: TEST_ACCOUNT_ID },
      data: expect.objectContaining({ packageId: TEST_PACKAGE_ID, maxChipsAllocated: 5, maxProfilesAllocated: 3 }),
    }))
    expect(mockReserveAssignedChipsForOrder).toHaveBeenCalled()
    expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ action: 'order_approved', actorUserId: TEST_ADMIN_ID, entityId: TEST_ORDER_ID }),
    }))
    expect(mockInvalidateCache).toHaveBeenCalledWith(TEST_USER_ID)
  })

  it('synchronizes a direct store order before reserving physical stock when the operational order is not present yet', async () => {
    setupDefaultMocks({ packageId: null })
    const res = await POST(createApproveRequest(), routeParams())
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(mockSyncRealOrderToOperations).toHaveBeenCalledWith(mockPrisma, expect.objectContaining({
      sourceType: 'checkout',
      sourceId: TEST_ORDER_ID,
      sourceCode: 'PR-TEST-001',
    }))
    expect(mockReserveCommercialOrderStock).toHaveBeenCalledWith(expect.anything(), {
      orderId: 'commercial-order-auto',
      allowPartial: true,
    })
    expect(json.fulfillmentStatus).toBe('stock_reserved')
    expect(mockPrisma.account.update).not.toHaveBeenCalled()
  })

  it('uses an existing operational order idempotently without re-synchronizing it', async () => {
    setupDefaultMocks({ packageId: null })
    mockPrisma.operationCommercialOrder.findFirst.mockResolvedValue({ id: 'commercial-existing' } as never)

    const res = await POST(createApproveRequest(), routeParams())
    expect(res.status).toBe(200)
    expect(mockSyncRealOrderToOperations).not.toHaveBeenCalled()
    expect(mockReserveCommercialOrderStock).toHaveBeenCalledWith(expect.anything(), {
      orderId: 'commercial-existing',
      allowPartial: true,
    })
  })

  it('sends only the missing quantity to production and persists backorder context', async () => {
    setupDefaultMocks({ packageId: null })
    mockReserveCommercialOrderStock.mockResolvedValue({
      order: { id: 'commercial-order-auto', status: 'needs_production', paymentStatus: 'paid', fulfillmentStatus: 'pending' },
      reservedUnits: [],
      missingItems: [{ itemId: 'item-1', productCode: 'PRP-FG-STICKER', requestedQty: 1, reservedQty: 0, missingQty: 1 }],
      summary: { requestedQty: 1, reservedQty: 0, missingQty: 1, status: 'needs_production' },
    })

    const res = await POST(createApproveRequest(), routeParams())
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.productionRequired).toBe(true)
    expect(mockEnsureCustomerBackorderProduction).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      orderId: TEST_ORDER_ID,
      backorderQty: 1,
      outputType: 'PRP-FG-STICKER',
    }))
    expect(mockPrisma.order.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ adminReviewNotes: expect.stringContaining('Tiene backorder: sí.') }),
    }))
  })

  it('returns a controlled 500 if operational synchronization fails', async () => {
    setupDefaultMocks({ packageId: null })
    mockSyncRealOrderToOperations.mockRejectedValue(new Error('sync exploded'))

    const res = await POST(createApproveRequest(), routeParams())
    const json = await res.json()
    expect(res.status).toBe(500)
    expect(json.error).toBe('No se pudo preparar el pedido para inventario/producción')
  })

  it('returns a generic safe 500 if the approval transaction fails', async () => {
    setupDefaultMocks()
    mockPrisma.$transaction.mockRejectedValue(new Error('Internal database error'))

    const res = await POST(createApproveRequest(), routeParams())
    const json = await res.json()
    expect(res.status).toBe(500)
    expect(json.error).toBe('No se pudo aprobar la orden')
    expect(json.error).not.toMatch(/internal|database|prisma/i)
    expect(json.details).toBeUndefined()
    expect(json.stack).toBeUndefined()
  })
})