import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { mockPrisma } from '../helpers/mock-prisma'
import { resetAllMocks } from '../helpers/reset-mocks'

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

const mockRateLimit = vi.hoisted(() => vi.fn())
const mockGetClientIp = vi.hoisted(() => vi.fn())

vi.mock('@/lib/rateLimit', () => ({
  rateLimit: mockRateLimit,
}))

vi.mock('@/lib/request-ip', () => ({
  getClientIp: mockGetClientIp,
}))

const mockConfigGet = vi.hoisted(() => vi.fn())

vi.mock('@/domains/shared/repositories/config.repository', () => ({
  ConfigRepository: {
    get: mockConfigGet,
  },
}))

// ─── Imports after mocks ────────────────────────────────────────────────────
import { GET as GET_PROFILE } from '@/app/api/public/[shortCode]/route'
import { GET as GET_DEMO } from '@/app/api/public/demo/route'

// ─── Helpers ────────────────────────────────────────────────────────────────

function createProfileRequest(shortCode: string): NextRequest {
  return new NextRequest(`http://localhost/e/${shortCode}`)
}

function routeParams(shortCode: string): { params: Promise<{ shortCode: string }> } {
  return { params: Promise.resolve({ shortCode }) }
}

function setupDefaultMocks() {
  mockGetClientIp.mockReturnValue('127.0.0.1')
  mockRateLimit.mockResolvedValue({ allowed: true, remaining: 4, resetAt: Date.now() + 60000 })
  mockConfigGet.mockResolvedValue(null)
  mockPrisma.chip.findUnique.mockResolvedValue(null as never)
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('Public demo profile behavior', () => {
  beforeEach(() => {
    resetAllMocks()
    mockRateLimit.mockReset()
    mockGetClientIp.mockReset()
    mockConfigGet.mockReset()
    mockPrisma.chip.findUnique.mockReset()
  })

  // ─── DEMO-ADMIN-VIP works ───────────────────────────────────────────────

  it('1. GET public profile with DEMO-ADMIN-VIP returns the demo profile successfully', async () => {
    setupDefaultMocks()

    const req = createProfileRequest('DEMO-ADMIN-VIP')
    const res = await GET_PROFILE(req, routeParams('DEMO-ADMIN-VIP'))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.profile).toBeDefined()
    expect(json.profile.firstName).toBe('Carlos')
    expect(json.profile.lastName).toBe('Rodriguez')
    expect(json.profile.bloodType).toBe('O+')
    expect(json.profile.emergencyContacts).toHaveLength(2)
  })

  // ─── Demo is non-privileged ─────────────────────────────────────────────

  it('2. Demo response is clearly non-privileged', async () => {
    setupDefaultMocks()

    const req = createProfileRequest('DEMO-ADMIN-VIP')
    const res = await GET_PROFILE(req, routeParams('DEMO-ADMIN-VIP'))
    const json = await res.json()

    expect(json.profile.isVerifiedAdmin).toBe(false)
    expect(json.profile.isDemo).toBe(true)
  })

  // ─── 44R6DBNQ does not trigger demo ─────────────────────────────────────

  it('3. 44R6DBNQ does not trigger the hardcoded demo response', async () => {
    setupDefaultMocks()
    // Chip not found — route returns 404 instead of demo payload
    mockPrisma.chip.findUnique.mockResolvedValue(null as never)

    const req = createProfileRequest('44R6DBNQ')
    const res = await GET_PROFILE(req, routeParams('44R6DBNQ'))
    const json = await res.json()

    // Should NOT return demo profile
    expect(json.profile).toBeUndefined()
    expect(json.error).toBeDefined()
  })

  // ─── demo does not trigger demo ──────────────────────────────────────────

  it('4. demo does not trigger the hardcoded demo response', async () => {
    setupDefaultMocks()
    mockPrisma.chip.findUnique.mockResolvedValue(null as never)

    const req = createProfileRequest('demo')
    const res = await GET_PROFILE(req, routeParams('demo'))
    const json = await res.json()

    expect(json.profile).toBeUndefined()
    expect(json.error).toBeDefined()
  })

  // ─── DEMO does not trigger demo ──────────────────────────────────────────

  it('5. DEMO does not trigger the hardcoded demo response', async () => {
    setupDefaultMocks()
    mockPrisma.chip.findUnique.mockResolvedValue(null as never)

    const req = createProfileRequest('DEMO')
    const res = await GET_PROFILE(req, routeParams('DEMO'))
    const json = await res.json()

    expect(json.profile).toBeUndefined()
    expect(json.error).toBeDefined()
  })

  // ─── showcase does not trigger demo ──────────────────────────────────────

  it('6. showcase does not trigger the hardcoded demo response', async () => {
    setupDefaultMocks()
    mockPrisma.chip.findUnique.mockResolvedValue(null as never)

    const req = createProfileRequest('showcase')
    const res = await GET_PROFILE(req, routeParams('showcase'))
    const json = await res.json()

    expect(json.profile).toBeUndefined()
    expect(json.error).toBeDefined()
  })

  // ─── Normal shortCode goes through DB lookup ─────────────────────────────

  it('7. A normal non-demo shortCode continues through the normal repository/database lookup path', async () => {
    setupDefaultMocks()
    // Mock a real chip lookup
    mockPrisma.chip.findUnique.mockResolvedValue({
      id: 'chip-1',
      shortCode: 'ABC123',
      status: 'activated',
      serviceStatus: 'active',
      assignedProfileId: 'profile-1',
      assignedProfile: {
        id: 'profile-1',
        firstName: 'Real',
        lastName: 'User',
        displayNamePublic: 'Real User',
        sex: 'M',
        birthDate: new Date('1990-01-01'),
        profileType: 'personal',
        bloodType: '',
        allergies: '',
        chronicConditions: '',
        medications: '',
        additionalNotes: '',
        photoUrl: null,
        insuranceProvider: '',
        preferredHospital: '',
        primaryDoctorName: '',
        primaryDoctorPhone: '',
        communicationAssistance: '',
        safeReturnInstructions: '',
        safeReturnLocationName: '',
        safeReturnAddress: '',
        safeReturnContactName: '',
        safeReturnContactPhone: '',
        profileVisibilityStatus: 'active',
        showInsuranceProviderPublic: false,
        showPreferredHospitalPublic: false,
        showPrimaryDoctorPublic: false,
        showAdditionalNotesPublic: false,
        showVulnerabilityStatusPublic: false,
        showCommunicationStatusPublic: false,
        showSafeReturnPublic: false,
        showSafeReturnLocationPublic: false,
        hasCognitiveImpairment: false,
        hasWanderingRisk: false,
        isNonVerbal: false,
        safeReturnLat: null,
        safeReturnLng: null,
        contacts: [],
        organizationMembers: [],
      },
    } as never)

    const req = createProfileRequest('ABC123')
    const res = await GET_PROFILE(req, routeParams('ABC123'))
    const json = await res.json()

    // Should have gone through the normal chip lookup
    expect(mockPrisma.chip.findUnique).toHaveBeenCalled()
    expect(json.profile.firstName).toBe('Real')
  })

  // ─── Demo route returns DEMO-ADMIN-VIP ───────────────────────────────────

  it('8. GET /api/public/demo returns DEMO-ADMIN-VIP', async () => {
    setupDefaultMocks()

    const res = await GET_DEMO()
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.shortCode).toBe('DEMO-ADMIN-VIP')
  })

  // ─── Demo does not create/assign real records ────────────────────────────

  it('9. Demo profile does not create, update, activate or assign any real record', async () => {
    setupDefaultMocks()

    const req = createProfileRequest('DEMO-ADMIN-VIP')
    await GET_PROFILE(req, routeParams('DEMO-ADMIN-VIP'))

    // Verify no database operations were performed
    expect(mockPrisma.chip.findUnique).not.toHaveBeenCalled()
    expect(mockPrisma.profile.findUnique).not.toHaveBeenCalled()
    expect(mockPrisma.profile.update).not.toHaveBeenCalled()
    expect(mockPrisma.profile.create).not.toHaveBeenCalled()
    expect(mockPrisma.chip.update).not.toHaveBeenCalled()
  })

  // ─── Rate limiting still applies ─────────────────────────────────────────

  it('10. Existing public-route rate limiting still applies', async () => {
    setupDefaultMocks()
    mockRateLimit.mockResolvedValue({ allowed: false, remaining: 0, resetAt: Date.now() + 60000 })

    const req = createProfileRequest('DEMO-ADMIN-VIP')
    const res = await GET_PROFILE(req, routeParams('DEMO-ADMIN-VIP'))
    const json = await res.json()

    expect(res.status).toBe(429)
    expect(json.error).toMatch(/demasiadas/i)
  })
})
