import { vi } from 'vitest'

export interface MockSessionUser {
  id: string
  email: string
  role: string
  adminRole?: string | null
  accountId?: string | null
}

export interface MockSession {
  user: MockSessionUser
}

/**
 * Default mock session for admin user.
 */
export const defaultMockSession: MockSession = {
  user: {
    id: 'test-user-id',
    email: 'admin@test.com',
    role: 'owner',
    adminRole: 'admin',
    accountId: 'test-account-id',
  },
}

/**
 * Creates a mock getServerSession return value.
 */
export function createMockSession(overrides: Partial<MockSessionUser> = {}): MockSession {
  return {
    user: {
      ...defaultMockSession.user,
      ...overrides,
    },
  }
}

/**
 * Mock for next-auth getServerSession.
 * Usage in tests:
 *   vi.mock('next-auth', () => ({ getServerSession: vi.fn() }))
 *   vi.mock('@/lib/auth', () => ({ authOptions: {} }))
 *   import { getServerSession } from 'next-auth'
 *   vi.mocked(getServerSession).mockResolvedValue(createMockSession({ adminRole: 'superadmin' }))
 */
export function mockGetServerSession(session: MockSession | null = defaultMockSession) {
  const { getServerSession } = require('next-auth')
  vi.mocked(getServerSession).mockResolvedValue(session)
}

/**
 * Clears session mock.
 */
export function clearSessionMock() {
  const { getServerSession } = require('next-auth')
  vi.mocked(getServerSession).mockReset()
}