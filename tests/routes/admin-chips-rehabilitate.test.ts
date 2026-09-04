import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { mockPrisma } from '../helpers/mock-prisma'
import { resetAllMocks } from '../helpers/reset-mocks'
import { createMockChip, createMockChipClaimToken } from '../factories/chip.factory'
import { createMockSession } from '../helpers/mock-auth'
import { CHIP_STATUS } from '@/domains/chips/chip-lifecycle.constants'
import { hashActivationCode } from '@/domains/chips/activation-code.service'

// ─── Mocks ──────────────────────────────────────────────────────────────────

const mockRequireRole = vi.hoisted(() => vi.fn())

vi.mock('@/lib/rbac', () => ({
  GENERAL_ADMIN_ROLES: ['admin', 'superadmin'],
  requireRole: mockRequireRole,
}))

vi.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}))

vi.mock('@/lib/identifiers', () => ({
  getUniqueActivationCode: vi.fn().mockResolvedValue('REHAB0001'),
}))

// ─── Imports after mocks ────────────────────────────────────────────────────
import { POST } from '@/app/api/admin/chips/[chipId]/rehabilitate/route'

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Default route params for /api/admin/chips/[chipId]/rehabilitate
 */
function routeParams(chipId = 'chip-1'): { params: Promise<{ chipId: string }> } {
  return { params: Promise.resolve({ chipId }) }
}

/**
 * Configures the fresh role guard to authorize as an admin.
 */
function authorizeAsAdmin(): void {
  mockRequireRole.mockResolvedValue({
    authorized: true,
    session: createMockSession({ role: 'admin' }),
  })
}

/**
 * Creates a default chip with historical claim tokens.
 * The chip is in inventory status and has a token with orderId (historical).
 */
function createDefaultChipWithHistory() {
  const chip = createMockChip({
    id: 'chip-1',
    status: CHIP_STATUS.INVENTORY,
    ownerUserId: 'previous-owner',
    accountId: 'previous-account',
    assignedProfileId: 'previous-profile',
    activatedAt: new Date('2025-01-01'),
    serviceStartDate: new Date('2025-01-01'),
    serviceEndDate: new Date('2025-12-31'),
    serviceStatus: 'inactive',
  })
  const historicalToken = createMockChipClaimToken({
    id: 'token-hist-1',
    chipId: chip.id,
    orderId: 'order-1',
    usedAt: new Date('2025-06-01'),
    expiresAt: new Date('2025-12-31'),
    activationCode: 'ACT000001',
  })
  return { chip, claimTokens: [historicalToken] }
}

/**
 * Configures mockPrisma.chip.findUnique to return chip + claimTokens (via include).
 */
function mockChipFindUniqueWithTokens(
  chip: ReturnType<typeof createMockChip>,
  claimTokens: ReturnType<typeof createMockChipClaimToken>[]
) {
  mockPrisma.chip.findUnique.mockResolvedValue({
    ...chip,
    claimTokens,
  } as never)
}

/**
 * Configures transaction happy-path mocks for a successful rehabilitation.
 */
