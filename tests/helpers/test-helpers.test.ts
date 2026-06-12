import { describe, it, expect, beforeEach } from 'vitest'
import { mockPrisma, resetMockPrisma } from './mock-prisma'
import { createMockSession } from './mock-auth'
import { createMockChip, createMockChipClaimToken, resetChipCounter, resetTokenCounter } from '../factories/chip.factory'
import { createMockUser, createMockAdminUser, createMockSuperAdminUser, resetUserCounter } from '../factories/user.factory'
import { createMockProfile, resetProfileCounter } from '../factories/profile.factory'
import { createMockOrder, createMockOrderItem, resetOrderCounter } from '../factories/order.factory'
import { createMockAccount, resetAccountCounter } from '../factories/account.factory'
import { resetAllMocks } from './reset-mocks'

describe('mockPrisma', () => {
  beforeEach(() => {
    resetMockPrisma()
  })

  it('has delegates for all major models', () => {
    expect(mockPrisma.user).toBeDefined()
    expect(mockPrisma.chip).toBeDefined()
    expect(mockPrisma.order).toBeDefined()
    expect(mockPrisma.profile).toBeDefined()
    expect(mockPrisma.auditLog).toBeDefined()
  })

  it('delegates have vi.fn() methods', () => {
    expect(typeof mockPrisma.chip.findUnique).toBe('function')
    expect(typeof mockPrisma.chip.findMany).toBe('function')
    expect(typeof mockPrisma.chip.create).toBe('function')
    expect(typeof mockPrisma.chip.update).toBe('function')
  })

  it('$transaction callback receives mockPrisma', async () => {
    const result = await mockPrisma.$transaction(async (tx: Record<string, unknown>) => {
      return tx
    })
    expect(result).toBeDefined()
  })

  it('resetMockPrisma clears call history', async () => {
    await mockPrisma.chip.findUnique({ where: { id: 'test' } })
    expect(mockPrisma.chip.findUnique).toHaveBeenCalledTimes(1)
    resetMockPrisma()
    expect(mockPrisma.chip.findUnique).toHaveBeenCalledTimes(0)
  })
})

describe('mock-auth', () => {
  it('createMockSession returns default session', () => {
    const session = createMockSession()
    expect(session.user.id).toBe('test-user-id')
    expect(session.user.email).toBe('admin@test.com')
    expect(session.user.adminRole).toBe('admin')
  })

  it('createMockSession applies overrides', () => {
    const session = createMockSession({ adminRole: 'superadmin', email: 'super@test.com' })
    expect(session.user.adminRole).toBe('superadmin')
    expect(session.user.email).toBe('super@test.com')
  })
})

describe('chip factory', () => {
  beforeEach(() => {
    resetChipCounter()
  })

  it('creates mock chip with defaults', () => {
    const chip = createMockChip()
    expect(chip.id).toBe('chip-1')
    expect(chip.status).toBe('inventory')
    expect(chip.serialPublic).toBe('SER-000001')
  })

  it('applies overrides', () => {
    const chip = createMockChip({ status: 'activated', ownerUserId: 'user-1' })
    expect(chip.status).toBe('activated')
    expect(chip.ownerUserId).toBe('user-1')
  })

  it('generates unique IDs', () => {
    const chip1 = createMockChip()
    const chip2 = createMockChip()
    expect(chip1.id).not.toBe(chip2.id)
  })
})

describe('user factory', () => {
  beforeEach(() => {
    resetUserCounter()
  })

  it('creates mock user with defaults', () => {
    const user = createMockUser()
    expect(user.id).toBe('user-1')
    expect(user.isAdmin).toBe(false)
    expect(user.role).toBe('owner')
  })

  it('creates admin user', () => {
    const admin = createMockAdminUser()
    expect(admin.isAdmin).toBe(true)
    expect(admin.adminRole).toBe('admin')
  })

  it('creates superadmin user', () => {
    const superadmin = createMockSuperAdminUser()
    expect(superadmin.isAdmin).toBe(true)
    expect(superadmin.adminRole).toBe('superadmin')
  })

  it('applies overrides', () => {
    const user = createMockUser({ email: 'custom@test.com', role: 'owner' })
    expect(user.email).toBe('custom@test.com')
  })
})

