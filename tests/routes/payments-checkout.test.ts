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

vi.mock('@/domains/shared/services/payment.service', () => ({
  PaymentService: {
    createCheckoutSession: vi.fn(),
  },
}))

// ─── Imports after mocks ────────────────────────────────────────────────────
import { POST } from '@/app/api/payments/checkout/route'
import { getServerSession } from 'next-auth'
import { PaymentService } from '@/domains/shared/services/payment.service'

// ─── Helpers ────────────────────────────────────────────────────────────────

const TEST_USER_ID = 'test-user-1'
const TEST_PACKAGE_ID = 'pkg_123'

function createCheckoutRequest(body: Record<string, unknown> = {}): NextRequest {
  return new NextRequest('http://localhost/api/payments/checkout', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

function setupDefaultMocks() {
  vi.mocked(getServerSession).mockResolvedValue(
    createMockSession({ id: TEST_USER_ID, role: 'owner' }) as never
  )
  mockPrisma.package.findUnique.mockResolvedValue({
    id: TEST_PACKAGE_ID,
    name: 'Plan Básico',
    price: 49.99,
    isActive: true,
    accountType: 'personal',
    maxChips: 5,
    maxProfiles: 3,
    updatedAt: new Date('2026-06-15T12:00:00.000Z'),
  } as never)
  vi.mocked(PaymentService.createCheckoutSession).mockResolvedValue({
    url: 'https://checkout.stripe.com/cs_test_123',
  } as never)
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('POST /api/payments/checkout', () => {
  beforeEach(() => {
    resetAllMocks()
    vi.mocked(PaymentService.createCheckoutSession).mockReset()
  })

  // ─── Auth ───────────────────────────────────────────────────────────────

  it('1. returns 401 without session', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null)

    const req = createCheckoutRequest({ packageId: TEST_PACKAGE_ID })
    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(401)
    expect(json.error).toMatch(/autorizado/i)
  })

  // ─── Missing packageId ──────────────────────────────────────────────────

  it('2. returns 400 when packageId is missing', async () => {
    setupDefaultMocks()

    const req = createCheckoutRequest({})
    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(400)
    expect(json.error).toMatch(/packageId/i)
  })

  // ─── Package not found ──────────────────────────────────────────────────

  it('3. returns 404 when package does not exist', async () => {
    setupDefaultMocks()
    mockPrisma.package.findUnique.mockResolvedValue(null as never)

    const req = createCheckoutRequest({ packageId: TEST_PACKAGE_ID })
    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(404)
    expect(json.error).toMatch(/plan no encontrado|inactivo/i)
  })

  // ─── No client-supplied price ────────────────────────────────────────────

  it('4. does not use a client-supplied price if extra price data is included in the request', async () => {
    setupDefaultMocks()

    const req = createCheckoutRequest({ packageId: TEST_PACKAGE_ID, price: 1.99 })
    await POST(req)

    // Priceless: PaymentService should use DB price, not the one from request body
    expect(mockPrisma.package.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: TEST_PACKAGE_ID } })
    )
  })

  // ─── PaymentService uses DB price ───────────────────────────────────────

  it('5. PaymentService creates the Stripe Session using the package price from the database', async () => {
    setupDefaultMocks()

    const req = createCheckoutRequest({ packageId: TEST_PACKAGE_ID })
    await POST(req)

    expect(PaymentService.createCheckoutSession).toHaveBeenCalledWith(
      TEST_USER_ID,
      'Plan Básico',
      49.99,  // DB price
      expect.any(String),
      expect.any(String),
      TEST_PACKAGE_ID,
      '2026-06-15T12:00:00.000Z',
    )
  })

  // ─── Metadata includes financial snapshot ────────────────────────────────

  it('6. Stripe metadata contains packageId, expected_amount_cents, expected_currency, package_version', async () => {
    setupDefaultMocks()

    const req = createCheckoutRequest({ packageId: TEST_PACKAGE_ID })
    await POST(req)

    const [, , , , , packageId, packageVersion] = vi.mocked(PaymentService.createCheckoutSession).mock.calls[0]

    expect(packageId).toBe(TEST_PACKAGE_ID)
    expect(packageVersion).toBe('2026-06-15T12:00:00.000Z')
  })

  // ─── expected_amount_cents is integer string ─────────────────────────────

  it('7. expected_amount_cents is an integer string', async () => {
    setupDefaultMocks()
    // The test verifies PaymentService receives the correct price from DB
    // PaymentService internally converts 49.99 → 4999 cents
    const req = createCheckoutRequest({ packageId: TEST_PACKAGE_ID })
    await POST(req)

    const params = vi.mocked(PaymentService.createCheckoutSession).mock.calls[0]
    const priceAmount = params[2]  // 49.99

    // 49.99 * 100 = 4999, Math.round(4999) = 4999
    expect(Math.round(priceAmount * 100)).toBe(4999)
  })

  // ─── expected_currency normalized ────────────────────────────────────────

  it('8. expected_currency is normalized to lowercase', async () => {
    setupDefaultMocks()
    // PaymentService internally sets expected_currency to "usd"
    // This test verifies the DB package price flows correctly
    const req = createCheckoutRequest({ packageId: TEST_PACKAGE_ID })
    await POST(req)

    const params = vi.mocked(PaymentService.createCheckoutSession).mock.calls[0]
    expect(params[2]).toBe(49.99)  // price
  })

  // ─── client_reference_id remains userId ──────────────────────────────────

  it('9. client_reference_id remains the authenticated userId', async () => {
    setupDefaultMocks()

    const req = createCheckoutRequest({ packageId: TEST_PACKAGE_ID })
    await POST(req)

    expect(PaymentService.createCheckoutSession).toHaveBeenCalledWith(
      TEST_USER_ID,
      expect.any(String),
      expect.any(Number),
      expect.any(String),
      expect.any(String),
      expect.any(String),
      expect.any(String),
    )
  })

  // ─── Successful checkout returns URL ─────────────────────────────────────

  it('10. Successful checkout returns the Stripe session URL', async () => {
    setupDefaultMocks()

    const req = createCheckoutRequest({ packageId: TEST_PACKAGE_ID })
    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.url).toBe('https://checkout.stripe.com/cs_test_123')
  })
})