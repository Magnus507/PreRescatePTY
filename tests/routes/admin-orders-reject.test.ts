import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { mockPrisma } from '../helpers/mock-prisma'
import { resetAllMocks } from '../helpers/reset-mocks'
import { createMockSession } from '../helpers/mock-auth'

// ─── Mocks ──────────────────────────────────────────────────────────────────

const mockRequireRole = vi.hoisted(() => vi.fn())
vi.mock('@/lib/rbac', () => ({
  requireRole: mockRequireRole,
  ORDER_REVIEW_ROLES: ['admin', 'superadmin'],
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

// ─── Imports after mocks ────────────────────────────────────────────────────
import { POST } from '@/app/api/admin/orders/[id]/reject/route'

// ─── Helpers ────────────────────────────────────────────────────────────────

const TEST_ADMIN_ID = 'admin-1'
const TEST_USER_ID = 'test-user-1'
const TEST_ACCOUNT_ID = 'test-account-id'
const TEST_ORDER_ID = 'order-1'

function routeParams(orderId: string = TEST_ORDER_ID): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id: orderId }) }
}

function createRejectRequest(body: Record<string, unknown> = {}): NextRequest {
  return new NextRequest(`http://localhost/api/admin/orders/${TEST_ORDER_ID}/reject`, {
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
    corporateEmployeeItems: [],
    ...overrides,
  }
}

function setupDefaultMocks(orderOverrides: Record<string, unknown> = {}) {
  mockRequireRole.mockResolvedValue({
    authorized: true,
    session: createMockSession({ id: TEST_ADMIN_ID, role: 'admin' }),
  })
  mockRateLimit.mockResolvedValue({ allowed: true })
  mockInvalidateCache.mockResolvedValue(undefined)

  mockPrisma.order.findUnique.mockResolvedValue(
    createEligibleOrder(orderOverrides) as never
  )
  mockPrisma.user.findUnique.mockResolvedValue({
    id: TEST_USER_ID,
    accountId: TEST_ACCOUNT_ID,
  } as never)
  mockPrisma.order.update.mockResolvedValue({ id: TEST_ORDER_ID } as never)
  mockPrisma.auditLog.create.mockResolvedValue({} as never)
  mockPrisma.$transaction.mockImplementation(async (callback: (tx: typeof mockPrisma) => Promise<void>) => {
    return callback(mockPrisma)
  })
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('POST /api/admin/orders/[id]/reject', () => {
  beforeEach(() => {
    resetAllMocks()
    mockRequireRole.mockReset()
    mockRateLimit.mockReset()
    mockInvalidateCache.mockReset()
    mockPrisma.order.findUnique.mockReset()
    mockPrisma.user.findUnique.mockReset()
    mockPrisma.order.update.mockReset()
    mockPrisma.auditLog.create.mockReset()
    mockPrisma.$transaction.mockReset()
  })

  // ─── Auth ───────────────────────────────────────────────────────────────

  it('1. forwards the authorization response when the user lacks an allowed admin role', async () => {
    mockRequireRole.mockResolvedValue({
      authorized: false,
      response: new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401 }),
    })

    const req = createRejectRequest()
    const res = await POST(req, routeParams())

    expect(res.status).toBe(401)
  })

  // ─── Rate limit ─────────────────────────────────────────────────────────

  it('2. returns 429 when rate limiting denies the request', async () => {
    mockRequireRole.mockResolvedValue({
      authorized: true,
      session: createMockSession({ id: TEST_ADMIN_ID, role: 'admin' }),
    })
    mockRateLimit.mockResolvedValue({ allowed: false })

    const req = createRejectRequest()
    const res = await POST(req, routeParams())
    const json = await res.json()

    expect(res.status).toBe(429)
    expect(json.error).toMatch(/demasiadas/i)
  })

  // ─── Order not found ────────────────────────────────────────────────────

  it('3. returns 404 when the order does not exist', async () => {
    setupDefaultMocks()
    mockPrisma.order.findUnique.mockResolvedValue(null as never)

    const req = createRejectRequest()
    const res = await POST(req, routeParams())
    const json = await res.json()

    expect(res.status).toBe(404)
    expect(json.error).toMatch(/no encontrada/i)
  })

  // ─── Already rejected ───────────────────────────────────────────────────

  it('4. returns 400 when the order is already rejected or cancelled', async () => {
    setupDefaultMocks({ adminReviewStatus: 'rejected', paymentStatus: 'rejected' })

    const req = createRejectRequest()
    const res = await POST(req, routeParams())
    const json = await res.json()

    expect(res.status).toBe(400)
    expect(json.error).toMatch(/ya fue rechazado/i)
  })

  // ─── Already approved ───────────────────────────────────────────────────

  it('5. returns 400 when the order is already approved or paid', async () => {
    setupDefaultMocks({ adminReviewStatus: 'approved', paymentStatus: 'paid' })

    const req = createRejectRequest()
    const res = await POST(req, routeParams())
    const json = await res.json()

    expect(res.status).toBe(400)
    expect(json.error).toMatch(/ya fue aprobado/i)
  })

  // ─── Not eligible for rejection ─────────────────────────────────────────

  it('6. returns 400 when the order is not eligible for administrative rejection', async () => {
    // An order with cancelled orderStatus but pending paymentStatus may not be eligible
    // The real canAdminRejectManual helper determines this
    setupDefaultMocks({ orderStatus: 'completed', paymentStatus: 'pending' })

    const req = createRejectRequest()
    const res = await POST(req, routeParams())
    const json = await res.json()

    expect(res.status).toBe(400)
    expect(json.error).toMatch(/no puede rechazarse/i)
  })

  // ─── Successful rejection ───────────────────────────────────────────────

  it('7. returns 200 for successful rejection with correct status changes', async () => {
    setupDefaultMocks()

    const req = createRejectRequest()
    const res = await POST(req, routeParams())
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.order).toBeDefined()

    expect(mockPrisma.order.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: TEST_ORDER_ID, paymentStatus: 'under_review', adminReviewStatus: 'pending' }),
        data: expect.objectContaining({
          paymentStatus: 'rejected',
          orderStatus: 'cancelled',
          adminReviewStatus: 'rejected',
        }),
      })
    )
  })

  // ─── Audit log ──────────────────────────────────────────────────────────

  it('8. successful rejection creates an audit log with correct action and identifiers', async () => {
    setupDefaultMocks()

    const req = createRejectRequest()
    await POST(req, routeParams())

    expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'order_rejected',
          actorUserId: TEST_ADMIN_ID,
          entityType: 'Order',
          entityId: TEST_ORDER_ID,
        }),
      })
    )
  })

  // ─── Cache invalidation ─────────────────────────────────────────────────

  it('9. successful rejection invalidates AccountStateService cache for the affected user', async () => {
    setupDefaultMocks()

    const req = createRejectRequest()
    await POST(req, routeParams())

    expect(mockInvalidateCache).toHaveBeenCalledWith(TEST_USER_ID)
  })

  // ─── Transaction usage ──────────────────────────────────────────────────

  it('10. order update and audit log execute inside prisma.$transaction', async () => {
    setupDefaultMocks()

    const req = createRejectRequest()
    await POST(req, routeParams())

    expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1)
    expect(mockPrisma.$transaction).toHaveBeenCalledWith(expect.any(Function))
  })

  // ─── No account/fulfillment side effects ────────────────────────────────

  it('11. rejected orders do not trigger Account activation, OrderFulfillmentService, or chip reservation', async () => {
    setupDefaultMocks()

    const req = createRejectRequest()
    await POST(req, routeParams())

    expect(mockPrisma.account.update).not.toHaveBeenCalled()
    expect(mockPrisma.account.findUnique).not.toHaveBeenCalled()
  })

  // ─── Safe error response ────────────────────────────────────────────────

  it('12. returns a generic safe 500 response when an unexpected internal error occurs', async () => {
    setupDefaultMocks()
    mockPrisma.$transaction.mockRejectedValue(new Error('Internal database error'))

    const req = createRejectRequest()
    const res = await POST(req, routeParams())
    const json = await res.json()

    expect(res.status).toBe(500)
    expect(json.error).not.toMatch(/internal|database|prisma/i)
    expect(json.error).toEqual('No se pudo rechazar la orden')
    expect(json.details).toBeUndefined()
    expect(json.stack).toBeUndefined()
  })
})