describe('profile factory', () => {
  beforeEach(() => {
    resetProfileCounter()
  })

  it('creates mock profile with defaults', () => {
    const profile = createMockProfile()
    expect(profile.id).toBe('profile-1')
    expect(profile.firstName).toBe('Juan')
    expect(profile.bloodType).toBe('O+')
    expect(profile.profileType).toBe('personal')
  })

  it('applies overrides', () => {
    const profile = createMockProfile({ firstName: 'Maria', bloodType: 'A+' })
    expect(profile.firstName).toBe('Maria')
    expect(profile.bloodType).toBe('A+')
  })
})

describe('order factory', () => {
  beforeEach(() => {
    resetOrderCounter()
  })

  it('creates mock order with defaults', () => {
    const order = createMockOrder()
    expect(order.id).toBe('order-1')
    expect(order.amount).toBe(25.0)
    expect(order.orderStatus).toBe('pending')
    expect(order.orderType).toBe('manual')
  })

  it('applies overrides', () => {
    const order = createMockOrder({ amount: 50.0, orderStatus: 'approved' })
    expect(order.amount).toBe(50.0)
    expect(order.orderStatus).toBe('approved')
  })

  it('creates mock order item', () => {
    const item = createMockOrderItem()
    expect(item.id).toBe('order-item-1')
    expect(item.quantity).toBe(1)
  })
})

describe('chip claim token factory', () => {
  beforeEach(() => {
    resetTokenCounter()
  })

  it('creates mock token with defaults', () => {
    const token = createMockChipClaimToken()
    expect(token.id).toBe('token-1')
    expect(token.activationCode).toBe('ACT000001')
    expect(token.usedAt).toBeNull()
    expect(token.orderId).toBeNull()
  })

  it('applies overrides', () => {
    const token = createMockChipClaimToken({
      activationCode: 'CUSTOM123',
      usedAt: new Date(),
      orderId: 'order-1',
    })
    expect(token.activationCode).toBe('CUSTOM123')
    expect(token.usedAt).toBeInstanceOf(Date)
    expect(token.orderId).toBe('order-1')
  })

  it('generates unique IDs', () => {
    const t1 = createMockChipClaimToken()
    const t2 = createMockChipClaimToken()
    expect(t1.id).not.toBe(t2.id)
    expect(t1.activationCode).not.toBe(t2.activationCode)
  })
})

describe('account factory', () => {
  beforeEach(() => {
    resetAccountCounter()
  })

  it('creates mock account with defaults', () => {
    const account = createMockAccount()
    expect(account.id).toBe('account-1')
    expect(account.accountType).toBe('personal')
    expect(account.status).toBe('active')
    expect(account.maxChipsAllocated).toBe(3)
    expect(account.maxProfilesAllocated).toBe(1)
  })

  it('applies overrides', () => {
    const account = createMockAccount({
      accountType: 'company',
      maxChipsAllocated: 10,
      status: 'inactive',
    })
    expect(account.accountType).toBe('company')
    expect(account.maxChipsAllocated).toBe(10)
    expect(account.status).toBe('inactive')
  })

  it('generates unique IDs', () => {
    const a1 = createMockAccount()
    const a2 = createMockAccount()
    expect(a1.id).not.toBe(a2.id)
  })
})

describe('resetAllMocks', () => {
  it('resets all mocks and counters', async () => {
    // Create some data
    createMockChip()
    createMockChipClaimToken()
    createMockUser()
    createMockProfile()
    createMockOrder()
    createMockAccount()
    await mockPrisma.chip.findUnique({ where: { id: 'test' } })

    // Reset
    resetAllMocks()

    // Verify counters are reset
    const chip = createMockChip()
    expect(chip.id).toBe('chip-1')

    const token = createMockChipClaimToken()
    expect(token.id).toBe('token-1')

    const user = createMockUser()
    expect(user.id).toBe('user-1')

    const account = createMockAccount()
    expect(account.id).toBe('account-1')

    // Verify mock calls are cleared
    expect(mockPrisma.chip.findUnique).toHaveBeenCalledTimes(0)
  })
})