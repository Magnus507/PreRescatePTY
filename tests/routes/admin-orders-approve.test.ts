import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { mockPrisma } from '../helpers/mock-prisma'
import { resetAllMocks } from '../helpers/reset-mocks'
import { createMockSession } from '../helpers/mock-auth'

// ─── Mocks ──────────────────────────────────────────────────────────────────

vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({
  authOptions: {},
}))

vi.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}))

const mockRateLimit = vi.hoisted(() => vi.fn())
vi.mock('@/lib/rateLimit', () => ({
  rateLimit: mockRateLimit,
}))

const mockInvalidateCache = vi.hoisted(() => vi.fn())
vi.mock('@/domains/accounts/services/account-state.service', () => ({
  AccountStateService: {
    invalidateCache: mockInvalidateCache,
  },
}))

const mockNormalizeAssignedChipIds = vi.hoisted(() => vi.fn())
const mockCalculatePurchasedChips = vi.hoisted(() => vi.fn())
const mockCalculateCapacityIncrement = vi.hoisted(() => vi.fn())
const mockWasOrderAlreadyApproved = vi.hoisted(() => vi.fn())
const mockApplyCapacityIfFirstApproval = vi.hoisted(() => vi.fn())
const mockReserveAssignedChipsForOrder = vi.hoisted(() => vi.fn())
const mockReserveCommercialOrderStock = vi.hoisted(() => vi.fn())

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

// ─── Imports after mocks ────────────────────────────────────────────────────
import { POST } from '@/app/api/admin/orders/[id]/approve/route'
import { getServerSession } from 'next-auth'

// ─── Helpers ────────────────────────────────────────────────────────────────

const TEST_ADMIN_ID = 'admin-1'
const TEST_USER_ID = 'test-user-1'
const TEST_ACCOUNT_ID = 'test-account-id'
const TEST_ORDER_ID = 'order-1'
const TEST_PACKAGE_ID = 'pkg_123'

function routeParams(orderId: string = TEST_ORDER_ID): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id: orderId }) }
}

