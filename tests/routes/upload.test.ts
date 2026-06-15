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

const mockOptimizeAndUploadImage = vi.hoisted(() => vi.fn())
const mockRateLimit = vi.hoisted(() => vi.fn())
const mockGetClientIp = vi.hoisted(() => vi.fn())

vi.mock('@/lib/storage-utils', () => ({
  optimizeAndUploadImage: mockOptimizeAndUploadImage,
}))

vi.mock('@/lib/rateLimit', () => ({
  rateLimit: mockRateLimit,
}))

vi.mock('@/lib/request-ip', () => ({
  getClientIp: mockGetClientIp,
}))

// ─── Imports after mocks ────────────────────────────────────────────────────
import { POST } from '@/app/api/upload/route'
import { getServerSession } from 'next-auth'

// ─── Helpers ────────────────────────────────────────────────────────────────

const TEST_USER_ID = 'test-user-1'

/**
 * A minimal JPEG buffer with valid magic bytes (FF D8 FF).
 */
function createMinimalJpegBuffer(): Buffer {
  return Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01])
}

/**
 * A minimal PNG buffer with valid magic bytes.
 */
function createMinimalPngBuffer(): Buffer {
  return Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d])
}

/**
 * A buffer with invalid magic bytes (plain text).
 */
function createInvalidMagicBuffer(): Buffer {
  return Buffer.from([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00])
}

/**
 * Helper to create a FormData-based POST request.
 * Uses Blob which is available in Node 18+ with vitest.
 */
function createUploadRequest(
  overrides: {
    fileBuffer?: Buffer
    mimeType?: string
    fileName?: string
    fileSize?: number
    bucket?: string
    type?: string
    profileId?: string
  } = {}
): NextRequest {
  const buffer = overrides.fileBuffer ?? createMinimalJpegBuffer()
  const mimeType = overrides.mimeType ?? 'image/jpeg'
  const fileName = overrides.fileName ?? 'test.jpg'
  const fileSize = overrides.fileSize ?? buffer.length

  const body = new FormData()

  // Create a Blob with the buffer data
  // To simulate a specific file size, pad the buffer to the desired size
  const paddedBuffer = new Uint8Array(fileSize)
  paddedBuffer.set(new Uint8Array(buffer))
  const blob = new Blob([paddedBuffer], { type: mimeType })

  body.append('file', blob, fileName)

  if (overrides.bucket) body.append('bucket', overrides.bucket)
  if (overrides.type) body.append('type', overrides.type)
  if (overrides.profileId) body.append('profileId', overrides.profileId)

  return new NextRequest('http://localhost/api/upload', {
    method: 'POST',
    body,
  })
}

/**
 * Sets up default mocks for a successful upload scenario.
 */
