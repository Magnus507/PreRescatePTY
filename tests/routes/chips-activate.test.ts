import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { mockPrisma } from '../helpers/mock-prisma'
import { resetAllMocks } from '../helpers/reset-mocks'
import { createMockChip, createMockChipClaimToken } from '../factories/chip.factory'
import { createMockProfile } from '../factories/profile.factory'
import { createMockAccount } from '../factories/account.factory'
import { createMockSession } from '../helpers/mock-auth'
import { createMockOrganizationMember } from '../factories/organization-member.factory'
import { createMockCorporateOrderEmployeeItem } from '../factories/corporate-order-employee-item.factory'
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

// ─── Shared setup ──────────────────────────────────────────────────────────

function preTransactionDefaults() {
  vi.mocked(getServerSession).mockResolvedValue(
    createMockSession() as ReturnType<typeof createMockSession> & { user: { id: string } }
  )
  vi.mocked(rateLimit).mockResolvedValue({ allowed: true } as Awaited<ReturnType<typeof rateLimit>>)

  const chip = createMockChip({ status: CHIP_STATUS.INVENTORY })
  const token = createMockChipClaimToken({ chipId: chip.id })
  mockPrisma.chipClaimToken.findUnique.mockResolvedValue({
    ...token,
    chip,
  } as never)
  mockPrisma.profile.findUnique.mockResolvedValue({
    id: 'profile-1',
    firstName: 'Juan',
    lastName: 'Perez',
    bloodType: 'O+',
    userId: 'test-user-id',
  } as never)

  return { chip, token }
}

function transactionHappyPathDefaults(overrides: {
  chip: ReturnType<typeof createMockChip>
  token: ReturnType<typeof createMockChipClaimToken>
  profile?: ReturnType<typeof createMockProfile>
}) {
  const { chip, token } = overrides
  const profile = overrides.profile || createMockProfile({ userId: 'test-user-id', id: 'profile-1' })
  const account = createMockAccount({ maxChipsAllocated: 3 })

  mockPrisma.chipClaimToken.updateMany.mockResolvedValue({ count: 1 } as never)
  mockPrisma.account.findUnique.mockResolvedValue(account as never)
  mockPrisma.chip.count.mockResolvedValue(0 as never)
  mockPrisma.corporateOrderEmployeeItem.findFirst.mockResolvedValue(null as never)
  mockPrisma.profile.findFirst.mockResolvedValue(profile as never)
  mockPrisma.chip.updateMany.mockResolvedValue({ count: 1 } as never)
  mockPrisma.auditLog.create.mockResolvedValue({ id: 'audit-1' } as never)
}

function wrapTransactionErrorsAsHttp400() {
  mockPrisma.$transaction.mockImplementationOnce(async (fn: Parameters<typeof mockPrisma.$transaction>[0]) => {
    try {
      // The transaction callback is what exercises the route's internal error path.
      // This wrapper preserves the thrown error but marks it as HTTP 400 so the
      // route's outer catch can expose the expected client-facing status.
      return await fn(mockPrisma)
    } catch (error) {
      throw Object.assign(error instanceof Error ? error : new Error('Transaction error'), {
        status: 400,
      })
    }
  })
}

// ─── Pre-transaction error tests ──────────────────────────────────────────

