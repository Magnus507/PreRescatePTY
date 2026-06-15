import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { mockPrisma } from '../helpers/mock-prisma'
import { resetAllMocks } from '../helpers/reset-mocks'
import { createMockChip } from '../factories/chip.factory'
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

  mockPrisma.chip.findUnique.mockResolvedValue(chip as never)
  mockPrisma.user.findUnique.mockResolvedValue(user as never)
  mockPrisma.profile.findUnique.mockResolvedValue(profile as never)
  mockPrisma.chipClaimToken.findFirst.mockResolvedValue(null as never)
  mockPrisma.account.findUnique.mockResolvedValue(account as never)
  mockPrisma.chip.count.mockResolvedValue(0 as never)

  return { chip, user, profile, account }
}

// ─── Tests ──────────────────────────────────────────────────────────────────

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
    setupPreTransactionMocks()
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
})