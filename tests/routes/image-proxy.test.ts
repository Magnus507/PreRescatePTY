import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { resetAllMocks } from '../helpers/reset-mocks'
import { createMockSession } from '../helpers/mock-auth'

// ─── Shared mock references (hoisted) ───────────────────────────────────────

vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({
  authOptions: {},
}))

const mockRateLimit = vi.hoisted(() => vi.fn())
const mockGetClientIp = vi.hoisted(() => vi.fn())

vi.mock('@/lib/rateLimit', () => ({
  rateLimit: mockRateLimit,
}))

vi.mock('@/lib/request-ip', () => ({
  getClientIp: mockGetClientIp,
}))

const mockDownload = vi.hoisted(() => vi.fn())
const mockStorage = vi.hoisted(() => vi.fn())
const mockCreateClient = vi.hoisted(() => vi.fn())

vi.mock('@supabase/supabase-js', () => ({
  createClient: (...args: unknown[]) => {
    mockCreateClient(...args)
    return { storage: mockStorage() }
  },
}))

// ─── Helpers ────────────────────────────────────────────────────────────────

const TEST_USER_ID = 'test-user-1'

function createPngBlob(): Blob {
  const bytes = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d]
  const arr = new ArrayBuffer(bytes.length)
  const view = new Uint8Array(arr)
  bytes.forEach((b, i) => { view[i] = b })
  return new Blob([arr], { type: 'image/png' })
}

function createGetRequest(params: Record<string, string> = {}): NextRequest {
  const qs = new URLSearchParams(params).toString()
  const url = `http://localhost/api/image-proxy${qs ? `?${qs}` : ''}`
  return new NextRequest(url)
}

function setupDefaultMocks() {
  mockGetClientIp.mockReturnValue('127.0.0.1')
  mockRateLimit.mockResolvedValue({ allowed: true, remaining: 199, resetAt: Date.now() + 60000 })
  mockCreateClient.mockImplementation(() => undefined)
  mockStorage.mockReturnValue({
    from: vi.fn().mockReturnValue({
      download: mockDownload.mockResolvedValue({
        data: createPngBlob(),
        error: null,
      }),
    }),
  })
}

// ─── Dynamic import helper ──────────────────────────────────────────────────