describe('POST /api/chips/activate — pre-transaction', () => {
  beforeEach(() => {
    resetAllMocks()
    preTransactionDefaults()
  })

  it('returns 401 when there is no session', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null)
    const req = createActivateRequest({ activationCode: 'ACT000001' })
    const res = await POST(req)
    const json = await res.json()
    expect(res.status).toBe(401)
    expect(json.error).toMatch(/autorizado/i)
  })

  it('returns 429 when rate limit is exceeded', async () => {
    vi.mocked(rateLimit).mockResolvedValue({ allowed: false } as Awaited<ReturnType<typeof rateLimit>>)
    const req = createActivateRequest({ activationCode: 'ACT000001' })
    const res = await POST(req)
    const json = await res.json()
    expect(res.status).toBe(429)
    expect(json.error).toMatch(/intentos/i)
  })

  it('returns 400 when body is invalid / activationCode missing', async () => {
    const req = createActivateRequest({})
    const res = await POST(req)
    const json = await res.json()
    expect(res.status).toBe(400)
    expect(json.error).toBeDefined()
  })

  it('returns 404 when activation token is not found', async () => {
    mockPrisma.chipClaimToken.findUnique.mockResolvedValue(null)
    const req = createActivateRequest({ activationCode: 'NONEXISTENT' })
    const res = await POST(req)
    const json = await res.json()
    expect(res.status).toBe(404)
    expect(json.error).toMatch(/inválido/i)
  })

  it('returns 409 when activation token is already used', async () => {
    const chip = createMockChip({ status: CHIP_STATUS.INVENTORY })
    const token = createMockChipClaimToken({ chipId: chip.id, usedAt: new Date('2026-01-15') })
    mockPrisma.chipClaimToken.findUnique.mockResolvedValue({ ...token, chip } as never)
    const req = createActivateRequest({ activationCode: token.activationCode })
    const res = await POST(req)
    const json = await res.json()
    expect(res.status).toBe(409)
    expect(json.error).toMatch(/utilizado/i)
  })

  it('returns 410 when activation token is expired', async () => {
    const chip = createMockChip({ status: CHIP_STATUS.INVENTORY })
    const token = createMockChipClaimToken({ chipId: chip.id, expiresAt: new Date('2020-01-01') })
    mockPrisma.chipClaimToken.findUnique.mockResolvedValue({ ...token, chip } as never)
    const req = createActivateRequest({ activationCode: token.activationCode })
    const res = await POST(req)
    const json = await res.json()
    expect(res.status).toBe(410)
    expect(json.error).toMatch(/expirado/i)
  })

  it('returns 409 when chip status is not activatable', async () => {
    const chip = createMockChip({ status: CHIP_STATUS.ACTIVATED })
    const token = createMockChipClaimToken({ chipId: chip.id })
    mockPrisma.chipClaimToken.findUnique.mockResolvedValue({ ...token, chip } as never)
    const req = createActivateRequest({ activationCode: token.activationCode })
    const res = await POST(req)
    const json = await res.json()
    expect(res.status).toBe(409)
    expect(json.error).toMatch(/disponible/i)
  })
})

// ─── Transaction error tests ──────────────────────────────────────────────

describe('POST /api/chips/activate — transaction errors', () => {
  beforeEach(() => {
    resetAllMocks()
    const { chip, token } = preTransactionDefaults()
    transactionHappyPathDefaults({ chip, token })
  })

  it('returns 400 when the plan chip limit is reached', async () => {
    wrapTransactionErrorsAsHttp400()
    mockPrisma.account.findUnique.mockResolvedValue(createMockAccount({ maxChipsAllocated: 0 }) as never)
    mockPrisma.chip.count.mockResolvedValue(0 as never)

    const req = createActivateRequest({ activationCode: 'ACT000001' })
    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(400)
    expect(json.error).toMatch(/límite/i)
  })

  it('returns 400 when token consumption inside the transaction affects zero rows', async () => {
    mockPrisma.chipClaimToken.updateMany.mockResolvedValue({ count: 0 } as never)

    const req = createActivateRequest({ activationCode: 'ACT000001' })
    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(400)
    expect(json.error).toMatch(/usado|expirado/i)
  })

  it('returns 400 when chip activation inside the transaction affects zero rows', async () => {
    mockPrisma.chip.updateMany.mockResolvedValue({ count: 0 } as never)

    const req = createActivateRequest({ activationCode: 'ACT000001' })
    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(400)
    expect(json.error).toMatch(/activarse/i)
  })

  it('returns 400 when the profile is missing inside the transaction', async () => {
    mockPrisma.profile.findFirst.mockResolvedValue(null)

    const req = createActivateRequest({ activationCode: 'ACT000001' })
    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(400)
    expect(json.error).toMatch(/perfil médico/i)
  })
})

// ─── Happy path tests ──────────────────────────────────────────────────────

describe('POST /api/chips/activate — happy path', () => {
  beforeEach(() => {
    resetAllMocks()
    const { chip, token } = preTransactionDefaults()
    transactionHappyPathDefaults({ chip, token })
  })

  it('activates chip successfully without profileId', async () => {
    const req = createActivateRequest({ activationCode: 'ACT000001' })
    const res = await POST(req)
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.message).toMatch(/exitosamente/i)
  })

  it('activates chip successfully with valid profileId', async () => {
    const req = createActivateRequest({ activationCode: 'ACT000001', profileId: 'profile-1' })
    const res = await POST(req)
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.message).toMatch(/exitosamente/i)
  })

  it('response includes chip shortCode, serialPublic, nfcUrl and qrUrl', async () => {
    const chip = createMockChip({
      status: CHIP_STATUS.INVENTORY,
      shortCode: 'SC1234',
      serialPublic: 'SER-001',
      nfcUrl: 'https://prerescatepty.com/nfc/chip-1',
      qrUrl: 'https://prerescatepty.com/qr/chip-1',
    })
    const token = createMockChipClaimToken({ chipId: chip.id })
    mockPrisma.chipClaimToken.findUnique.mockResolvedValue({ ...token, chip } as never)
    transactionHappyPathDefaults({ chip, token })

    const req = createActivateRequest({ activationCode: token.activationCode })
    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.chip.shortCode).toBe('SC1234')
    expect(json.chip.serialPublic).toBe('SER-001')
    expect(json.chip.nfcUrl).toMatch(/prerescatepty/)
    expect(json.chip.qrUrl).toMatch(/prerescatepty/)
  })

  it('invalidates account state cache after successful activation', async () => {
    const req = createActivateRequest({ activationCode: 'ACT000001' })
    const res = await POST(req)
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(AccountStateService.invalidateCache).toHaveBeenCalledWith('test-user-id')
  })

  it('creates audit log after successful activation', async () => {
    const req = createActivateRequest({ activationCode: 'ACT000001' })
    const res = await POST(req)
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          actorUserId: 'test-user-id',
          entityType: 'chip',
          action: 'activate',
        }),
      })
    )
  })
})

