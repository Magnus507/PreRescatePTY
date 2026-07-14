import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
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

/**
 * Creates a PATCH request with the given body.
 */
function createPatchRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost/api/users/profile', {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}

/**
 * Sets up common mocks for PATCH happy path tests.
 */
function setupPatchMocks(overrides: { oldProfile?: unknown; upsertResult?: unknown } = {}) {
  const oldProfile = overrides.oldProfile ?? createMockProfile({ userId: TEST_USER_ID, accountId: 'test-account-id' })
  const patchResult = overrides.upsertResult ?? createMockProfile({ userId: TEST_USER_ID, accountId: 'test-account-id', firstName: 'Updated' })

  mockPrisma.profile.findUnique.mockResolvedValue(oldProfile as never)
  mockUpsertByUserId.mockResolvedValue(patchResult as never)
  mockPrisma.user.update.mockResolvedValue({} as never)
  mockPrisma.auditLog.create.mockResolvedValue({ id: 'audit-1' } as never)
  mockInvalidateCache.mockResolvedValue(undefined as never)

  return { oldProfile, patchResult }
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

  // ─── PATCH validation ───────────────────────────────────────────────────

  it('7. PATCH returns 400 for invalid body', async () => {
    authorizeAsUser()
    setupPatchMocks()

    const req = createPatchRequest({ firstName: 'A' }) // too short (min 2)
    const res = await PATCH(req)
    const json = await res.json()

    expect(res.status).toBe(400)
    expect(json.error).toBeDefined()
  })

  // ─── PATCH happy path ───────────────────────────────────────────────────

  it('8. PATCH updates allowed fields successfully', async () => {
    authorizeAsUser()
    setupPatchMocks()

    const body = {
      firstName: 'Carlos',
      lastName: 'García',
      displayNamePublic: 'Carlitos',
      phone: '+50760009999',
      nationalId: '8-999-999',
      address: 'Calle 123',
      city: 'Panamá',
      sex: 'M',
      birthDate: '1990-05-15',
    }
    const req = createPatchRequest(body)
    const res = await PATCH(req)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.profile).toBeDefined()

    // Verify upsertByUserId was called with the allowed fields
    expect(mockUpsertByUserId).toHaveBeenCalledWith(
      TEST_USER_ID,
      expect.objectContaining({
        firstName: 'Carlos',
        lastName: 'García',
        displayNamePublic: 'Carlitos',
        phone: '+50760009999',
        nationalId: '8-999-999',
        address: 'Calle 123',
        city: 'Panamá',
        sex: 'M',
      })
    )
  })

  it('9. PATCH returns the updated profile', async () => {
    authorizeAsUser()
    const updatedProfile = createMockProfile({
      userId: TEST_USER_ID,
      accountId: 'test-account-id',
      firstName: 'Updated',
      lastName: 'User',
    })
    setupPatchMocks({ upsertResult: updatedProfile })

    const req = createPatchRequest({ firstName: 'Updated', lastName: 'User' })
    const res = await PATCH(req)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.profile).toBeDefined()
    expect(json.profile.firstName).toBe('Updated')
    expect(json.profile.lastName).toBe('User')
  })

  // ─── Phone synchronization ──────────────────────────────────────────────

  it('10. PATCH synchronizes phone to prisma.user.update when phone is present', async () => {
    authorizeAsUser()
    setupPatchMocks()

    const req = createPatchRequest({ phone: '+50760001111' })
    const res = await PATCH(req)

    expect(res.status).toBe(200)
    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: TEST_USER_ID },
        data: { phone: '+50760001111' },
      })
    )
  })

  it('11. PATCH does not call prisma.user.update when phone is absent', async () => {
    authorizeAsUser()
    setupPatchMocks()

    const req = createPatchRequest({ firstName: 'NoPhone' })
    const res = await PATCH(req)

    expect(res.status).toBe(200)
    expect(mockPrisma.user.update).not.toHaveBeenCalled()
  })

  // ─── Audit log ──────────────────────────────────────────────────────────

  it('12. PATCH creates audit log with action "update" when oldProfile exists', async () => {
    authorizeAsUser()
    setupPatchMocks()

    const req = createPatchRequest({ firstName: 'Test' })
    const res = await PATCH(req)

    expect(res.status).toBe(200)
    expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          actorUserId: TEST_USER_ID,
          entityType: 'profile',
          action: 'update',
        }),
      })
    )
  })

  it('13. PATCH creates audit log with action "create" when oldProfile does not exist', async () => {
    authorizeAsUser()

    // Explicitly configure all mocks for this test to ensure isolation.
    // The key: prisma.profile.findUnique must return null (no existing profile).
    mockPrisma.profile.findUnique.mockResolvedValue(null as never)
    mockUpsertByUserId.mockResolvedValue(
      createMockProfile({ userId: TEST_USER_ID, accountId: 'test-account-id', firstName: 'New' }) as never
    )
    mockPrisma.user.update.mockResolvedValue({} as never)
    mockPrisma.auditLog.create.mockResolvedValue({ id: 'audit-1' } as never)
    mockInvalidateCache.mockResolvedValue(undefined as never)

    const req = createPatchRequest({ firstName: 'New' })
    const res = await PATCH(req)

    expect(res.status).toBe(200)
    expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          actorUserId: TEST_USER_ID,
          entityType: 'profile',
          action: 'create',
        }),
      })
    )
  })

  // ─── Cache invalidation ─────────────────────────────────────────────────

  it('14. PATCH invalidates AccountStateService cache with userId', async () => {
    authorizeAsUser()
    setupPatchMocks()

    const req = createPatchRequest({ firstName: 'Test' })
    const res = await PATCH(req)

    expect(res.status).toBe(200)
    expect(mockInvalidateCache).toHaveBeenCalledWith(TEST_USER_ID)
  })

  // ─── Medical fields ignored ─────────────────────────────────────────────

  it('15. PATCH ignores medical fields even if supplied', async () => {
    authorizeAsUser()
    setupPatchMocks()

    const req = createPatchRequest({
      firstName: 'Test',
      lastName: 'User',
      bloodType: 'B+',
      allergies: 'Peanuts',
      chronicConditions: 'Diabetes',
      medications: 'Insulin',
      additionalNotes: 'Critical info',
    })
    const res = await PATCH(req)

    expect(res.status).toBe(200)

    // Verify upsertByUserId was called WITHOUT medical fields
    const upsertCall = mockUpsertByUserId.mock.calls[0]
    const upsertData = upsertCall[1] as Record<string, unknown>
    expect(upsertData.bloodType).toBeUndefined()
    expect(upsertData.allergies).toBeUndefined()
    expect(upsertData.chronicConditions).toBeUndefined()
    expect(upsertData.medications).toBeUndefined()
    expect(upsertData.additionalNotes).toBeUndefined()
  })

  // ─── Medical privacy flags ignored ──────────────────────────────────────

  it('16. PATCH ignores medical privacy flags even if supplied', async () => {
    authorizeAsUser()
    setupPatchMocks()

    const req = createPatchRequest({
      firstName: 'Test',
      lastName: 'User',
      showInsuranceProviderPublic: true,
      showPreferredHospitalPublic: true,
      showPrimaryDoctorPublic: true,
      showPrimaryDoctorPhonePublic: true,
      showAdditionalNotesPublic: true,
    })
    const res = await PATCH(req)

    expect(res.status).toBe(200)

    const upsertCall = mockUpsertByUserId.mock.calls[0]
    const upsertData = upsertCall[1] as Record<string, unknown>
    expect(upsertData.showInsuranceProviderPublic).toBeUndefined()
    expect(upsertData.showPreferredHospitalPublic).toBeUndefined()
    expect(upsertData.showPrimaryDoctorPublic).toBeUndefined()
    expect(upsertData.showPrimaryDoctorPhonePublic).toBeUndefined()
    expect(upsertData.showAdditionalNotesPublic).toBeUndefined()
  })

  // ─── SafeReturn fields ignored ──────────────────────────────────────────

  it('17. PATCH ignores safeReturn fields even if supplied', async () => {
    authorizeAsUser()
    setupPatchMocks()

    const req = createPatchRequest({
      firstName: 'Test',
      lastName: 'User',
      safeReturnInstructions: 'Go to hospital',
      safeReturnLocationName: 'Hospital',
      safeReturnAddress: 'Calle 1',
      safeReturnLat: 9.0,
      safeReturnLng: -79.5,
      safeReturnContactName: 'John',
      safeReturnContactPhone: '+50760001234',
      showSafeReturnPublic: true,
      showSafeReturnLocationPublic: true,
    })
    const res = await PATCH(req)

    expect(res.status).toBe(200)

    const upsertCall = mockUpsertByUserId.mock.calls[0]
    const upsertData = upsertCall[1] as Record<string, unknown>
    expect(upsertData.safeReturnInstructions).toBeUndefined()
    expect(upsertData.safeReturnLocationName).toBeUndefined()
    expect(upsertData.safeReturnAddress).toBeUndefined()
    expect(upsertData.safeReturnLat).toBeUndefined()
    expect(upsertData.safeReturnLng).toBeUndefined()
    expect(upsertData.safeReturnContactName).toBeUndefined()
    expect(upsertData.safeReturnContactPhone).toBeUndefined()
    expect(upsertData.showSafeReturnPublic).toBeUndefined()
    expect(upsertData.showSafeReturnLocationPublic).toBeUndefined()
  })

  // ─── profileVisibilityStatus ────────────────────────────────────────────

  it('18. PATCH applies profileVisibilityStatus from the raw body', async () => {
    authorizeAsUser()
    setupPatchMocks()

    const req = createPatchRequest({
      firstName: 'Test',
      lastName: 'User',
      profileVisibilityStatus: 'hidden',
    })
    const res = await PATCH(req)

    expect(res.status).toBe(200)

    const upsertCall = mockUpsertByUserId.mock.calls[0]
    const upsertData = upsertCall[1] as Record<string, unknown>
    expect(upsertData.profileVisibilityStatus).toBe('hidden')
  })
})
