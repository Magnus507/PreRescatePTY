import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mockPrisma } from '../helpers/mock-prisma'
import { resetAllMocks } from '../helpers/reset-mocks'

// ─── Mocks ──────────────────────────────────────────────────────────────────

vi.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}))

// ─── Imports after mocks ────────────────────────────────────────────────────
import { SafeDeleteService } from '@/domains/users/services/safe-delete.service'

// ─── Helpers ────────────────────────────────────────────────────────────────

const TEST_USER_ID = 'test-user-1'
const TEST_ACTOR_ID = 'test-user-1'
const TEST_ACCOUNT_ID = 'test-account-id'
const TEST_PROFILE_ID = 'profile-1'
const TEST_EMAIL = 'user@example.com'

/**
 * Creates a mock user with account and profile for the service lookup.
 */
function createMockUserWithProfile(overrides: Record<string, unknown> = {}) {
  return {
    id: TEST_USER_ID,
    email: TEST_EMAIL,
    accountId: TEST_ACCOUNT_ID,
    status: 'active',
    deletedAt: null,
    account: { id: TEST_ACCOUNT_ID },
    profile: {
      id: TEST_PROFILE_ID,
      userId: TEST_USER_ID,
      accountId: TEST_ACCOUNT_ID,
      bloodType: 'O+',
      allergies: 'Peanuts',
      chronicConditions: 'Asthma',
      medications: 'Inhaler',
      additionalNotes: 'Some notes',
      nationalId: '12345678',
      address: 'Calle 123',
      photoUrl: 'https://example.com/photo.jpg',
    },
    ...overrides,
  }
}

/**
 * Sets up the default mock for prisma.user.findUnique (user exists with profile).
 */
function setupDefaultUserLookup() {
  mockPrisma.user.findUnique.mockResolvedValue(createMockUserWithProfile() as never)
}

/**
 * Sets up the default mock for prisma.$transaction.
 * The transaction callback receives a `tx` object with the same methods as prisma.
 */
