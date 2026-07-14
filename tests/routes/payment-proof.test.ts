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

// ─── Imports after mocks ────────────────────────────────────────────────────
import { POST } from '@/app/api/orders/[id]/payment-proof/route'
import { getServerSession } from 'next-auth'

// ─── Helpers ────────────────────────────────────────────────────────────────

const TEST_USER_ID = 'test-user-1'
const TEST_ORDER_ID = 'order-1'

function createValidProxyUrl(): string {
  return '/api/image-proxy?bucket=payment-proofs&path=user-1/receipt.webp'
}

function createPaymentProofRequest(
  body: Record<string, unknown> = {},
  orderId: string = TEST_ORDER_ID
): NextRequest {
  return new NextRequest(`http://localhost/api/orders/${orderId}/payment-proof`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

function routeParams(orderId: string = TEST_ORDER_ID): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id: orderId }) }
}

/**
 * Creates a default mock order in submittable state (manual, pending).
 */
function createSubmittableOrder(overrides: Record<string, unknown> = {}) {
  return {
    id: TEST_ORDER_ID,
    userId: TEST_USER_ID,
    provider: 'manual',
    paymentStatus: 'pending',
    orderStatus: 'pending',
    adminReviewStatus: 'pending',
    paymentProofUrl: null,
    manualPaymentReference: null,
    ...overrides,
  }
}

