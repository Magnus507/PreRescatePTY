import { describe, it, expect, beforeEach, vi } from 'vitest'
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

const mockGetAccountState = vi.hoisted(() => vi.fn())

vi.mock('@/domains/accounts/services/account-state.service', () => ({
  AccountStateService: {
    getAccountState: mockGetAccountState,
  },
  ACCOUNT_STATE_ERRORS: {
    USER_NOT_FOUND: 'USER_NOT_FOUND',
    ADMIN_ACCESS_CLIENT_DASHBOARD: 'ADMIN_ACCESS_CLIENT_DASHBOARD',
  },
}))

// ─── Imports after mocks ────────────────────────────────────────────────────
import { GET } from '@/app/api/account/state/route'
import { getServerSession } from 'next-auth'

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * A realistic AccountState object matching the shape returned by
 * AccountStateService.getAccountState.
 */
function createMockAccountState(overrides: Record<string, unknown> = {}) {
  return {
    accountId: 'test-account-id',
    packageId: 'pkg-1',
    packagePrice: 29.99,
    accountType: 'personal',
    packageName: 'Protección Activa',
    maxChipsAllocated: 2,
    maxProfilesAllocated: 3,
    serviceStatus: 'active',
    serviceEndDate: new Date('2027-01-01'),
    serviceDurationMonths: 12,
    isExpired: false,
    isInactive: false,
    isPersonal: true,
    isFamily: false,
    isCorporate: false,
    isOrganization: false,
    isOwner: true,
    canManageFamilyProfiles: false,
    canAccessOrganizationModule: false,
    canActivateMoreChips: true,
    canAddFamilyMember: true,
    activeChipsCount: 1,
    physicalChipsInTransitCount: 0,
    familyProfilesCount: 0,
    contactsCount: 1,
    scansCount: 5,
    hasCompletedMedicalProfile: true,
    hasEmergencyContact: true,
    hasActivatedChip: true,
    setupChecklist: {
      medicalProfileComplete: true,
      chipActivated: true,
      emergencyContactAdded: true,
      setupComplete: true,
    },
    ...overrides,
  }
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('GET /api/account/state', () => {
  beforeEach(() => {
    resetAllMocks()
    mockGetAccountState.mockReset()
  })

  it('1. returns 401 when there is no authenticated session', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null)

    const res = await GET()
    const json = await res.json()

    expect(res.status).toBe(401)
    expect(json.error).toMatch(/autorizado/i)
  })

  it('2. returns the full AccountState response for a valid authenticated user', async () => {
    vi.mocked(getServerSession).mockResolvedValue(
      createMockSession({ id: 'user-1', role: 'owner' }) as never
    )
    const state = createMockAccountState()
    mockGetAccountState.mockResolvedValue(state)

    const res = await GET()
    const json = await res.json()

    expect(res.status).toBe(200)

    // Verify the service was called with the correct userId
    expect(mockGetAccountState).toHaveBeenCalledWith('user-1')

    // Verify key response fields
    expect(json.accountId).toBe('test-account-id')
    expect(json.accountType).toBe('personal')
    expect(json.serviceStatus).toBe('active')
    expect(json.isExpired).toBe(false)
    expect(json.isInactive).toBe(false)
    expect(json.activeChipsCount).toBe(1)
    expect(json.maxChipsAllocated).toBe(2)
    expect(json.setupChecklist).toBeDefined()
    expect(json.setupChecklist.setupComplete).toBe(true)
  })

  it('3. returns 401 when AccountStateService throws USER_NOT_FOUND', async () => {
    vi.mocked(getServerSession).mockResolvedValue(
      createMockSession({ id: 'user-1', role: 'owner' }) as never
    )
    mockGetAccountState.mockRejectedValue(new Error('USER_NOT_FOUND'))

    const res = await GET()
    const json = await res.json()

    expect(res.status).toBe(401)
    expect(json.error).toMatch(/sesión inválida|usuario eliminado/i)
  })

  it('4. returns 401 when AccountStateService throws ADMIN_ACCESS_CLIENT_DASHBOARD', async () => {
    vi.mocked(getServerSession).mockResolvedValue(
      createMockSession({ id: 'admin-1', role: 'admin' }) as never
    )
    mockGetAccountState.mockRejectedValue(new Error('ADMIN_ACCESS_CLIENT_DASHBOARD'))

    const res = await GET()
    const json = await res.json()

    expect(res.status).toBe(401)
    expect(json.error).toMatch(/sesión inválida|usuario eliminado/i)
  })

  it('5. returns 500 for an unexpected error', async () => {
    vi.mocked(getServerSession).mockResolvedValue(
      createMockSession({ id: 'user-1', role: 'owner' }) as never
    )
    mockGetAccountState.mockRejectedValue(new Error('Database connection failed'))

    const res = await GET()
    const json = await res.json()

    expect(res.status).toBe(500)
    expect(json.error).toMatch(/error.*obtener.*estado/i)

    // Ensure no internal stack trace is exposed
    expect(json.stack).toBeUndefined()
    expect(json.details).toBeUndefined()
  })
})