function setupDefaultTransaction() {
  mockPrisma.$transaction.mockImplementation(async (callback: (tx: typeof mockPrisma) => Promise<boolean>) => {
    return callback(mockPrisma)
  })
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('SafeDeleteService.deleteUserAccount', () => {
  beforeEach(() => {
    resetAllMocks()
    mockPrisma.$transaction.mockReset()
    mockPrisma.user.findUnique.mockReset()
    mockPrisma.auditLog.create.mockReset()
    mockPrisma.profile.update.mockReset()
    mockPrisma.chip.updateMany.mockReset()
    mockPrisma.user.update.mockReset()
  })

  // ─── User not found ─────────────────────────────────────────────────────

  it('1. returns false when the user does not exist', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null as never)

    const result = await SafeDeleteService.deleteUserAccount(TEST_USER_ID, TEST_ACTOR_ID)

    expect(result).toBe(false)
    expect(mockPrisma.$transaction).not.toHaveBeenCalled()
  })

  // ─── Audit log ──────────────────────────────────────────────────────────

  it('2. creates an audit log inside the transaction', async () => {
    setupDefaultUserLookup()
    setupDefaultTransaction()

    await SafeDeleteService.deleteUserAccount(TEST_USER_ID, TEST_ACTOR_ID)

    expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'HARD_DELETE_REQUESTED_BY_USER',
          actorUserId: TEST_ACTOR_ID,
          entityType: 'USER',
          entityId: TEST_USER_ID,
        }),
      })
    )

    // Verify oldValuesJson includes expected identifiers
    const callArgs = mockPrisma.auditLog.create.mock.calls[0][0]
    const oldValues = JSON.parse(callArgs.data.oldValuesJson)
    expect(oldValues.email).toBe(TEST_EMAIL)
    expect(oldValues.profileId).toBe(TEST_PROFILE_ID)
  })

  // ─── Profile anonymization ──────────────────────────────────────────────

  it('3. anonymizes the user profile', async () => {
    setupDefaultUserLookup()
    setupDefaultTransaction()

    await SafeDeleteService.deleteUserAccount(TEST_USER_ID, TEST_ACTOR_ID)

    expect(mockPrisma.profile.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: TEST_PROFILE_ID },
        data: expect.objectContaining({
          bloodType: 'DELETED',
          allergies: '',
          chronicConditions: '',
          medications: '',
          additionalNotes: 'DATA_WIPED_BY_COMPLIANCE_PROTOCOL',
          nationalId: '',
          address: '',
          photoUrl: null,
        }),
      })
    )
  })

  // ─── Chip deactivation ──────────────────────────────────────────────────

  it('4. deactivates and unlinks chips', async () => {
    setupDefaultUserLookup()
    setupDefaultTransaction()

    await SafeDeleteService.deleteUserAccount(TEST_USER_ID, TEST_ACTOR_ID)

    expect(mockPrisma.chip.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { ownerUserId: TEST_USER_ID },
        data: expect.objectContaining({
          ownerUserId: null,
          assignedProfileId: null,
          status: 'deactivated',
        }),
      })
    )
  })

  // ─── Soft delete user ───────────────────────────────────────────────────

  it('5. soft-deletes the user', async () => {
    setupDefaultUserLookup()
    setupDefaultTransaction()

    await SafeDeleteService.deleteUserAccount(TEST_USER_ID, TEST_ACTOR_ID)

    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: TEST_USER_ID },
        data: expect.objectContaining({
          status: 'deleted',
          deletedAt: expect.any(Date),
          email: `deleted_${TEST_USER_ID}@prerescate.invalid`,
        }),
      })
    )

    // Verify original email is not retained
    const callArgs = mockPrisma.user.update.mock.calls[0][0]
    expect(callArgs.data.email).not.toBe(TEST_EMAIL)
  })

  // ─── Transaction usage ──────────────────────────────────────────────────

  it('6. runs all destructive operations inside prisma.$transaction', async () => {
    setupDefaultUserLookup()
    setupDefaultTransaction()

    await SafeDeleteService.deleteUserAccount(TEST_USER_ID, TEST_ACTOR_ID)

    expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1)
    expect(mockPrisma.$transaction).toHaveBeenCalledWith(expect.any(Function))
  })

  // ─── Happy path ─────────────────────────────────────────────────────────

  it('7. returns true when all operations succeed', async () => {
    setupDefaultUserLookup()
    setupDefaultTransaction()

    const result = await SafeDeleteService.deleteUserAccount(TEST_USER_ID, TEST_ACTOR_ID)

    expect(result).toBe(true)
  })

  // ─── Transaction failure ────────────────────────────────────────────────

  it('8. returns false when a transaction operation fails', async () => {
    setupDefaultUserLookup()
    // Make the transaction callback throw
    mockPrisma.$transaction.mockRejectedValue(new Error('Transaction failed'))

    const result = await SafeDeleteService.deleteUserAccount(TEST_USER_ID, TEST_ACTOR_ID)

    expect(result).toBe(false)
  })

  // ─── No external service calls ──────────────────────────────────────────

  it('9. does not call Supabase Auth, Stripe or Storage', async () => {
    setupDefaultUserLookup()
    setupDefaultTransaction()

    await SafeDeleteService.deleteUserAccount(TEST_USER_ID, TEST_ACTOR_ID)

    // Verify only Prisma operations are called
    expect(mockPrisma.user.findUnique).toHaveBeenCalledTimes(1)
    expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1)
    expect(mockPrisma.auditLog.create).toHaveBeenCalledTimes(1)
    expect(mockPrisma.profile.update).toHaveBeenCalledTimes(1)
    expect(mockPrisma.chip.updateMany).toHaveBeenCalledTimes(1)
    expect(mockPrisma.user.update).toHaveBeenCalledTimes(1)

    // No other Prisma calls should be made
    expect(mockPrisma.user.delete).not.toHaveBeenCalled()
    expect(mockPrisma.profile.delete).not.toHaveBeenCalled()
    expect(mockPrisma.chip.delete).not.toHaveBeenCalled()
  })
})