async function importRoute() {
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co')
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-key')
  vi.resetModules()
  return import('@/app/api/image-proxy/route')
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('GET /api/image-proxy', () => {
  beforeEach(() => {
    resetAllMocks()
    mockRateLimit.mockReset()
    mockGetClientIp.mockReset()
    mockDownload.mockReset()
    mockStorage.mockReset()
    mockCreateClient.mockReset()
    vi.unstubAllEnvs()
  })

  // ─── Missing/invalid params ─────────────────────────────────────────────

  it('1. returns 400 when bucket is missing', async () => {
    const { GET } = await importRoute()
    setupDefaultMocks()

    const req = createGetRequest({ path: 'user/file.webp' })
    const res = await GET(req)
    const json = await res.json()

    expect(res.status).toBe(400)
    expect(json.error).toMatch(/bucket|path/i)
  })

  it('2. returns 400 when path is missing', async () => {
    const { GET } = await importRoute()
    setupDefaultMocks()

    const req = createGetRequest({ bucket: 'general' })
    const res = await GET(req)
    const json = await res.json()

    expect(res.status).toBe(400)
    expect(json.error).toMatch(/bucket|path/i)
  })

  it('3. returns 400 when path contains `..`', async () => {
    const { GET } = await importRoute()
    setupDefaultMocks()

    const req = createGetRequest({ bucket: 'general', path: '../secret/file.webp' })
    const res = await GET(req)
    const json = await res.json()

    expect(res.status).toBe(400)
    expect(json.error).toMatch(/invalid path/i)
  })

  it('4. returns 400 when path starts with `/`', async () => {
    const { GET } = await importRoute()
    setupDefaultMocks()

    const req = createGetRequest({ bucket: 'general', path: '/user/file.webp' })
    const res = await GET(req)
    const json = await res.json()

    expect(res.status).toBe(400)
    expect(json.error).toMatch(/invalid path/i)
  })

  it('5. returns 400 when path contains backslashes', async () => {
    const { GET } = await importRoute()
    setupDefaultMocks()

    const req = createGetRequest({ bucket: 'general', path: 'user\\file.webp' })
    const res = await GET(req)
    const json = await res.json()

    expect(res.status).toBe(400)
    expect(json.error).toMatch(/invalid path/i)
  })

  it('6. returns 400 when path does not match the safe path pattern', async () => {
    const { GET } = await importRoute()
    setupDefaultMocks()

    const req = createGetRequest({ bucket: 'general', path: 'user file.webp' })
    const res = await GET(req)
    const json = await res.json()

    expect(res.status).toBe(400)
    expect(json.error).toMatch(/invalid path/i)
  })

  // ─── Bucket validation ──────────────────────────────────────────────────

  it('7. returns 403 for an unknown or disallowed bucket', async () => {
    const { GET } = await importRoute()
    setupDefaultMocks()

    const req = createGetRequest({ bucket: 'private-data', path: 'user/file.webp' })
    const res = await GET(req)
    const json = await res.json()

    expect(res.status).toBe(403)
    expect(json.error).toMatch(/bucket not allowed/i)
  })

  // ─── Auth for authenticated buckets ─────────────────────────────────────

  it('8. returns 401 for an authenticated/private bucket without session', async () => {
    const { GET } = await importRoute()
    setupDefaultMocks()
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue(null)

    const req = createGetRequest({ bucket: 'payment-proofs', path: 'payments/test-user-1/receipt.webp' })
    const res = await GET(req)
    const json = await res.json()

    expect(res.status).toBe(401)
    expect(json.error).toMatch(/autorizado/i)
  })

  it('9. returns 403 for an authenticated/private bucket when the user lacks required ownership/admin access', async () => {
    const { GET } = await importRoute()
    setupDefaultMocks()
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue(
      createMockSession({ id: TEST_USER_ID, role: 'owner' }) as never
    )

    const req = createGetRequest({ bucket: 'payment-proofs', path: 'payments/other-user/receipt.webp' })
    const res = await GET(req)
    const json = await res.json()

    expect(res.status).toBe(403)
    expect(json.error).toMatch(/autorizado/i)
  })

  // ─── Rate limit ─────────────────────────────────────────────────────────

  it('10. returns 429 when rate limiting denies the request', async () => {
    const { GET } = await importRoute()
    setupDefaultMocks()
    mockRateLimit.mockResolvedValue({ allowed: false, remaining: 0, resetAt: Date.now() + 60000 })

    const req = createGetRequest({ bucket: 'general', path: 'user/file.webp' })
    const res = await GET(req)
    const json = await res.json()

    expect(res.status).toBe(429)
    expect(json.error).toMatch(/demasiadas|intentas/i)
  })

  // ─── Upstream failures ──────────────────────────────────────────────────

  it('11. returns 404 when Supabase download returns an error or no data', async () => {
    const { GET } = await importRoute()
    setupDefaultMocks()
    mockStorage.mockReturnValue({
      from: vi.fn().mockReturnValue({
        download: mockDownload.mockResolvedValue({
          data: null,
          error: { message: 'Object not found' },
        }),
      }),
    })

    const req = createGetRequest({ bucket: 'general', path: 'user/file.webp' })
    const res = await GET(req)
    const json = await res.json()

    expect(res.status).toBe(404)
    expect(json.error).toMatch(/file not found/i)
  })

  it('12. returns 500 with a generic safe response when the Supabase client throws', async () => {
    const { GET } = await importRoute()
    setupDefaultMocks()
    mockStorage.mockReturnValue({
      from: vi.fn().mockReturnValue({
        download: mockDownload.mockRejectedValue(new Error('Supabase service-role connection failure')),
      }),
    })

    const req = createGetRequest({ bucket: 'general', path: 'user/file.webp' })
    const res = await GET(req)
    const json = await res.json()

    expect(res.status).toBe(500)
    expect(json.error).not.toMatch(/supabase|service-role|connection/i)
    expect(json.details).toBeUndefined()
    expect(json.stack).toBeUndefined()
    expect(json.error).toMatch(/internal server error/i)
  })

  // ─── Happy path: public bucket ──────────────────────────────────────────

  it('13. returns 200 for a valid public-bucket image', async () => {
    const { GET } = await importRoute()
    setupDefaultMocks()

    const req = createGetRequest({ bucket: 'profile-photos', path: 'user/file.webp' })
    const res = await GET(req)

    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toBe('image/webp')
    expect(res.headers.get('Cache-Control')).toContain('immutable')
    expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff')
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*')
  })

  // ─── Happy path: authenticated bucket ───────────────────────────────────

  it('14. returns 200 for a valid authenticated-bucket image with proper authorization', async () => {
    const { GET } = await importRoute()
    setupDefaultMocks()
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue(
      createMockSession({ id: TEST_USER_ID, role: 'admin' }) as never
    )

    const req = createGetRequest({ bucket: 'payment-proofs', path: 'payments/test-user-1/receipt.webp' })
    const res = await GET(req)

    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toBe('image/webp')
    expect(res.headers.get('Cache-Control')).toBe('private, no-store, max-age=0')
    expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff')
    expect(res.headers.get('Access-Control-Allow-Origin')).not.toBe('*')
    expect(res.headers.get('Vary')).toBe('Origin')
  })

  // ─── SSRF/open-proxy documentation ──────────────────────────────────────

  it('15. does not accept an arbitrary external URL as bucket/path input', async () => {
    const { GET } = await importRoute()
    setupDefaultMocks()

    const req = createGetRequest({
      bucket: 'http://evil.com/malicious',
      path: 'http://evil.com/malicious',
    })
    const res = await GET(req)

    expect(res.status).toBeGreaterThanOrEqual(400)
    expect(res.status).toBeLessThan(500)
    expect(mockDownload).not.toHaveBeenCalled()
  })
})
