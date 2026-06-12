export interface MockUser {
  id: string
  accountId: string | null
  email: string
  phone: string | null
  passwordHash: string
  role: string
  isAdmin: boolean
  adminRole: string | null
  status: string
  createdAt: Date
  updatedAt: Date
  lastLoginAt: Date | null
  mfaSecret: string | null
  mfaEnabled: boolean
  deletedAt: Date | null
}

let userCounter = 0

export function createMockUser(overrides: Partial<MockUser> = {}): MockUser {
  userCounter++
  const id = `user-${userCounter}`
  return {
    id,
    accountId: 'test-account-id',
    email: `user${userCounter}@test.com`,
    phone: null,
    passwordHash: '$2a$12$hashedpassword',
    role: 'owner',
    isAdmin: false,
    adminRole: null,
    status: 'active',
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    lastLoginAt: null,
    mfaSecret: null,
    mfaEnabled: false,
    deletedAt: null,
    ...overrides,
  }
}

export function createMockAdminUser(overrides: Partial<MockUser> = {}): MockUser {
  return createMockUser({
    isAdmin: true,
    adminRole: 'admin',
    ...overrides,
  })
}

export function createMockSuperAdminUser(overrides: Partial<MockUser> = {}): MockUser {
  return createMockUser({
    isAdmin: true,
    adminRole: 'superadmin',
    ...overrides,
  })
}

export function resetUserCounter(): void {
  userCounter = 0
}