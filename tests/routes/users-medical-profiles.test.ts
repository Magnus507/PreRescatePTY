import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mockPrisma } from '../helpers/mock-prisma'
import { resetAllMocks } from '../helpers/reset-mocks'
import { createMockSession } from '../helpers/mock-auth'
import { createMockProfile } from '../factories/profile.factory'

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
const mockFindAllByAccount = vi.hoisted(() => vi.fn())

vi.mock('@/domains/accounts/services/account-state.service', () => ({
  AccountStateService: {
    getAccountState: mockGetAccountState,
  },
}))

vi.mock('@/domains/profiles/repositories/profile.repository', () => ({
  ProfileRepository: {
    findAllByAccount: mockFindAllByAccount,
  },
}))

// ─── Imports after mocks ────────────────────────────────────────────────────
import { GET } from '@/app/api/users/perfiles-medicos/route'
import { getServerSession } from 'next-auth'

// ─── Helpers ────────────────────────────────────────────────────────────────

const TEST_USER_ID = 'test-user-1'
const TEST_ACCOUNT_ID = 'test-account-id'

/**
 * Configures getServerSession to return a valid session.
 */
function authorizeAsUser(overrides: Record<string, unknown> = {}): void {
  vi.mocked(getServerSession).mockResolvedValue(
    createMockSession({ id: TEST_USER_ID, role: 'owner', ...overrides }) as never
  )
}

/**
 * Creates a realistic AccountState object.
 */
function createMockAccountState(overrides: Record<string, unknown> = {}) {
  return {
    accountId: TEST_ACCOUNT_ID,
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
    familyProfilesCount: 1,
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
 * Sets up common mocks for GET tests with profiles.
 */
function setupGetMocks(profiles: ReturnType<typeof createMockProfile>[]) {
  mockGetAccountState.mockResolvedValue(createMockAccountState())
  mockFindAllByAccount.mockResolvedValue(profiles)
  // The route does a dynamic import of prisma for corporate profiles
  mockPrisma.user.findUnique.mockResolvedValue({ id: TEST_USER_ID } as never)
  mockPrisma.organizationMember.findMany.mockResolvedValue([] as never)
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('GET /api/users/perfiles-medicos', () => {
  beforeEach(() => {
    resetAllMocks()
    mockGetAccountState.mockReset()
    mockFindAllByAccount.mockReset()
  })

  // ─── Auth ───────────────────────────────────────────────────────────────

  it('1. returns 401 when there is no authenticated session', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null)

    const res = await GET()
    const json = await res.json()

    expect(res.status).toBe(401)
    expect(json.error).toMatch(/autorizado/i)
  })

  // ─── Happy path ─────────────────────────────────────────────────────────

  it('2. returns ownProfile, familyProfiles, corporateProfiles and accountState', async () => {
    authorizeAsUser()

    const ownProfile = createMockProfile({
      id: 'profile-own',
      userId: TEST_USER_ID,
      accountId: TEST_ACCOUNT_ID,
      firstName: 'Own',
      lastName: 'Profile',
    })
    const familyProfile = createMockProfile({
      id: 'profile-family',
      userId: null,
      accountId: TEST_ACCOUNT_ID,
      firstName: 'Family',
      lastName: 'Member',
    })

    setupGetMocks([ownProfile, familyProfile])

    const res = await GET()
    const json = await res.json()

    expect(res.status).toBe(200)

    // Verify key response groups
    expect(json.ownProfile).toBeDefined()
    expect(json.ownProfile.id).toBe('profile-own')
    expect(json.ownProfile.firstName).toBe('Own')

    expect(json.familyProfiles).toBeDefined()
    expect(Array.isArray(json.familyProfiles)).toBe(true)
    expect(json.familyProfiles).toHaveLength(1)
    expect(json.familyProfiles[0].id).toBe('profile-family')

    expect(json.corporateProfiles).toBeDefined()
    expect(Array.isArray(json.corporateProfiles)).toBe(true)

    expect(json.state).toBeDefined()
    expect(json.state.accountId).toBe(TEST_ACCOUNT_ID)
  })

  // ─── Service call verification ──────────────────────────────────────────

  it('3. calls ProfileRepository.findAllByAccount with the accountId', async () => {
    authorizeAsUser()
    setupGetMocks([])

    await GET()

    expect(mockFindAllByAccount).toHaveBeenCalledWith(TEST_ACCOUNT_ID)
  })

  // ─── No accountId ───────────────────────────────────────────────────────

  it('4. returns empty familyProfiles and corporateProfiles when user has no accountId', async () => {
    authorizeAsUser()

    mockGetAccountState.mockResolvedValue(
      createMockAccountState({ accountId: null })
    )
    // findAllByAccount should NOT be called when no accountId
    mockFindAllByAccount.mockResolvedValue([])

    const res = await GET()
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.ownProfile).toBeNull()
    expect(json.familyProfiles).toEqual([])
    expect(json.corporateProfiles).toEqual([])
    expect(json.state).toBeDefined()

    // ProfileRepository.findAllByAccount should not be called without accountId
    expect(mockFindAllByAccount).not.toHaveBeenCalled()
  })

  // ─── Corporate profiles ─────────────────────────────────────────────────

  it('5. includes corporate profiles linked through organizationMember.corporateProfileId', async () => {
    authorizeAsUser()

    const ownProfile = createMockProfile({
      id: 'profile-own',
      userId: TEST_USER_ID,
      accountId: TEST_ACCOUNT_ID,
    })
    setupGetMocks([ownProfile])

    // Mock the organizationMember.findMany to return a corporate member
    const corpProfile = createMockProfile({
      id: 'profile-corp',
      userId: null,
      accountId: TEST_ACCOUNT_ID,
      firstName: 'Corp',
      lastName: 'Employee',
      profileType: 'corporate',
    })
    mockPrisma.organizationMember.findMany.mockResolvedValue([
      {
        id: 'om-1',
        organizationId: 'org-1',
        corporateProfileId: 'profile-corp',
        corporateStatus: 'active',
        corporateProfile: corpProfile,
        organization: { id: 'org-1', displayName: 'Acme Corp', legalName: 'Acme SA' },
      },
    ] as never)

    const res = await GET()
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.corporateProfiles).toHaveLength(1)
    expect(json.corporateProfiles[0].id).toBe('profile-corp')
    expect(json.corporateProfiles[0].organizationId).toBe('org-1')
    expect(json.corporateProfiles[0].organizationName).toBe('Acme Corp')
    expect(json.corporateProfiles[0].corporateStatus).toBe('active')
  })

  // ─── Own profile not duplicated ─────────────────────────────────────────

  it('6. does not duplicate the own profile inside familyProfiles or corporateProfiles', async () => {
    authorizeAsUser()

    const ownProfile = createMockProfile({
      id: 'profile-own',
      userId: TEST_USER_ID,
      accountId: TEST_ACCOUNT_ID,
    })
    const familyProfile = createMockProfile({
      id: 'profile-family',
      userId: 'other-user',
      accountId: TEST_ACCOUNT_ID,
    })

    setupGetMocks([ownProfile, familyProfile])

    const res = await GET()
    const json = await res.json()

    expect(res.status).toBe(200)

    // ownProfile should be the one with matching userId
    expect(json.ownProfile.id).toBe('profile-own')

    // familyProfiles should NOT contain the own profile
    const familyIds = json.familyProfiles.map((p: { id: string }) => p.id)
    expect(familyIds).not.toContain('profile-own')
    expect(familyIds).toContain('profile-family')

    // corporateProfiles should be empty (no org members)
    expect(json.corporateProfiles).toHaveLength(0)
  })
})