function createApproveRequest(body: Record<string, unknown> = {}): NextRequest {
  return new NextRequest(`http://localhost/api/admin/orders/${TEST_ORDER_ID}/approve`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

function createEligibleOrder(overrides: Record<string, unknown> = {}) {
  return {
    id: TEST_ORDER_ID,
    userId: TEST_USER_ID,
    provider: 'manual',
    paymentStatus: 'under_review',
    orderStatus: 'processing',
    adminReviewStatus: 'pending',
    orderType: 'manual',
    packageId: TEST_PACKAGE_ID,
    items: [{ id: 'item-1', profileId: null, chipId: null, quantity: 1 }],
    corporateEmployeeItems: [],
    ...overrides,
  }
}

function setupDefaultMocks(orderOverrides: Record<string, unknown> = {}) {
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
    order: {
      id: TEST_ORDER_ID,
      status: 'stock_reserved',
      paymentStatus: 'paid',
      fulfillmentStatus: 'reserved',
    },
    reservedUnits: [],
    missingItems: [],
    summary: {
      requestedQty: 1,
      reservedQty: 1,
      missingQty: 0,
      status: 'stock_reserved',
    },
  })
  mockInvalidateCache.mockResolvedValue(undefined)

  mockPrisma.order.findUnique.mockResolvedValue(
    createEligibleOrder(orderOverrides) as never
  )
  mockPrisma.operationCommercialOrder.findFirst.mockResolvedValue(null as never)
  mockPrisma.user.findUnique.mockResolvedValue({
    id: TEST_USER_ID,
    accountId: TEST_ACCOUNT_ID,
  } as never)
  mockPrisma.package.findUnique.mockResolvedValue({
    id: TEST_PACKAGE_ID,
    name: 'Plan Básico',
    price: 49.99,
    isActive: true,
    accountType: 'personal',
    maxChips: 5,
    maxProfiles: 3,
  } as never)
  mockPrisma.order.update.mockResolvedValue({ id: TEST_ORDER_ID } as never)
  mockPrisma.account.findUnique.mockResolvedValue({
    id: TEST_ACCOUNT_ID,
    maxChipsAllocated: 1,
    maxProfilesAllocated: 1,
  } as never)
  mockPrisma.account.update.mockResolvedValue({ id: TEST_ACCOUNT_ID } as never)
  mockPrisma.auditLog.create.mockResolvedValue({} as never)
  mockPrisma.$transaction.mockImplementation(async (callback: (tx: typeof mockPrisma) => Promise<void>) => {
    return callback(mockPrisma)
  })
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('POST /api/admin/orders/[id]/approve', () => {
  beforeEach(() => {
    resetAllMocks()
    mockRateLimit.mockReset()
    mockNormalizeAssignedChipIds.mockReset()
    mockCalculatePurchasedChips.mockReset()
    mockCalculateCapacityIncrement.mockReset()
    mockWasOrderAlreadyApproved.mockReset()
    mockApplyCapacityIfFirstApproval.mockReset()
    mockReserveAssignedChipsForOrder.mockReset()
    mockReserveCommercialOrderStock.mockReset()
    mockInvalidateCache.mockReset()
    mockPrisma.order.findUnique.mockReset()
    mockPrisma.operationCommercialOrder.findFirst.mockReset()
    mockPrisma.user.findUnique.mockReset()
    mockPrisma.package.findUnique.mockReset()
    mockPrisma.order.update.mockReset()
    mockPrisma.account.findUnique.mockReset()
    mockPrisma.account.update.mockReset()
    mockPrisma.auditLog.create.mockReset()
    mockPrisma.$transaction.mockReset()
  })

  // ─── Auth ───────────────────────────────────────────────────────────────

  it('1. forwards the authorization response when the user lacks an allowed admin role', async () => {
    vi.mocked(getServerSession).mockResolvedValue(
      createMockSession({ id: 'user-1', role: 'owner' }) as never
    )

    const req = createApproveRequest()
    const res = await POST(req, routeParams())
    const json = await res.json()

    expect(res.status).toBe(401)
    expect(json.error).toMatch(/autorizado/i)
  })

  // ─── Rate limit ─────────────────────────────────────────────────────────

  it('2. returns 429 when rate limiting denies the request', async () => {
    vi.mocked(getServerSession).mockResolvedValue(
      createMockSession({ id: TEST_ADMIN_ID, role: 'admin' }) as never
    )
    mockRateLimit.mockResolvedValue({ allowed: false })

    const req = createApproveRequest()
    const res = await POST(req, routeParams())
    const json = await res.json()

    expect(res.status).toBe(429)
    expect(json.error).toMatch(/demasiadas/i)
  })

  // ─── Order not found ────────────────────────────────────────────────────

  it('3. returns 404 when the order does not exist', async () => {
    setupDefaultMocks()
    mockPrisma.order.findUnique.mockResolvedValue(null as never)

    const req = createApproveRequest()
    const res = await POST(req, routeParams())
    const json = await res.json()

    expect(res.status).toBe(404)
    expect(json.error).toMatch(/no encontrada/i)
  })

  // ─── Already approved ───────────────────────────────────────────────────

  it('4. returns 400 when the order is already approved/paid', async () => {
    setupDefaultMocks({ adminReviewStatus: 'approved', paymentStatus: 'paid' })

    const req = createApproveRequest()
    const res = await POST(req, routeParams())
    const json = await res.json()

    expect(res.status).toBe(400)
    expect(json.error).toMatch(/ya fue aprobado/i)
  })

  // ─── Already rejected ───────────────────────────────────────────────────

  it('5. returns 400 when the order is already rejected/cancelled', async () => {
    setupDefaultMocks({ adminReviewStatus: 'rejected', paymentStatus: 'rejected' })

    const req = createApproveRequest()
    const res = await POST(req, routeParams())
    const json = await res.json()

    expect(res.status).toBe(400)
    expect(json.error).toMatch(/ya fue rechazado/i)
  })

  // ─── Package not found ──────────────────────────────────────────────────

  it('6. returns 400 when the package associated with the order does not exist', async () => {
    setupDefaultMocks()
    mockPrisma.package.findUnique.mockResolvedValue(null as never)

    const req = createApproveRequest()
    const res = await POST(req, routeParams())
    const json = await res.json()

    expect(res.status).toBe(400)
    expect(json.error).toMatch(/paquete/i)
  })

  // ─── Not eligible for approval ──────────────────────────────────────────

  it('7. returns 400 when the order is not eligible for administrative approval', async () => {
    setupDefaultMocks({ paymentStatus: 'pending', orderStatus: 'pending' })

    const req = createApproveRequest()
    const res = await POST(req, routeParams())
    const json = await res.json()

    expect(res.status).toBe(400)
    expect(json.error).toMatch(/no puede aprobarse/i)
  })

  // ─── Successful approval ────────────────────────────────────────────────

  it('8. returns 200 for successful approval with correct status changes', async () => {
    setupDefaultMocks()

    const req = createApproveRequest()
    const res = await POST(req, routeParams())
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.orderId).toBe(TEST_ORDER_ID)

    expect(mockPrisma.order.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: TEST_ORDER_ID },
        data: expect.objectContaining({
          paymentStatus: 'paid',
          orderStatus: 'processing',
          adminReviewStatus: 'approved',
        }),
      })
    )
  })

  // ─── Account update ─────────────────────────────────────────────────────

  it('9. successful approval updates the Account using the selected package', async () => {
    setupDefaultMocks()

    const req = createApproveRequest()
    await POST(req, routeParams())

    expect(mockPrisma.account.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: TEST_ACCOUNT_ID },
        data: expect.objectContaining({
          packageId: TEST_PACKAGE_ID,
          accountType: 'personal',
          status: 'active',
          maxChipsAllocated: 5,
          maxProfilesAllocated: 3,
        }),
      })
    )
  })

  // ─── OrderFulfillmentService calls ──────────────────────────────────────

  it('10. successful approval calls OrderFulfillmentService with the expected methods', async () => {
    setupDefaultMocks()

    const req = createApproveRequest()
    await POST(req, routeParams())

    expect(mockCalculatePurchasedChips).toHaveBeenCalled()
    expect(mockCalculateCapacityIncrement).toHaveBeenCalled()
    expect(mockWasOrderAlreadyApproved).toHaveBeenCalled()
    expect(mockApplyCapacityIfFirstApproval).toHaveBeenCalled()
    expect(mockReserveAssignedChipsForOrder).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        orderId: TEST_ORDER_ID,
        assignedChipIds: [],
        purchasedChips: 1,
        tokenExpiresAt: expect.any(Date),
      })
    )
  })

  it('10b. successful approval reserves linked commercial stock inside the same transaction', async () => {
    setupDefaultMocks()
    mockPrisma.operationCommercialOrder.findFirst.mockResolvedValue({ id: 'commercial-order-1' } as never)

    const req = createApproveRequest()
    await POST(req, routeParams())

    expect(mockReserveCommercialOrderStock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        orderId: 'commercial-order-1',
        allowPartial: true,
      })
    )
  })

  // ─── Audit log ──────────────────────────────────────────────────────────

  it('11. successful approval creates an audit log with correct action and identifiers', async () => {
    setupDefaultMocks()

    const req = createApproveRequest()
    await POST(req, routeParams())

    expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'order_approved',
          actorUserId: TEST_ADMIN_ID,
          entityType: 'Order',
          entityId: TEST_ORDER_ID,
        }),
      })
    )
  })

  // ─── Cache invalidation ─────────────────────────────────────────────────

  it('12. successful approval invalidates AccountStateService cache for the affected user', async () => {
    setupDefaultMocks()

    const req = createApproveRequest()
    await POST(req, routeParams())

    expect(mockInvalidateCache).toHaveBeenCalledWith(TEST_USER_ID)
  })

  // ─── Transaction usage ──────────────────────────────────────────────────

  it('13. account update, order update, fulfillment and audit operations execute inside prisma.$transaction', async () => {
    setupDefaultMocks()

    const req = createApproveRequest()
    await POST(req, routeParams())

    expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1)
    expect(mockPrisma.$transaction).toHaveBeenCalledWith(expect.any(Function))
  })

  // ─── Generic safe 500 response ──────────────────────────────────────────

  it('14. returns a generic safe 500 response when an unexpected internal error occurs', async () => {
    setupDefaultMocks()
    mockPrisma.$transaction.mockRejectedValue(new Error('Internal database error'))

    const req = createApproveRequest()
    const res = await POST(req, routeParams())
    const json = await res.json()

    expect(res.status).toBe(500)
    expect(json.error).not.toMatch(/internal|database|prisma/i)
    expect(json.error).toEqual('No se pudo aprobar la orden')
    expect(json.details).toBeUndefined()
    expect(json.stack).toBeUndefined()
  })
})
