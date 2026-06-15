import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { mockPrisma } from '../helpers/mock-prisma'
import { resetAllMocks } from '../helpers/reset-mocks'
import { createMockChip, createMockChipClaimToken } from '../factories/chip.factory'
import { createMockUser } from '../factories/user.factory'
import { createMockProfile } from '../factories/profile.factory'
import { createMockAccount } from '../factories/account.factory'
import { createMockSession } from '../helpers/mock-auth'

// ─── Mocks ──────────────────────────────────────────────────────────────────

vi.mock('@/lib/rbac', () => ({
  GENERAL_ADMIN_ROLES: ['admin', 'superadmin'],
  requireRole: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}))

vi.mock('@/domains/orders/services/order-fulfillment.service', () => ({
  OrderFulfillmentService: {
    assignDirectReserveChipAndToken: vi.fn(),
  },
}))

vi.mock('@/lib/order-number', () => ({
  generateOrderNumber: vi.fn().mockResolvedValue('PR-2026-000001'),
}))

vi.mock('@/lib/identifiers', () => ({
  getUniqueActivationCode: vi.fn().mockResolvedValue('ACT000001'),
}))

// ─── Imports after mocks ────────────────────────────────────────────────────
import { POST } from '@/app/api/admin/chips/[chipId]/assign-direct/route'
import { requireRole } from '@/lib/rbac'
import { OrderFulfillmentService } from '@/domains/orders/services/order-fulfillment.service'

// ─── Helpers ────────────────────────────────────────────────────────────────