// ─── Corporate flow tests ─────────────────────────────────────────────────

describe('POST /api/chips/activate — corporate flow', () => {
  beforeEach(() => {
    resetAllMocks()
  })

  /**
   * Sets up a full corporate happy-path scenario.
   * Must be called inside each test's body AFTER resetAllMocks/preTransactionDefaults.
   */
  function setupCorporateHappyPath() {
    const { chip, token } = preTransactionDefaults()
    const account = createMockAccount({ maxChipsAllocated: 3 })
    const member = createMockOrganizationMember({
      corporateProfileId: 'corp-profile-1',
      corporateStatus: 'paid_active',
    })
    const corporateProfile = createMockProfile({
      id: 'corp-profile-1',
      userId: 'test-user-id',
      accountId: 'test-account-id',
      profileType: 'corporate',
      firstName: 'Empresa',
      lastName: 'Corp',
      bloodType: 'A+',
    })
    const corpItem = createMockCorporateOrderEmployeeItem({ chipId: chip.id })

    mockPrisma.chipClaimToken.updateMany.mockResolvedValue({ count: 1 } as never)
    mockPrisma.account.findUnique.mockResolvedValue(account as never)
    mockPrisma.chip.count.mockResolvedValue(0 as never)
    mockPrisma.corporateOrderEmployeeItem.findFirst.mockResolvedValue({
      ...corpItem,
      organizationMember: member,
    } as never)
    // Reset profile.findUnique to control the exact call sequence
    mockPrisma.profile.findUnique.mockReset()
    // Call 1: pre-transaction personal profile lookup
    mockPrisma.profile.findUnique.mockResolvedValueOnce({
      id: 'profile-1',
      firstName: 'Juan',
      lastName: 'Perez',
      bloodType: 'O+',
      userId: 'test-user-id',
    } as never)
    // Call 2: in-transaction corporate profile lookup
    mockPrisma.profile.findUnique.mockResolvedValueOnce(corporateProfile as never)
    // Call 3: in-transaction user profile accountId check
    mockPrisma.profile.findUnique.mockResolvedValueOnce({ id: 'user-profile-1', accountId: 'test-account-id' } as never)
    mockPrisma.chip.updateMany.mockResolvedValue({ count: 1 } as never)
    mockPrisma.corporateOrderEmployeeItem.updateMany.mockResolvedValue({ count: 1 } as never)
    mockPrisma.auditLog.create.mockResolvedValue({ id: 'audit-1' } as never)

    return { chip, token, corporateProfile, member, corpItem }
  }

  // ── Corporate happy path ──

  it('1. returns 200 for successful corporate chip activation', async () => {
    setupCorporateHappyPath()
    const req = createActivateRequest({ activationCode: 'ACT000001' })
    const res = await POST(req)
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.message).toMatch(/exitosamente/i)
  })

  // ── Corporate error: missing organizationMember ──

  it('2. returns 400 when organizationMember is missing', async () => {
    const { chip } = preTransactionDefaults()
    const account = createMockAccount({ maxChipsAllocated: 3 })
    const corpItem = createMockCorporateOrderEmployeeItem({ chipId: chip.id })

    mockPrisma.chipClaimToken.updateMany.mockResolvedValue({ count: 1 } as never)
    mockPrisma.account.findUnique.mockResolvedValue(account as never)
    mockPrisma.chip.count.mockResolvedValue(0 as never)
    mockPrisma.corporateOrderEmployeeItem.findFirst.mockResolvedValue({
      ...corpItem,
      organizationMember: null,
    } as never)

    const req = createActivateRequest({ activationCode: 'ACT000001' })
    const res = await POST(req)
    const json = await res.json()
    expect(res.status).toBe(400)
    expect(json.error).toMatch(/vinculado/i)
  })

  // ── Corporate error: invalid corporateStatus ──

  it('3. returns 403 when corporateStatus is not paid_active', async () => {
    const { chip } = preTransactionDefaults()
    const account = createMockAccount({ maxChipsAllocated: 3 })
    const member = createMockOrganizationMember({
      corporateProfileId: 'corp-profile-1',
      corporateStatus: 'suspended',
    })
    const corpItem = createMockCorporateOrderEmployeeItem({ chipId: chip.id })

    mockPrisma.chipClaimToken.updateMany.mockResolvedValue({ count: 1 } as never)
    mockPrisma.account.findUnique.mockResolvedValue(account as never)
    mockPrisma.chip.count.mockResolvedValue(0 as never)
    mockPrisma.corporateOrderEmployeeItem.findFirst.mockResolvedValue({
      ...corpItem,
      organizationMember: member,
    } as never)

    const req = createActivateRequest({ activationCode: 'ACT000001' })
    const res = await POST(req)
    const json = await res.json()
    expect(res.status).toBe(403)
    expect(json.error).toMatch(/activo/i)
  })

  // ── Corporate error: missing corporateProfileId ──

  it('4. returns 400 when corporateProfileId is missing', async () => {
    const { chip } = preTransactionDefaults()
    const account = createMockAccount({ maxChipsAllocated: 3 })
    const member = createMockOrganizationMember({
      corporateProfileId: null,
      corporateStatus: 'paid_active',
    })
    const corpItem = createMockCorporateOrderEmployeeItem({ chipId: chip.id })

    mockPrisma.chipClaimToken.updateMany.mockResolvedValue({ count: 1 } as never)
    mockPrisma.account.findUnique.mockResolvedValue(account as never)
    mockPrisma.chip.count.mockResolvedValue(0 as never)
    mockPrisma.corporateOrderEmployeeItem.findFirst.mockResolvedValue({
      ...corpItem,
      organizationMember: member,
    } as never)

    const req = createActivateRequest({ activationCode: 'ACT000001' })
    const res = await POST(req)
    const json = await res.json()
    expect(res.status).toBe(400)
    expect(json.error).toMatch(/configurado/i)
  })

  // ── Corporate error: corporate profile not found ──

  it('5. returns 400 when corporate profile is not found', async () => {
    const { chip } = preTransactionDefaults()
    const account = createMockAccount({ maxChipsAllocated: 3 })
    const member = createMockOrganizationMember({
      corporateProfileId: 'corp-profile-1',
      corporateStatus: 'paid_active',
    })
    const corpItem = createMockCorporateOrderEmployeeItem({ chipId: chip.id })

    mockPrisma.chipClaimToken.updateMany.mockResolvedValue({ count: 1 } as never)
    mockPrisma.account.findUnique.mockResolvedValue(account as never)
    mockPrisma.chip.count.mockResolvedValue(0 as never)
    mockPrisma.corporateOrderEmployeeItem.findFirst.mockResolvedValue({
      ...corpItem,
      organizationMember: member,
    } as never)
    // Reset and sequence profile.findUnique calls
    mockPrisma.profile.findUnique.mockReset()
    // Call 1: pre-transaction personal profile
    mockPrisma.profile.findUnique.mockResolvedValueOnce({
      id: 'profile-1',
      firstName: 'Juan',
      lastName: 'Perez',
      bloodType: 'O+',
      userId: 'test-user-id',
    } as never)
    // Call 2: in-transaction corporate profile — not found
    mockPrisma.profile.findUnique.mockResolvedValueOnce(null as never)

    const req = createActivateRequest({ activationCode: 'ACT000001' })
    const res = await POST(req)
    const json = await res.json()
    expect(res.status).toBe(400)
    expect(json.error).toMatch(/perfil empresarial/i)
  })

  // ── Corporate error: profileType is not corporate ──

  it('6. returns 400 when profileType is not corporate', async () => {
    const { chip } = preTransactionDefaults()
    const account = createMockAccount({ maxChipsAllocated: 3 })
    const member = createMockOrganizationMember({
      corporateProfileId: 'corp-profile-1',
      corporateStatus: 'paid_active',
    })
    const corpItem = createMockCorporateOrderEmployeeItem({ chipId: chip.id })
    const personalProfile = createMockProfile({
      id: 'corp-profile-1',
      profileType: 'personal',
    })

    mockPrisma.chipClaimToken.updateMany.mockResolvedValue({ count: 1 } as never)
    mockPrisma.account.findUnique.mockResolvedValue(account as never)
    mockPrisma.chip.count.mockResolvedValue(0 as never)
    mockPrisma.corporateOrderEmployeeItem.findFirst.mockResolvedValue({
      ...corpItem,
      organizationMember: member,
    } as never)
    // Reset and sequence profile.findUnique calls
    mockPrisma.profile.findUnique.mockReset()
    // Call 1: pre-transaction personal profile
    mockPrisma.profile.findUnique.mockResolvedValueOnce({
      id: 'profile-1',
      firstName: 'Juan',
      lastName: 'Perez',
      bloodType: 'O+',
      userId: 'test-user-id',
    } as never)
    // Call 2: in-transaction corporate profile — wrong type
    mockPrisma.profile.findUnique.mockResolvedValueOnce(personalProfile as never)

    const req = createActivateRequest({ activationCode: 'ACT000001' })
    const res = await POST(req)
    const json = await res.json()
    expect(res.status).toBe(400)
    expect(json.error).toMatch(/perfil empresarial/i)
  })

  // ── Corporate error: accountId mismatch ──

  it('7. returns 403 when corporate profile accountId differs from user profile accountId', async () => {
    const { chip } = preTransactionDefaults()
    const account = createMockAccount({ maxChipsAllocated: 3 })
    const member = createMockOrganizationMember({
      corporateProfileId: 'corp-profile-1',
      corporateStatus: 'paid_active',
    })
    const corpItem = createMockCorporateOrderEmployeeItem({ chipId: chip.id })
    const corporateProfile = createMockProfile({
      id: 'corp-profile-1',
      accountId: 'corp-account-id',
      profileType: 'corporate',
    })

    mockPrisma.chipClaimToken.updateMany.mockResolvedValue({ count: 1 } as never)
    mockPrisma.account.findUnique.mockResolvedValue(account as never)
    mockPrisma.chip.count.mockResolvedValue(0 as never)
    mockPrisma.corporateOrderEmployeeItem.findFirst.mockResolvedValue({
      ...corpItem,
      organizationMember: member,
    } as never)
    // Reset and sequence profile.findUnique calls
    mockPrisma.profile.findUnique.mockReset()
    // Call 1: pre-transaction personal profile
    mockPrisma.profile.findUnique.mockResolvedValueOnce({
      id: 'profile-1',
      firstName: 'Juan',
      lastName: 'Perez',
      bloodType: 'O+',
      userId: 'test-user-id',
    } as never)
    // Call 2: in-transaction corporate profile — different account
    mockPrisma.profile.findUnique.mockResolvedValueOnce(corporateProfile as never)
    // Call 3: in-transaction user profile — different account
    mockPrisma.profile.findUnique.mockResolvedValueOnce({ id: 'user-profile-1', accountId: 'user-account-id' } as never)

    const req = createActivateRequest({ activationCode: 'ACT000001' })
    const res = await POST(req)
    const json = await res.json()
    expect(res.status).toBe(403)
    expect(json.error).toMatch(/pertenece/i)
  })

  // ── Corporate error: incomplete medical profile ──

  it('8. returns 400 when corporate medical profile is incomplete', async () => {
    setupCorporateHappyPath()
    // Override isMedicalProfileComplete: first call (personal) returns true,
    // second call (corporate) returns false
    vi.mocked(AccountStateService.isMedicalProfileComplete)
      .mockReturnValueOnce(true)
      .mockReturnValueOnce(false)

    const req = createActivateRequest({ activationCode: 'ACT000001' })
    const res = await POST(req)
    const json = await res.json()
    expect(res.status).toBe(400)
    expect(json.error).toMatch(/perfil empresarial/i)
  })

  // ── Corporate side-effect: marks item as activated ──

  it('9. marks CorporateOrderEmployeeItem as activated on success', async () => {
    const { chip } = setupCorporateHappyPath()
    const req = createActivateRequest({ activationCode: 'ACT000001' })
    const res = await POST(req)
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(mockPrisma.corporateOrderEmployeeItem.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ chipId: chip.id }),
        data: expect.objectContaining({ fulfillmentStatus: 'activated' }),
      })
    )
  })

  // ── Corporate side-effect: uses corporateProfileId as assignedProfileId ──

  it('10. uses the corporateProfileId as the assigned profile', async () => {
    const { chip } = setupCorporateHappyPath()
    const req = createActivateRequest({ activationCode: 'ACT000001' })
    const res = await POST(req)
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(mockPrisma.chip.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: chip.id }),
        data: expect.objectContaining({ assignedProfileId: 'corp-profile-1' }),
      })
    )
  })
})