import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { mockPrisma } from '../helpers/mock-prisma'
import { resetAllMocks } from '../helpers/reset-mocks'
import { createMockChip, createMockChipClaimToken } from '../factories/chip.factory'
import { createMockSession } from '../helpers/mock-auth'
import { CHIP_STATUS } from '@/domains/chips/chip-lifecycle.constants'

// ─── Mocks ──────────────────────────────────────────────────────────────────
// Order matters: vi.mock calls are hoisted to the top of the file.

vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({
  authOptions: {},
}))

vi.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}))

vi.mock('@/lib/rateLimit', () => ({
  rateLimit: vi.fn().mockResolvedValue({ allowed: true }),
}))

vi.mock('@/domains/accounts/services/account-state.service', () => ({
  AccountStateService: {
    getAccountState: vi.fn().mockResolvedValue({
      accountId: 'test-account-id',
      serviceStatus: 'active',
      serviceDurationMonths: 12,
      maxChipsAllocated: 3,
      maxProfilesAllocated: 1,
      packageId: 'package-1',
      packagePrice: 25,
      packageName: 'Protección Activa',
      accountType: 'personal',
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
      activeChipsCount: 0,
      physicalChipsInTransitCount: 0,
      familyProfilesCount: 0,
      contactsCount: 0,
      scansCount: 0,
      hasCompletedMedicalProfile: true,
      hasEmergencyContact: false,
      hasActivatedChip: false,
      setupChecklist: {
        medicalProfileComplete: true,
        chipActivated: false,
        emergencyContactAdded: false,
        setupComplete: false,
      },
    }),
    invalidateCache: vi.fn().mockResolvedValue(undefined),
    isMedicalProfileComplete: vi.fn().mockReturnValue(true),
  },
}))

// ─── Imports after mocks ────────────────────────────────────────────────────
import { POST } from '@/app/api/chips/activate/route'
import { getServerSession } from 'next-auth'
import { rateLimit } from '@/lib/rateLimit'
import { AccountStateService } from '@/domains/accounts/services/account-state.service'

// ─── Helpers ────────────────────────────────────────────────────────────────

function createActivateRequest(body: Record<string, unknown> = {}) {
  return new NextRequest('http://localhost/api/chips/activate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('POST /api/chips/activate — pre-transaction', () => {
  beforeEach(() => {
    resetAllMocks()

    // Default: valid session
    vi.mocked(getServerSession).mockResolvedValue(
      createMockSession() as ReturnType<typeof createMockSession> & { user: { id: string } }
    )

    // Default: rate limit allowed
    vi.mocked(rateLimit).mockResolvedValue({ allowed: true } as Awaited<ReturnType<typeof rateLimit>>)

    // Default: valid token with activatable chip
    const chip = createMockChip({ status: CHIP_STATUS.INVENTORY })
    const token = createMockChipClaimToken({ chipId: chip.id })
    mockPrisma.chipClaimToken.findUnique.mockResolvedValue({
      ...token,
      chip,
    } as never)

    // Default: profile exists and is complete
    mockPrisma.profile.findUnique.mockResolvedValue({
      id: 'profile-1',
      firstName: 'Juan',
      lastName: 'Perez',
      bloodType: 'O+',
      userId: 'test-user-id',
    } as never)
  })

  // ─── 1. No session → 401 ───────────────────────────────────────────────

  it('returns 401 when there is no session', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null)

    const req = createActivateRequest({ activationCode: 'ACT000001' })
    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(401)
    expect(json.error).toMatch(/autorizado/i)
  })

  // ─── 2. Rate limit exceeded → 429 ─────────────────────────────────────

  it('returns 429 when rate limit is exceeded', async () => {
    vi.mocked(rateLimit).mockResolvedValue({ allowed: false } as Awaited<ReturnType<typeof rateLimit>>)

    const req = createActivateRequest({ activationCode: 'ACT000001' })
    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(429)
    expect(json.error).toMatch(/intentos/i)
  })

  // ─── 3. Invalid body → 400 ────────────────────────────────────────────

  it('returns 400 when body is invalid / activationCode missing', async () => {
    const req = createActivateRequest({})
    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(400)
    expect(json.error).toBeDefined()
  })

  // ─── 4. Token not found → 404 ─────────────────────────────────────────

  it('returns 404 when activation token is not found', async () => {
    mockPrisma.chipClaimToken.findUnique.mockResolvedValue(null)

    const req = createActivateRequest({ activationCode: 'NONEXISTENT' })
    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(404)
    expect(json.error).toMatch(/inválido/i)
  })

  // ─── 5. Token already used → 409 ──────────────────────────────────────

  it('returns 409 when activation token is already used', async () => {
    const chip = createMockChip({ status: CHIP_STATUS.INVENTORY })
    const token = createMockChipClaimToken({
      chipId: chip.id,
      usedAt: new Date('2026-01-15'),
    })
    mockPrisma.chipClaimToken.findUnique.mockResolvedValue({
      ...token,
      chip,
    } as never)

    const req = createActivateRequest({ activationCode: token.activationCode })
    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(409)
    expect(json.error).toMatch(/utilizado/i)
  })

  // ─── 6. Token expired → 410 ───────────────────────────────────────────

  it('returns 410 when activation token is expired', async () => {
    const chip = createMockChip({ status: CHIP_STATUS.INVENTORY })
    const token = createMockChipClaimToken({
      chipId: chip.id,
      expiresAt: new Date('2020-01-01'),
    })
    mockPrisma.chipClaimToken.findUnique.mockResolvedValue({
      ...token,
      chip,
    } as never)

    const req = createActivateRequest({ activationCode: token.activationCode })
    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(410)
    expect(json.error).toMatch(/expirado/i)
  })

  // ─── 7. Chip not activatable → 409 ────────────────────────────────────

  it('returns 409 when chip status is not activatable', async () => {
    const chip = createMockChip({ status: CHIP_STATUS.ACTIVATED })
    const token = createMockChipClaimToken({ chipId: chip.id })
    mockPrisma.chipClaimToken.findUnique.mockResolvedValue({
      ...token,
      chip,
    } as never)

    const req = createActivateRequest({ activationCode: token.activationCode })
    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(409)
    expect(json.error).toMatch(/disponible/i)
  })
})