function createAssignDirectRequest(body: Record<string, unknown> = {}) {
  return new NextRequest('http://localhost/api/admin/chips/chip-1/assign-direct', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function validRequestBody(): Record<string, unknown> {
  return {
    targetUserId: 'target-user-1',
    targetProfileId: 'target-profile-1',
    reason: 'replacement',
    capacityMode: 'deny_if_no_capacity',
    autoActivate: false,
  }
}

/**
 * Default route params for /api/admin/chips/[chipId]/assign-direct
 */
function routeParams(chipId = 'chip-1'): { params: Promise<{ chipId: string }> } {
  return { params: Promise.resolve({ chipId }) }
}

/**
 * Configures requireRole to authorize with an admin session.
 */
function authorizeAsAdmin(): void {
  vi.mocked(requireRole).mockResolvedValue({
    authorized: true,
    session: createMockSession({ adminRole: 'admin' }) as never,
  })
}

/**
 * Configures pre-transaction mocks for tests that need them.
 * Sets up chip, user, profile, account, and chipClaimToken.
 */
function setupPreTransactionMocks(overrides: {
  chipStatus?: string
  userAccountId?: string | null
  profileAccountId?: string
  profileUserId?: string | null
} = {}) {
  const {
    chipStatus = 'inventory',
    userAccountId = 'target-account-id',
    profileAccountId = 'target-account-id',
    profileUserId = 'target-user-1',
  } = overrides

  const chip = createMockChip({ id: 'chip-1', status: chipStatus })
  const user = createMockUser({ id: 'target-user-1', accountId: userAccountId })
  const profile = createMockProfile({
    id: 'target-profile-1',
    accountId: profileAccountId,
    userId: profileUserId,
  })
  const account = createMockAccount({ id: 'target-account-id', maxChipsAllocated: 3 })

  // Use mockResolvedValueOnce so setupTransactionHappyPathMocks can queue
  // an additional mockResolvedValueOnce for the in-transaction chip.findUnique.
  mockPrisma.chip.findUnique.mockResolvedValueOnce(chip as never)
  mockPrisma.user.findUnique.mockResolvedValue(user as never)
  mockPrisma.profile.findUnique.mockResolvedValue(profile as never)
  mockPrisma.chipClaimToken.findFirst.mockResolvedValue(null as never)
  mockPrisma.account.findUnique.mockResolvedValue(account as never)
  mockPrisma.chip.count.mockResolvedValue(0 as never)

  return { chip, user, profile, account }
}

/**
 * Configures transaction mocks for a successful assign-direct flow.
 * The route's $transaction callback receives the mockPrisma instance directly.
 */
function setupTransactionHappyPathMocks(overrides: {
  chipId?: string
  tokenId?: string
  orderId?: string
} = {}) {
  const {
    chipId = 'chip-1',
    tokenId = 'token-1',
    orderId = 'order-1',
  } = overrides

  // order.create returns the shape the route expects via .select({ id: true, orderNumber: true })
  mockPrisma.order.create.mockResolvedValue({
    id: orderId,
    orderNumber: 'PR-2026-000001',
  } as never)

  // account.update returns updated capacity (used in grant_exception)
  mockPrisma.account.update.mockResolvedValue({
    maxChipsAllocated: 4,
    maxProfilesAllocated: 2,
  } as never)

  // OrderFulfillmentService returns tokenId
  vi.mocked(OrderFulfillmentService.assignDirectReserveChipAndToken).mockResolvedValue({
    tokenId,
  } as never)

  // auditLog.create
  mockPrisma.auditLog.create.mockResolvedValue({ id: 'audit-1' } as never)

  // chip.findUnique inside the transaction (after assignment) returns updated chip data.
  // The pre-transaction chip.findUnique already consumed its once from setupPreTransactionMocks.
  // This once covers the in-transaction tx.chip.findUnique used to read back the updated chip.
  mockPrisma.chip.findUnique.mockResolvedValueOnce({
    id: chipId,
    shortCode: 'SC0001',
    status: 'sold',
  } as never)
}

// ─── Precondition tests ────────────────────────────────────────────────────

describe('POST /api/admin/chips/[chipId]/assign-direct — preconditions', () => {
  beforeEach(() => {
    resetAllMocks()
  })

  it('1. returns the authorization response when requireRole denies access', async () => {
    const denialResponse = new Response(
      JSON.stringify({ error: 'No autorizado' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    )
    vi.mocked(requireRole).mockResolvedValue({
      authorized: false,
      response: denialResponse,
    })

    const req = createAssignDirectRequest(validRequestBody())
    const res = await POST(req, routeParams())

    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.error).toMatch(/autorizado/i)
  })

  it('2. returns 400 when request body is invalid', async () => {
    authorizeAsAdmin()
    setupPreTransactionMocks()

    const req = createAssignDirectRequest({}) // empty body
    const res = await POST(req, routeParams())

    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toMatch(/inválidos/i)
  })

  it('3. returns 400 when autoActivate is true', async () => {
    authorizeAsAdmin()
    setupPreTransactionMocks()

    const req = createAssignDirectRequest({
      ...validRequestBody(),
      autoActivate: true,
    })
    const res = await POST(req, routeParams())

    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toMatch(/disponible/i)
  })

  it('4. returns 404 when chip does not exist', async () => {
    authorizeAsAdmin()
    // Do NOT call setupPreTransactionMocks — we need chip.findUnique to return null
    // and no once-queued value should be present.
    mockPrisma.chip.findUnique.mockResolvedValue(null as never)

    const req = createAssignDirectRequest(validRequestBody())
    const res = await POST(req, routeParams())

    expect(res.status).toBe(404)
    const json = await res.json()
    expect(json.error).toMatch(/no encontrado/i)
  })

  it('5. returns 409 when chip status is not inventory', async () => {
    authorizeAsAdmin()
    setupPreTransactionMocks({ chipStatus: 'sold' })

    const req = createAssignDirectRequest(validRequestBody())
    const res = await POST(req, routeParams())

    expect(res.status).toBe(409)
    const json = await res.json()
    expect(json.error).toMatch(/disponible/i)
  })

  it('6. returns 400 when target user has no accountId', async () => {
    authorizeAsAdmin()
    setupPreTransactionMocks({ userAccountId: null })

    const req = createAssignDirectRequest(validRequestBody())
    const res = await POST(req, routeParams())

    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toMatch(/cuenta asociada/i)
  })

  it('7. returns 404 when target profile does not exist', async () => {
    authorizeAsAdmin()
    setupPreTransactionMocks()
    mockPrisma.profile.findUnique.mockResolvedValue(null as never)

    const req = createAssignDirectRequest(validRequestBody())
    const res = await POST(req, routeParams())

    expect(res.status).toBe(404)
    const json = await res.json()
    expect(json.error).toMatch(/perfil destino.*no encontrado/i)
  })

  it('8. returns 400 when target profile does not belong to target user account', async () => {
    authorizeAsAdmin()
    setupPreTransactionMocks({ profileAccountId: 'different-account-id' })

    const req = createAssignDirectRequest(validRequestBody())
    const res = await POST(req, routeParams())

    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toMatch(/no pertenece/i)
  })

  it('9. returns 409 when the chip has an active reservation in another order', async () => {
    authorizeAsAdmin()
    setupPreTransactionMocks()
    // Simulate an active token reserved for another order
    const activeToken = createMockChipClaimToken({
      chipId: 'chip-1',
      orderId: 'other-order-1',
      usedAt: null,
      expiresAt: new Date(Date.now() + 86400000),
    })
    mockPrisma.chipClaimToken.findFirst.mockResolvedValue(activeToken as never)

    const req = createAssignDirectRequest(validRequestBody())
    const res = await POST(req, routeParams())

    expect(res.status).toBe(409)
    const json = await res.json()
    expect(json.error).toMatch(/reserva activa/i)

    // Verify the route never reached the transaction / fulfillment service
    expect(OrderFulfillmentService.assignDirectReserveChipAndToken).not.toHaveBeenCalled()
  })

  it('10. returns 400 when account capacity is insufficient and capacityMode is deny_if_no_capacity', async () => {
    authorizeAsAdmin()
    setupPreTransactionMocks()
    // Set account with limited capacity (1 chip) and already at capacity
    mockPrisma.account.findUnique.mockResolvedValue(
      createMockAccount({ id: 'target-account-id', maxChipsAllocated: 1 }) as never
    )
    mockPrisma.chip.count.mockResolvedValue(1 as never) // 1 used, limit is 1 → 0 available

    const req = createAssignDirectRequest(validRequestBody())
    const res = await POST(req, routeParams())

    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toMatch(/cupo disponible/i)

    // Verify the route never reached the transaction / fulfillment service
    expect(OrderFulfillmentService.assignDirectReserveChipAndToken).not.toHaveBeenCalled()
  })
})

// ─── Happy path tests ──────────────────────────────────────────────────────

describe('POST /api/admin/chips/[chipId]/assign-direct — happy path', () => {
  beforeEach(() => {
    resetAllMocks()
    authorizeAsAdmin()
    setupPreTransactionMocks()
    setupTransactionHappyPathMocks()
  })

  it('1. returns 200 for successful assignment with capacityMode deny_if_no_capacity', async () => {
    const req = createAssignDirectRequest(validRequestBody())
    const res = await POST(req, routeParams())
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.message).toMatch(/asignado directamente/i)

    // account.update must NOT be called when capacityMode is deny_if_no_capacity
    expect(mockPrisma.account.update).not.toHaveBeenCalled()
  })

  it('2. returns 200 for successful assignment with capacityMode grant_exception', async () => {
    // Force account to have no available capacity so grant_exception is exercised
    mockPrisma.account.findUnique.mockResolvedValue(
      createMockAccount({ id: 'target-account-id', maxChipsAllocated: 1 }) as never
    )
    mockPrisma.chip.count.mockResolvedValue(1 as never) // 1 used, limit is 1 → 0 available

    const body = {
      ...validRequestBody(),
      capacityMode: 'grant_exception' as const,
      notes: 'Excepción aprobada por administrador',
    }
    const req = createAssignDirectRequest(body)
    const res = await POST(req, routeParams())
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.message).toMatch(/asignado directamente/i)

    // account.update must have been called to increment capacity
    expect(mockPrisma.account.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: 'target-account-id' }),
        data: expect.objectContaining({
          maxChipsAllocated: { increment: 1 },
          maxProfilesAllocated: { increment: 1 },
        }),
      })
    )
  })

  it('3. calls OrderFulfillmentService.assignDirectReserveChipAndToken with expected identifiers', async () => {
    const req = createAssignDirectRequest(validRequestBody())
    const res = await POST(req, routeParams())

    expect(res.status).toBe(200)

    expect(OrderFulfillmentService.assignDirectReserveChipAndToken).toHaveBeenCalledWith(
      mockPrisma,
      expect.objectContaining({
        chipId: 'chip-1',
        orderId: 'order-1',
        activationCode: 'ACT000001',
      })
    )
  })

  it('4. successful response includes the expected top-level assignment data', async () => {
    const req = createAssignDirectRequest(validRequestBody())
    const res = await POST(req, routeParams())
    const json = await res.json()

    expect(res.status).toBe(200)

    // Verify chip data
    expect(json.chip).toBeDefined()
    expect(json.chip.id).toBe('chip-1')
    expect(json.chip.shortCode).toBe('SC0001')
    expect(json.chip.status).toBe('sold')

    // Verify order data
    expect(json.order).toBeDefined()
    expect(json.order.id).toBe('order-1')
    expect(json.order.orderNumber).toBe('PR-2026-000001')

    // Verify token data
    expect(json.token).toBeDefined()
    expect(json.token.activationCode).toBe('ACT000001')
    expect(json.token.expiresAt).toBeDefined()

    // Verify capacity data
    expect(json.capacity).toBeDefined()
    expect(json.capacity.maxChipsAllocated).toBeDefined()
    expect(json.capacity.maxProfilesAllocated).toBeDefined()
  })
})