function setupDefaultMocks(orderOverrides: Record<string, unknown> = {}) {
  vi.mocked(getServerSession).mockResolvedValue(
    createMockSession({ id: TEST_USER_ID, role: 'owner' }) as never
  )
  mockPrisma.order.findUnique.mockResolvedValue(
    createSubmittableOrder(orderOverrides) as never
  )
  mockPrisma.order.update.mockImplementation(async (args: { where: { id: string }; data: Record<string, unknown> }) => {
    return createSubmittableOrder({
      ...orderOverrides,
      ...args.data,
    })
  })
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('POST /api/orders/[id]/payment-proof', () => {
  beforeEach(() => {
    resetAllMocks()
    mockPrisma.order.findUnique.mockReset()
    mockPrisma.order.update.mockReset()
  })

  // ─── Auth ───────────────────────────────────────────────────────────────

  it('1. returns 401 without an authenticated session', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null)

    const req = createPaymentProofRequest({ paymentProofUrl: createValidProxyUrl() })
    const res = await POST(req, routeParams())
    const json = await res.json()

    expect(res.status).toBe(401)
    expect(json.error).toMatch(/autorizado/i)
  })

  // ─── Order not found ────────────────────────────────────────────────────

  it('2. returns 404 when the order does not exist', async () => {
    setupDefaultMocks()
    mockPrisma.order.findUnique.mockResolvedValue(null as never)

    const req = createPaymentProofRequest({ paymentProofUrl: createValidProxyUrl() })
    const res = await POST(req, routeParams())
    const json = await res.json()

    expect(res.status).toBe(404)
    expect(json.error).toMatch(/no encontrado/i)
  })

  // ─── Wrong user ─────────────────────────────────────────────────────────

  it('3. returns 404 when the order belongs to another user', async () => {
    setupDefaultMocks()
    mockPrisma.order.findUnique.mockResolvedValue(
      createSubmittableOrder({ userId: 'other-user' }) as never
    )

    const req = createPaymentProofRequest({ paymentProofUrl: createValidProxyUrl() })
    const res = await POST(req, routeParams())
    const json = await res.json()

    expect(res.status).toBe(404)
    expect(json.error).toMatch(/no encontrado/i)
    expect(mockPrisma.order.update).not.toHaveBeenCalled()
  })

  // ─── Provider not manual ────────────────────────────────────────────────

  it('4. returns 400 when provider is not manual', async () => {
    setupDefaultMocks({ provider: 'admin', paymentStatus: 'paid', orderStatus: 'completed' })

    const req = createPaymentProofRequest({ paymentProofUrl: createValidProxyUrl() })
    const res = await POST(req, routeParams())
    const json = await res.json()

    expect(res.status).toBe(400)
    expect(json.error).toMatch(/manual/i)
    expect(mockPrisma.order.update).not.toHaveBeenCalled()
  })

  // ─── Non-submittable states ─────────────────────────────────────────────

  it('5. returns 400 when the order state does not allow proof submission', async () => {
    // Test multiple final/non-submittable states
    const nonSubmittableStates = [
      { paymentStatus: 'paid', orderStatus: 'completed', provider: 'manual' },
      { paymentStatus: 'rejected', orderStatus: 'cancelled', provider: 'manual' },
      { paymentStatus: 'pending', orderStatus: 'cancelled', provider: 'manual' },
    ]

    for (const state of nonSubmittableStates) {
      setupDefaultMocks(state)
      mockPrisma.order.findUnique.mockResolvedValue(
        createSubmittableOrder(state) as never
      )

      const req = createPaymentProofRequest({ paymentProofUrl: createValidProxyUrl() })
      const res = await POST(req, routeParams())
      const json = await res.json()

      expect(res.status).toBe(400)
      expect(json.error).toMatch(/comprobante|pendiente/i)
      expect(mockPrisma.order.update).not.toHaveBeenCalled()

      resetAllMocks()
      mockPrisma.order.findUnique.mockReset()
      mockPrisma.order.update.mockReset()
    }
  })

  // ─── Missing both fields ────────────────────────────────────────────────

  it('6. returns 400 when both paymentProofUrl and manualPaymentReference are missing', async () => {
    setupDefaultMocks()

    const req = createPaymentProofRequest({})
    const res = await POST(req, routeParams())
    const json = await res.json()

    expect(res.status).toBe(400)
    expect(json.error).toBeDefined()
  })

  // ─── Invalid URL ────────────────────────────────────────────────────────

  it('7. returns 400 when paymentProofUrl is invalid', async () => {
    setupDefaultMocks()

    // Test multiple invalid URLs
    const invalidUrls = [
      '/api/image-proxy?bucket=general&path=user/file.webp',       // wrong bucket
      'https://evil.com/malicious.jpg',                             // external URL
      '/api/image-proxy?bucket=payment-proofs&path=../../etc/passwd', // path traversal
      '/api/image-proxy?bucket=payment-proofs&path=user/file.txt',  // unsupported extension
    ]

    for (const url of invalidUrls) {
      resetAllMocks()
      vi.mocked(getServerSession).mockResolvedValue(
        createMockSession({ id: TEST_USER_ID, role: 'owner' }) as never
      )
      mockPrisma.order.findUnique.mockResolvedValue(
        createSubmittableOrder() as never
      )

      const req = createPaymentProofRequest({ paymentProofUrl: url })
      const res = await POST(req, routeParams())
      const json = await res.json()

      expect(res.status).toBe(400)
      expect(json.error).toMatch(/paymentProofUrl|comprobante/i)
      expect(mockPrisma.order.update).not.toHaveBeenCalled()
    }
  })

  // ─── Valid proxy URL ────────────────────────────────────────────────────

  it('8. accepts a valid proxy URL for the payment-proofs bucket', async () => {
    setupDefaultMocks()

    const req = createPaymentProofRequest({ paymentProofUrl: createValidProxyUrl() })
    const res = await POST(req, routeParams())

    expect(res.status).toBe(200)
    expect(mockPrisma.order.update).toHaveBeenCalled()
  })

  // ─── Valid manual reference ─────────────────────────────────────────────

  it('9. accepts a valid manualPaymentReference without paymentProofUrl', async () => {
    setupDefaultMocks()

    const req = createPaymentProofRequest({ manualPaymentReference: 'REF-12345' })
    const res = await POST(req, routeParams())
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.order).toBeDefined()
    expect(mockPrisma.order.update).toHaveBeenCalled()
  })

  // ─── Successful submission ──────────────────────────────────────────────

  it('10. returns 200 for successful proof submission with correct status changes', async () => {
    setupDefaultMocks()

    const req = createPaymentProofRequest({
      paymentProofUrl: createValidProxyUrl(),
      manualPaymentReference: 'REF-12345',
    })
    const res = await POST(req, routeParams())
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.order).toBeDefined()

    // Verify order update was called with correct status changes
    expect(mockPrisma.order.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: TEST_ORDER_ID },
        data: expect.objectContaining({
          paymentStatus: 'under_review',
          orderStatus: 'processing',
          adminReviewStatus: 'pending',
          paymentProofUrl: expect.stringContaining('payment-proofs'),
          manualPaymentReference: 'REF-12345',
        }),
      })
    )
  })

  // ─── Allows resubmission when paymentStatus is under_review ─────────────

  it('11. allows resubmission when paymentStatus is under_review', async () => {
    setupDefaultMocks({ paymentStatus: 'under_review', orderStatus: 'processing' })

    const req = createPaymentProofRequest({
      paymentProofUrl: createValidProxyUrl(),
      manualPaymentReference: 'REF-UPDATED',
    })
    const res = await POST(req, routeParams())
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.order).toBeDefined()
    expect(mockPrisma.order.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: TEST_ORDER_ID },
        data: expect.objectContaining({
          paymentStatus: 'under_review',
          manualPaymentReference: 'REF-UPDATED',
        }),
      })
    )
  })

  // ─── Non-manual order cannot enter manual review ────────────────────────

  it('12. does not allow a non-manual order to enter manual review', async () => {
    setupDefaultMocks({ provider: 'admin', paymentStatus: 'pending', orderStatus: 'pending' })

    const req = createPaymentProofRequest({ paymentProofUrl: createValidProxyUrl() })
    const res = await POST(req, routeParams())
    const json = await res.json()

    expect(res.status).toBe(400)
    expect(json.error).toMatch(/manual/i)
    expect(mockPrisma.order.update).not.toHaveBeenCalled()
  })
})
