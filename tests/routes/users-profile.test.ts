import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { mockPrisma } from '../helpers/mock-prisma'
import { resetAllMocks } from '../helpers/reset-mocks'
import { createMockSession } from '../helpers/mock-auth'
import { createMockProfile } from '../factories/profile.factory'
import { createMockUser } from '../factories/user.factory'

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
const mockInvalidateCache = vi.hoisted(() => vi.fn())
const mockFindByUserId = vi.hoisted(() => vi.fn())
const mockUpsertByUserId = vi.hoisted(() => vi.fn())

vi.mock('@/domains/accounts/services/account-state.service', () => ({
  AccountStateService: {
    getAccountState: mockGetAccountState,
    invalidateCache: mockInvalidateCache,
  },
}))

vi.mock('@/domains/profiles/repositories/profile.repository', () => ({
  ProfileRepository: {
    findByUserId: mockFindByUserId,
    upsertByUserId: mockUpsertByUserId,
  },
}))

// ─── Imports after mocks ────────────────────────────────────────────────────
import { GET, PATCH } from '@/app/api/users/profile/route'
import { getServerSession } from 'next-auth'

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Default session user id used across tests.
 */
const TEST_USER_ID = 'test-user-1'

/**
 * Creates a realistic AccountState object.
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

/**
 * Creates a mock prisma.user.findUnique response with nested profile and chips.
 */
function createMockUserWithProfile(overrides: Record<string, unknown> = {}) {
  return {
    id: TEST_USER_ID,
    email: 'user@test.com',
    phone: '+50760001234',
    role: 'owner',
    accountId: 'test-account-id',
    profile: {
      nationalId: '8-123-456',
      assignedChips: [
        { shortCode: 'SC0001' },
      ],
    },
    ...overrides,
  }
}

/**
 * Configures getServerSession to return a valid session.
 */
function authorizeAsUser(): void {
  vi.mocked(getServerSession).mockResolvedValue(
    createMockSession({ id: TEST_USER_ID, role: 'owner' }) as never
  )
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('GET/PATCH /api/users/profile', () => {
  beforeEach(() => {
    resetAllMocks()
    mockGetAccountState.mockReset()
    mockInvalidateCache.mockReset()
    mockFindByUserId.mockReset()
    mockUpsertByUserId.mockReset()
  })

  // ─── Auth ───────────────────────────────────────────────────────────────

  it('1. GET returns 401 when there is no authenticated session', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null)

    const res = await GET()
    const json = await res.json()

    expect(res.status).toBe(401)
    expect(json.error).toMatch(/autorizado/i)
  })

  it('2. PATCH returns 401 when there is no authenticated session', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null)

    const req = new NextRequest('http://localhost/api/users/profile', {
      method: 'PATCH',
      body: JSON.stringify({ firstName: 'Test' }),
    })
    const res = await PATCH(req)
    const json = await res.json()

    expect(res.status).toBe(401)
    expect(json.error).toMatch(/autorizado/i)

    // Ensure no write methods were called
    expect(mockUpsertByUserId).not.toHaveBeenCalled()
    expect(mockInvalidateCache).not.toHaveBeenCalled()
  })

  // ─── GET happy path ─────────────────────────────────────────────────────

  it('3. GET returns profile, user, previewShortCode, isServiceActive and accountState for a valid user', async () => {
    authorizeAsUser()
    const profile = createMockProfile({ userId: TEST_USER_ID, accountId: 'test-account-id' })
    mockFindByUserId.mockResolvedValue(profile)
    mockGetAccountState.mockResolvedValue(createMockAccountState())
    mockPrisma.user.findUnique.mockResolvedValue(createMockUserWithProfile() as never)

    const res = await GET()
    const json = await res.json()

    expect(res.status).toBe(200)

    // Verify service was called with correct userId
    expect(mockGetAccountState).toHaveBeenCalledWith(TEST_USER_ID)
    expect(mockFindByUserId).toHaveBeenCalledWith(TEST_USER_ID)

    // Verify key response fields
    expect(json.profile).toBeDefined()
    expect(json.profile.id).toBe(profile.id)
    expect(json.user).toBeDefined()
    expect(json.user.id).toBe(TEST_USER_ID)
    expect(json.user.email).toBe('user@test.com')
    expect(json.previewShortCode).toBe('SC0001')
    expect(json.isServiceActive).toBe(true)
    expect(json.accountState).toBeDefined()
    expect(json.accountState.accountId).toBe('test-account-id')
  })

  it('4. GET returns previewShortCode as null when the profile has no activated chip', async () => {
    authorizeAsUser()
    const profile = createMockProfile({ userId: TEST_USER_ID, accountId: 'test-account-id' })
    mockFindByUserId.mockResolvedValue(profile)
    mockGetAccountState.mockResolvedValue(createMockAccountState())
    // No activated chips
    mockPrisma.user.findUnique.mockResolvedValue(
      createMockUserWithProfile({ profile: { nationalId: '8-123-456', assignedChips: [] } }) as never
    )

    const res = await GET()
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.previewShortCode).toBeNull()
  })

  // ─── GET isServiceActive ────────────────────────────────────────────────

  it('5. GET returns isServiceActive true when serviceStatus is active and isExpired is false', async () => {
    authorizeAsUser()
    const profile = createMockProfile({ userId: TEST_USER_ID, accountId: 'test-account-id' })
    mockFindByUserId.mockResolvedValue(profile)
    mockGetAccountState.mockResolvedValue(
      createMockAccountState({ serviceStatus: 'active', isExpired: false })
    )
    mockPrisma.user.findUnique.mockResolvedValue(createMockUserWithProfile() as never)

    const res = await GET()
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.isServiceActive).toBe(true)
  })

  it('6. GET returns isServiceActive false when isExpired is true or serviceStatus is not active', async () => {
    authorizeAsUser()
    const profile = createMockProfile({ userId: TEST_USER_ID, accountId: 'test-account-id' })
    mockFindByUserId.mockResolvedValue(profile)
    // Case: isExpired = true
    mockGetAccountState.mockResolvedValue(
      createMockAccountState({ serviceStatus: 'active', isExpired: true })
    )
    mockPrisma.user.findUnique.mockResolvedValue(createMockUserWithProfile() as never)

    const res = await GET()
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.isServiceActive).toBe(false)
  })
})