function setupTransactionHappyPathMocks() {
  mockPrisma.chipClaimToken.updateMany.mockResolvedValue({ count: 2 } as never)
  mockPrisma.chip.update.mockResolvedValue({} as never)
  mockPrisma.chipClaimToken.create.mockResolvedValue({
    id: 'new-token-1',
    activationCode: 'REHAB0001',
    expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000 * 10),
  } as never)
  mockPrisma.auditLog.create.mockResolvedValue({ id: 'audit-1' } as never)
  // No chip.findUnique mockResolvedValueOnce here.
  // The permanent mock from mockChipFindUniqueWithTokens handles all findUnique
  // calls, including the final read-back inside the transaction.
  // Using mockResolvedValueOnce would be consumed by the pre-transaction
  // findUnique, returning a chip without claimTokens and causing a 500.
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('POST /api/admin/chips/[chipId]/rehabilitate', () => {
  beforeEach(() => {
    resetAllMocks()
    mockRequireRole.mockReset()
  })

  it('1. forwards 401 when the fresh role guard finds no session', async () => {
    mockRequireRole.mockResolvedValue({
      authorized: false,
      response: new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401 }),
    })

    const req = new NextRequest('http://localhost/api/admin/chips/chip-1/rehabilitate', {
      method: 'POST',
    })
    const res = await POST(req, routeParams())
    const json = await res.json()

    expect(res.status).toBe(401)
    expect(json.error).toMatch(/autorizado/i)
  })

  it('2. forwards 403 when the fresh role guard rejects a non-admin', async () => {
    mockRequireRole.mockResolvedValue({
      authorized: false,
      response: new Response(JSON.stringify({ error: 'Acceso denegado' }), { status: 403 }),
    })

    const req = new NextRequest('http://localhost/api/admin/chips/chip-1/rehabilitate', {
      method: 'POST',
    })
    const res = await POST(req, routeParams())
    const json = await res.json()

    expect(res.status).toBe(403)
    expect(json.error).toMatch(/denegado/i)
  })

  it('3. returns 404 when chip does not exist', async () => {
    authorizeAsAdmin()
    mockPrisma.chip.findUnique.mockResolvedValue(null as never)

    const req = new NextRequest('http://localhost/api/admin/chips/chip-1/rehabilitate', {
      method: 'POST',
    })
    const res = await POST(req, routeParams())
    const json = await res.json()

    expect(res.status).toBe(404)
    expect(json.error).toMatch(/no encontrado/i)
  })

  it('4. returns 400 when chip status is not inventory', async () => {
    authorizeAsAdmin()
    const chip = createMockChip({ id: 'chip-1', status: 'activated' })
    const token = createMockChipClaimToken({ chipId: chip.id, orderId: 'order-1', usedAt: new Date() })
    mockChipFindUniqueWithTokens(chip, [token])

    const req = new NextRequest('http://localhost/api/admin/chips/chip-1/rehabilitate', {
      method: 'POST',
    })
    const res = await POST(req, routeParams())
    const json = await res.json()

    expect(res.status).toBe(400)
    expect(json.error).toMatch(/inventario/i)
  })

  it('5. returns 400 when chip has no historical claim token', async () => {
    authorizeAsAdmin()
    const chip = createMockChip({ id: 'chip-1', status: CHIP_STATUS.INVENTORY })
    // Claim tokens exist but none have orderId or usedAt
    const freshToken = createMockChipClaimToken({
      chipId: chip.id,
      orderId: null,
      usedAt: null,
    })
    // The route filters tokens by t.orderId !== null || t.usedAt !== null
    mockChipFindUniqueWithTokens(chip, [freshToken])

    const req = new NextRequest('http://localhost/api/admin/chips/chip-1/rehabilitate', {
      method: 'POST',
    })
    const res = await POST(req, routeParams())
    const json = await res.json()

    expect(res.status).toBe(400)
    expect(json.error).toMatch(/historial/i)
  })

  it('6. returns 200 for successful rehabilitation and verifies all side effects', async () => {
    authorizeAsAdmin()
    const { chip, claimTokens } = createDefaultChipWithHistory()
    mockChipFindUniqueWithTokens(chip, claimTokens)
    setupTransactionHappyPathMocks()

    const req = new NextRequest('http://localhost/api/admin/chips/chip-1/rehabilitate', {
      method: 'POST',
    })
    const res = await POST(req, routeParams())
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.message).toMatch(/rehabilitado/i)

    // Verify response includes chip data
    expect(json.chip).toBeDefined()
    expect(json.chip.id).toBe('chip-1')
    expect(json.chip.shortCode).toBe('SC0001')
    expect(json.chip.status).toBe('inventory')

    // Verify response includes new token data
    expect(json.token).toBeDefined()
    expect(json.token.activationCode).toBe('REHAB0001')
    expect(json.token.expiresAt).toBeDefined()

    // Verify historical tokens were neutralized
    expect(mockPrisma.chipClaimToken.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: { in: ['token-hist-1'] },
        }),
        data: expect.objectContaining({
          orderId: null,
          expiresAt: expect.any(Date),
        }),
      })
    )

    // Verify chip fields were reset
    expect(mockPrisma.chip.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'chip-1' },
        data: expect.objectContaining({
          status: 'inventory',
          ownerUserId: null,
          accountId: null,
          assignedProfileId: null,
          activatedAt: null,
          serviceStartDate: null,
          serviceEndDate: null,
          serviceStatus: 'inactive',
        }),
      })
    )

    // Verify a new claim token was created
    expect(mockPrisma.chipClaimToken.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          chipId: 'chip-1',
          activationCodeHash: hashActivationCode('REHAB0001'),
          activationCodeLast4: '0001',
        }),
      })
    )

    // Verify audit log was created
    expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          entityType: 'chip',
          entityId: 'chip-1',
          action: 'chip.rehabilitated_for_stock',
        }),
      })
    )
  })
})
