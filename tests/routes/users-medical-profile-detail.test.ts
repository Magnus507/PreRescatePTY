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

const mockInvalidateCache = vi.hoisted(() => vi.fn())
const mockFindById = vi.hoisted(() => vi.fn())
const mockProfileUpdate = vi.hoisted(() => vi.fn())

vi.mock('@/domains/accounts/services/account-state.service', () => ({
  AccountStateService: {
    invalidateCache: mockInvalidateCache,
  },
}))

vi.mock('@/domains/profiles/repositories/profile.repository', () => ({
  ProfileRepository: {
    findById: mockFindById,
    update: mockProfileUpdate,
  },
}))

// ─── Imports after mocks ────────────────────────────────────────────────────
import { GET, PATCH, DELETE } from '@/app/api/users/perfiles-medicos/[profileId]/route'
import { getServerSession } from 'next-auth'

// ─── Helpers ────────────────────────────────────────────────────────────────

const TEST_USER_ID = 'test-user-1'
const TEST_ACCOUNT_ID = 'test-account-id'
const TEST_PROFILE_ID = 'profile-1'

/**
 * Route params for /api/users/perfiles-medicos/[profileId]
 */
function routeParams(profileId = TEST_PROFILE_ID): { params: Promise<{ profileId: string }> } {
  return { params: Promise.resolve({ profileId }) }
}

/**
 * Configures getServerSession to return a valid session.
 */
function authorizeAsUser(overrides: Record<string, unknown> = {}): void {
  vi.mocked(getServerSession).mockResolvedValue(
    createMockSession({ id: TEST_USER_ID, role: 'owner', ...overrides }) as never
  )
}

/**
 * Default mocked profile returned by prisma.profile.findFirst (the ownership check).
 */
function createDefaultDbProfile(overrides: Record<string, unknown> = {}) {
  return createMockProfile({
    id: TEST_PROFILE_ID,
    userId: null,
    accountId: TEST_ACCOUNT_ID,
    firstName: 'Family',
    lastName: 'Member',
    ...overrides,
  })
}

/**
 * Sets up the standard mocks for the getAuthorizedProfile internal function.
 */
