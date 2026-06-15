import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { mockPrisma } from '../helpers/mock-prisma'
import { resetAllMocks } from '../helpers/reset-mocks'
import { createMockChip } from '../factories/chip.factory'
import { createMockSession } from '../helpers/mock-auth'

// ─── Mocks ──────────────────────────────────────────────────────────────────

const mockRequireRole = vi.hoisted(() => vi.fn())
const mockInvalidateCache = vi.hoisted(() => vi.fn())

vi.mock('@/lib/rbac', () => ({
  requireRole: mockRequireRole,
  GENERAL_ADMIN_ROLES: ['admin', 'superadmin'],
}))

vi.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}))

vi.mock('@/domains/accounts/services/account-state.service', () => ({
  AccountStateService: {
    invalidateCache: mockInvalidateCache,
  },
}))

// ─── Imports after mocks ────────────────────────────────────────────────────
import { POST } from '@/app/api/admin/chips/[chipId]/reactivate/route'

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Default route params for /api/admin/chips/[chipId]/reactivate
 */
function routeParams(chipId = 'chip-1'): { params: Promise<{ chipId: string }> } {
  return { params: Promise.resolve({ chipId }) }
}

/**
 * Configures requireRole to authorize as an admin.
 */
function authorizeAsAdmin(): void {
  mockRequireRole.mockResolvedValue({
    authorized: true,
    session: createMockSession({ role: 'admin', adminRole: 'admin' }),
  })
}

/**
 * Creates a default chip in activated status with expired service.
 */
function createDefaultActivatedChip(overrides: Record<string, unknown> = {}) {
  return createMockChip({
    id: 'chip-1',
    status: 'activated',
    serviceStatus: 'expired',
    ownerUserId: 'test-owner-user-id',
    accountId: 'test-account-id',
    assignedProfileId: 'test-profile-id',
    serviceStartDate: new Date('2023-01-01'),
    serviceEndDate: new Date('2024-12-31'),
    ...overrides,
  } as Record<string, unknown>)
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('POST /api/admin/chips/[chipId]/reactivate', () => {
  beforeEach(() => {
    resetAllMocks()
    mockRequireRole.mockReset()
    mockInvalidateCache.mockReset()
  })

  it('1. forwards the authorization response when requireRole denies access', async () => {
    const deniedResponse = new Response(JSON.stringify({ error: 'No autorizado' }), {
      status: 403,
      headers: { 'content-type': 'application/json' },
    })
    mockRequireRole.mockResolvedValue({
      authorized: false,
      response: deniedResponse,
    })

    const req = new NextRequest('http://localhost/api/admin/chips/chip-1/reactivate', {
      method: 'POST',
    })
    const res = await POST(req, routeParams())

    expect(res.status).toBe(403)
    const json = await res.json()
    expect(json.error).toMatch(/autorizado/i)
  })

  it('2. returns 404 when chip does not exist', async () => {
    authorizeAsAdmin()
    mockPrisma.chip.findUnique.mockResolvedValue(null as never)

    const req = new NextRequest('http://localhost/api/admin/chips/chip-1/reactivate', {
      method: 'POST',
    })
    const res = await POST(req, routeParams())
    const json = await res.json()

    expect(res.status).toBe(404)
    expect(json.error).toMatch(/no encontrado/i)
  })

  it('3. returns 400 when chip status is not activated', async () => {
    authorizeAsAdmin()
    const chip = createDefaultActivatedChip({ status: 'inventory' })
    mockPrisma.chip.findUnique.mockResolvedValue(chip as never)

    const req = new NextRequest('http://localhost/api/admin/chips/chip-1/reactivate', {
      method: 'POST',
    })
    const res = await POST(req, routeParams())
    const json = await res.json()

    expect(res.status).toBe(400)
    expect(json.error).toMatch(/activados/i)
  })

  it('4. returns 200 for successful reactivation and verifies chip date updates', async () => {
    authorizeAsAdmin()
    const chip = createDefaultActivatedChip()
    mockPrisma.chip.findUnique.mockResolvedValue(chip as never)
    // chip.update returns the updated chip
    mockPrisma.chip.update.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
      ...chip,
      ...data,
      serviceStatus: 'active',
      serviceStartDate: data.serviceStartDate,
      serviceEndDate: data.serviceEndDate,
    } as never))
    mockPrisma.auditLog.create.mockResolvedValue({ id: 'audit-1' } as never)

    const req = new NextRequest('http://localhost/api/admin/chips/chip-1/reactivate', {
      method: 'POST',
    })
    const res = await POST(req, routeParams())
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.message).toMatch(/reactivado/i)

    // Verify chip.update was called with correct status and date fields
    expect(mockPrisma.chip.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'chip-1' },
        data: expect.objectContaining({
          serviceStatus: 'active',
        }),
      })
    )

    const updateCall = mockPrisma.chip.update.mock.calls[0][0]
    const { serviceStartDate, serviceEndDate } = updateCall.data as {
      serviceStartDate: Date
      serviceEndDate: Date
    }

    // Assert dates are Date instances
    expect(serviceStartDate).toBeInstanceOf(Date)
    expect(serviceEndDate).toBeInstanceOf(Date)

    // Assert serviceStartDate is approximately now (±5s tolerance)
    const now = Date.now()
    expect(serviceStartDate.getTime()).toBeGreaterThan(now - 5000)
    expect(serviceStartDate.getTime()).toBeLessThan(now + 5000)

    // Assert serviceEndDate is approximately 2 years after serviceStartDate
    const twoYearsMs = 2 * 365 * 24 * 60 * 60 * 1000
    const diffMs = serviceEndDate.getTime() - serviceStartDate.getTime()
    // Allow ±30 days tolerance for leap year / month boundary differences
    const toleranceMs = 30 * 24 * 60 * 60 * 1000
    expect(Math.abs(diffMs - twoYearsMs)).toBeLessThan(toleranceMs)
  })

  it('5. on success verifies audit log, cache invalidation, and response data', async () => {
    authorizeAsAdmin()
    const chip = createDefaultActivatedChip()
    mockPrisma.chip.findUnique.mockResolvedValue(chip as never)
    mockPrisma.chip.update.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
      ...chip,
      ...data,
      serviceStatus: 'active',
      serviceStartDate: data.serviceStartDate,
      serviceEndDate: data.serviceEndDate,
    } as never))
    mockPrisma.auditLog.create.mockResolvedValue({ id: 'audit-1' } as never)

    const req = new NextRequest('http://localhost/api/admin/chips/chip-1/reactivate', {
      method: 'POST',
    })
    const res = await POST(req, routeParams())
    const json = await res.json()

    expect(res.status).toBe(200)

    // Verify audit log was created
    expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          entityType: 'chip',
          entityId: 'chip-1',
          action: 'reactivate',
        }),
      })
    )

    // Verify cache invalidation was called for the chip owner
    expect(mockInvalidateCache).toHaveBeenCalledWith('test-owner-user-id')

    // Verify response contains chip data
    expect(json.chip).toBeDefined()
    expect(json.chip.id).toBe('chip-1')
    expect(json.chip.serviceStatus).toBe('active')
    expect(json.chip.serviceStartDate).toBeDefined()
    expect(json.chip.serviceEndDate).toBeDefined()
  })
})