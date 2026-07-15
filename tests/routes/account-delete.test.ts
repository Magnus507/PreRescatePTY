import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { mockPrisma } from '../helpers/mock-prisma'
import { resetAllMocks } from '../helpers/reset-mocks'
import { createMockSession } from '../helpers/mock-auth'

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

const mockBcryptCompare = vi.hoisted(() => vi.fn())

vi.mock('bcryptjs', () => ({
  default: { compare: mockBcryptCompare },
  compare: mockBcryptCompare,
}))

const mockDeleteUserAccount = vi.hoisted(() => vi.fn())

vi.mock('@/domains/users/services/safe-delete.service', () => ({
  SafeDeleteService: {
    deleteUserAccount: mockDeleteUserAccount,
  },
}))

// ─── Imports after mocks ────────────────────────────────────────────────────
import { POST } from '@/app/api/users/account/delete/route'
import { getServerSession } from 'next-auth'

// ─── Helpers ────────────────────────────────────────────────────────────────

const TEST_USER_ID = 'test-user-1'
const TEST_PASSWORD = 'usuario123'
const TEST_PASSWORD_HASH = '$2a$10$abcdefghijklmnopqrstuuPFGHIJKLMNOPQRSTUV'

function createDeleteRequest(body: Record<string, unknown> = {}): NextRequest {
  return new NextRequest('http://localhost/api/users/account/delete', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

function setupDefaultMocks() {
  vi.mocked(getServerSession).mockResolvedValue(
    createMockSession({ id: TEST_USER_ID, role: 'owner' }) as never
  )
  mockGetClientIp.mockReturnValue('127.0.0.1')
  mockRateLimit.mockResolvedValue({ allowed: true, remaining: 4, resetAt: Date.now() + 900000 })
  mockPrisma.user.findUnique.mockResolvedValue({
    id: TEST_USER_ID,
    passwordHash: TEST_PASSWORD_HASH,
    status: 'active',
    sessionVersion: 0,
    deletedAt: null,
  } as never)
  mockBcryptCompare.mockResolvedValue(true as never)
  mockDeleteUserAccount.mockResolvedValue(true as never)
}

function authorizeAndConfirm(overrides: Record<string, unknown> = {}) {
  return createDeleteRequest({
    confirmation: 'BORRAR CUENTA',
    password: TEST_PASSWORD,
    ...overrides,
  })
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('POST /api/users/account/delete', () => {
  beforeEach(() => {
    resetAllMocks()
    mockRateLimit.mockReset()
    mockGetClientIp.mockReset()
    mockBcryptCompare.mockReset()
    mockDeleteUserAccount.mockReset()
  })

  // ─── Auth ───────────────────────────────────────────────────────────────

  it('1. returns 401 when there is no authenticated session', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null)

    const req = authorizeAndConfirm()
    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(401)
    expect(json.error).toMatch(/autorizado/i)
    expect(mockPrisma.user.findUnique).not.toHaveBeenCalled()
    expect(mockBcryptCompare).not.toHaveBeenCalled()
    expect(mockDeleteUserAccount).not.toHaveBeenCalled()
  })

  // ─── Rate limit ─────────────────────────────────────────────────────────

  it('2. returns 429 when rate limiting denies the request', async () => {
    setupDefaultMocks()
    mockRateLimit.mockResolvedValue({ allowed: false, remaining: 0, resetAt: Date.now() + 900000 })

    const req = authorizeAndConfirm()
    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(429)
    expect(json.error).toMatch(/demasiados/i)
    expect(mockBcryptCompare).not.toHaveBeenCalled()
    expect(mockDeleteUserAccount).not.toHaveBeenCalled()
  })

  // ─── Confirmation validation ────────────────────────────────────────────

  it('3. returns 400 when confirmation is missing', async () => {
    setupDefaultMocks()

    const req = createDeleteRequest({ password: TEST_PASSWORD })
    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(400)
    expect(json.error).toMatch(/confirmacion/i)
  })

  it('4. returns 400 when confirmation is not exactly "BORRAR CUENTA"', async () => {
    setupDefaultMocks()

    const req = createDeleteRequest({ confirmation: 'borrar cuenta', password: TEST_PASSWORD })
    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(400)
    expect(json.error).toMatch(/confirmacion/i)
  })

  // ─── Password validation ────────────────────────────────────────────────

  it('5. returns 400 when password is missing', async () => {
    setupDefaultMocks()

    const req = createDeleteRequest({ confirmation: 'BORRAR CUENTA' })
    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(400)
    expect(json.error).toMatch(/contrasena/i)
  })

  // ─── User not found ─────────────────────────────────────────────────────

  it('6. returns 400 when the authenticated user record does not exist', async () => {
    setupDefaultMocks()
    mockPrisma.user.findUnique
      .mockResolvedValueOnce({
        id: TEST_USER_ID,
        passwordHash: TEST_PASSWORD_HASH,
        status: 'active',
        sessionVersion: 0,
        deletedAt: null,
      } as never)
      .mockResolvedValueOnce(null as never)

    const req = authorizeAndConfirm()
    const res = await POST(req)
    const json = await res.json()

    // Route returns 400 "Contrasena requerida" when !user
    expect(res.status).toBe(400)
    expect(json.error).toMatch(/contrasena/i)
  })

  // ─── Incorrect password ─────────────────────────────────────────────────

  it('7. returns 403 when the password is incorrect', async () => {
    setupDefaultMocks()
    mockBcryptCompare.mockResolvedValue(false as never)

    const req = authorizeAndConfirm()
    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(403)
    expect(json.error).toMatch(/contrasena incorrecta/i)
    expect(mockDeleteUserAccount).not.toHaveBeenCalled()
  })

  // ─── Happy path ─────────────────────────────────────────────────────────

  it('8. returns 200 when confirmation and password are valid', async () => {
    setupDefaultMocks()

    const req = authorizeAndConfirm()
    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.message).toMatch(/borrada/i)

    // Verify user lookup used session.user.id
    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: TEST_USER_ID } })
    )

    // Verify bcrypt received submitted password and stored hash
    expect(mockBcryptCompare).toHaveBeenCalledWith(TEST_PASSWORD, TEST_PASSWORD_HASH)

    // Verify SafeDeleteService was called with correct userId
    expect(mockDeleteUserAccount).toHaveBeenCalledWith(TEST_USER_ID, TEST_USER_ID)
  })

  // ─── Service failure ────────────────────────────────────────────────────

  it('9. returns 500 when SafeDeleteService reports failure', async () => {
    setupDefaultMocks()
    mockDeleteUserAccount.mockResolvedValue(false as never)

    const req = authorizeAndConfirm()
    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(500)
    expect(json.error).toMatch(/borrado seguro/i)
  })

  // ─── Unexpected error ───────────────────────────────────────────────────

  it('10. returns 500 with a generic safe response when an unexpected error is thrown', async () => {
    setupDefaultMocks()
    mockPrisma.user.findUnique.mockRejectedValue(new Error('Prisma connection pool exhausted'))

    const req = authorizeAndConfirm()
    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(500)

    // SECURITY: must not leak internal error details
    expect(json.error).not.toMatch(/prisma|connection|pool/i)
    expect(json.details).toBeUndefined()
    expect(json.stack).toBeUndefined()

    // Should return the safe generic message
    expect(json.error).toMatch(/error interno/i)
  })
})