function setupDefaultMocks() {
  vi.mocked(getServerSession).mockResolvedValue(
    createMockSession({ id: TEST_USER_ID, role: 'owner' }) as never
  )
  mockGetClientIp.mockReturnValue('127.0.0.1')
  mockRateLimit.mockResolvedValue({ allowed: true, remaining: 19, resetAt: Date.now() + 900000 })
  mockOptimizeAndUploadImage.mockResolvedValue('/api/image-proxy?bucket=general&path=test.webp')
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('POST /api/upload', () => {
  beforeEach(() => {
    resetAllMocks()
    mockOptimizeAndUploadImage.mockReset()
    mockRateLimit.mockReset()
    mockGetClientIp.mockReset()
  })

  // ─── Auth ───────────────────────────────────────────────────────────────

  it('1. returns 401 without an authenticated session', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null)

    const req = createUploadRequest()
    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(401)
    expect(json.error).toMatch(/autorizado/i)
  })

  // ─── Rate limit ─────────────────────────────────────────────────────────

  it('2. returns 429 when rate limit denies the request', async () => {
    setupDefaultMocks()
    mockRateLimit.mockResolvedValue({ allowed: false, remaining: 0, resetAt: Date.now() + 900000 })

    const req = createUploadRequest()
    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(429)
    expect(json.error).toMatch(/demasiadas|intenta/i)
  })

  // ─── Missing file ───────────────────────────────────────────────────────

  it('3. returns 400 when no file is provided', async () => {
    setupDefaultMocks()
    const body = new FormData()
    const req = new NextRequest('http://localhost/api/upload', { method: 'POST', body })
    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(400)
    expect(json.error).toMatch(/archivo/i)
  })

  // ─── Invalid bucket ─────────────────────────────────────────────────────

  it('4. returns 400 when bucket is not allowed', async () => {
    setupDefaultMocks()

    const req = createUploadRequest({ bucket: 'invalid-bucket' })
    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(400)
    expect(json.error).toMatch(/destino|carga/i)
  })

  // ─── Unsupported MIME type ──────────────────────────────────────────────

  it('5. returns 400 for unsupported MIME type', async () => {
    setupDefaultMocks()

    const req = createUploadRequest({ mimeType: 'image/gif' })
    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(400)
    expect(json.error).toMatch(/imagenes|jpg|png|webp/i)
  })

  // ─── File too large ─────────────────────────────────────────────────────

  it('6. returns 400 when file size exceeds 5 MB', async () => {
    setupDefaultMocks()

    const req = createUploadRequest({ fileSize: 6 * 1024 * 1024 }) // 6MB
    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(400)
    expect(json.error).toMatch(/limite|5mb/i)
  })

  // ─── Magic bytes mismatch ───────────────────────────────────────────────

  it('7. returns 400 when MIME claims JPEG/PNG/WebP but magic bytes do not match', async () => {
    setupDefaultMocks()

    const req = createUploadRequest({
      mimeType: 'image/jpeg',
      fileBuffer: createInvalidMagicBuffer(),
    })
    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(400)
    expect(json.error).toMatch(/archivo inválido|contenido no corresponde/i)
  })

  // ─── Generic 500 safe response ──────────────────────────────────────────

  it('8. returns 500 with a generic safe response when optimizeAndUploadImage throws', async () => {
    setupDefaultMocks()
    mockOptimizeAndUploadImage.mockRejectedValue(new Error('Internal Sharp processing failure'))

    const req = createUploadRequest()
    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(500)

    // SECURITY: must not leak internal error details
    expect(json.error).not.toMatch(/supabase|bucket|storage|config/i)
    expect(json.error).not.toMatch(/error interno/i) // the original message
    expect(json.details).toBeUndefined()
    expect(json.stack).toBeUndefined()

    // Should return the safe generic message
    expect(json.error).toMatch(/procesar|imagen/i)
  })

  // ─── Happy path: general upload ─────────────────────────────────────────

  it('9. returns 200 for a valid general image upload', async () => {
    setupDefaultMocks()
    mockOptimizeAndUploadImage.mockResolvedValue('/api/image-proxy?bucket=general&path=test.webp')

    const req = createUploadRequest()
    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.url).toBeDefined()
    expect(json.url).toMatch(/api\/image-proxy/)
    expect(mockOptimizeAndUploadImage).toHaveBeenCalled()
  })

  // ─── Happy path: profile upload with ownership check ────────────────────

  it('10. returns 200 for a valid profile image upload and updates profile photoUrl only when ownership is valid', async () => {
    setupDefaultMocks()
    mockOptimizeAndUploadImage.mockResolvedValue('/api/image-proxy?bucket=profile-photos&path=profile.webp')

    // Mock the ownership check: user and profile share the same accountId
    const testUser = { accountId: 'test-account' }
    const testProfile = { accountId: 'test-account' }
    mockPrisma.user.findUnique.mockResolvedValue(testUser as never)
    mockPrisma.profile.findUnique.mockResolvedValue(testProfile as never)
    mockPrisma.profile.update.mockResolvedValue({} as never)

    const req = createUploadRequest({
      type: 'profile',
      profileId: 'target-profile-id',
    })
    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.url).toBeDefined()
    expect(json.url).toMatch(/api\/image-proxy/)

    // Verify ownership check was performed
    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: TEST_USER_ID } })
    )
    expect(mockPrisma.profile.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'target-profile-id' } })
    )

    // Verify profile photoUrl was updated (ownership matched)
    expect(mockPrisma.profile.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'target-profile-id' },
        data: expect.objectContaining({ photoUrl: expect.any(String) }),
      })
    )
  })
})