function setupAuthorizedProfile(dbProfile: ReturnType<typeof createMockProfile> | null = null) {
  const profile = dbProfile ?? createDefaultDbProfile()
  mockPrisma.user.findUnique.mockResolvedValue({ accountId: TEST_ACCOUNT_ID } as never)
  mockPrisma.profile.findFirst.mockResolvedValue(profile as never)
  mockFindById.mockResolvedValue(profile as never)
  mockInvalidateCache.mockResolvedValue(undefined as never)
  mockProfileUpdate.mockResolvedValue(profile as never)
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('GET/PATCH/DELETE /api/users/perfiles-medicos/[profileId]', () => {
  beforeEach(() => {
    resetAllMocks()
    mockInvalidateCache.mockReset()
    mockFindById.mockReset()
    mockProfileUpdate.mockReset()
  })

  // ─── Auth ───────────────────────────────────────────────────────────────

  it('1. GET returns 401 without an authenticated session', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null)

    const req = new NextRequest('http://localhost/api/users/perfiles-medicos/profile-1')
    const res = await GET(req, routeParams())
    const json = await res.json()

    expect(res.status).toBe(401)
    expect(json.error).toMatch(/autorizado/i)
  })

  it('2. PATCH returns 401 without an authenticated session', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null)

    const req = new NextRequest('http://localhost/api/users/perfiles-medicos/profile-1', {
      method: 'PATCH',
      body: JSON.stringify({ firstName: 'Test' }),
    })
    const res = await PATCH(req, routeParams())
    const json = await res.json()

    expect(res.status).toBe(401)
    expect(json.error).toMatch(/autorizado/i)
    expect(mockProfileUpdate).not.toHaveBeenCalled()
  })

  it('3. DELETE returns 401 without an authenticated session', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null)

    const req = new NextRequest('http://localhost/api/users/perfiles-medicos/profile-1', {
      method: 'DELETE',
    })
    const res = await DELETE(req, routeParams())
    const json = await res.json()

    expect(res.status).toBe(401)
    expect(json.error).toMatch(/autorizado/i)
    expect(mockPrisma.profile.delete).not.toHaveBeenCalled()
  })

  // ─── Ownership ──────────────────────────────────────────────────────────

  it('4. GET returns 404 when the authenticated user has no accountId', async () => {
    authorizeAsUser()
    // User has no accountId
    mockPrisma.user.findUnique.mockResolvedValue({ accountId: null } as never)

    const req = new NextRequest('http://localhost/api/users/perfiles-medicos/profile-1')
    const res = await GET(req, routeParams())
    const json = await res.json()

    expect(res.status).toBe(404)
    expect(json.error).toMatch(/no encontrado/i)
  })

  it('5. GET returns 404 when the profile does not belong to the authenticated user\'s account', async () => {
    authorizeAsUser()
    // User has accountId, but profile is not found (different account)
    mockPrisma.user.findUnique.mockResolvedValue({ accountId: TEST_ACCOUNT_ID } as never)
    mockPrisma.profile.findFirst.mockResolvedValue(null as never)

    const req = new NextRequest('http://localhost/api/users/perfiles-medicos/profile-1')
    const res = await GET(req, routeParams())
    const json = await res.json()

    expect(res.status).toBe(404)
    expect(json.error).toMatch(/no encontrado/i)
  })

  it('6. PATCH returns 404 when the profile does not belong to the authenticated user\'s account', async () => {
    authorizeAsUser()
    mockPrisma.user.findUnique.mockResolvedValue({ accountId: TEST_ACCOUNT_ID } as never)
    mockPrisma.profile.findFirst.mockResolvedValue(null as never)

    const req = new NextRequest('http://localhost/api/users/perfiles-medicos/profile-1', {
      method: 'PATCH',
      body: JSON.stringify({ firstName: 'Test' }),
    })
    const res = await PATCH(req, routeParams())
    const json = await res.json()

    expect(res.status).toBe(404)
    expect(json.error).toMatch(/no encontrado/i)
    expect(mockProfileUpdate).not.toHaveBeenCalled()
  })

  // ─── GET happy path ─────────────────────────────────────────────────────

  it('7. GET returns the decrypted profile for an authorized user', async () => {
    authorizeAsUser()

    const dbProfile = createDefaultDbProfile()
    const decryptedProfile = createMockProfile({
      id: TEST_PROFILE_ID,
      userId: null,
      accountId: TEST_ACCOUNT_ID,
      firstName: 'Family',
      lastName: 'Member',
    })

    // getAuthorizedProfile calls these two
    mockPrisma.user.findUnique.mockResolvedValue({ accountId: TEST_ACCOUNT_ID } as never)
    mockPrisma.profile.findFirst.mockResolvedValue(dbProfile as never)
    // ProfileRepository.findById returns the "decrypted" version
    mockFindById.mockResolvedValue(decryptedProfile as never)

    const req = new NextRequest('http://localhost/api/users/perfiles-medicos/profile-1')
    const res = await GET(req, routeParams())
    const json = await res.json()

    expect(res.status).toBe(200)

    // Verify getAuthorizedProfile calls
    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: TEST_USER_ID } })
    )
    expect(mockPrisma.profile.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: TEST_PROFILE_ID,
          accountId: TEST_ACCOUNT_ID,
        }),
      })
    )

    // Verify ProfileRepository.findById is called with the profile id
    expect(mockFindById).toHaveBeenCalledWith(TEST_PROFILE_ID)

    // Verify response
    expect(json.profile).toBeDefined()
    expect(json.profile.id).toBe(TEST_PROFILE_ID)
    expect(json.profile.firstName).toBe('Family')
    expect(json.profile.lastName).toBe('Member')
  })
})