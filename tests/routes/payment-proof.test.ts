import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { mockPrisma } from '../helpers/mock-prisma'
import { resetAllMocks } from '../helpers/reset-mocks'
import { createMockSession } from '../helpers/mock-auth'

const mockRateLimit = vi.hoisted(() => vi.fn())
const mockDownload = vi.hoisted(() => vi.fn())

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
  rateLimit: mockRateLimit,
}))

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    storage: {
      from: vi.fn(() => ({ download: mockDownload })),
    },
  })),
}))

import { POST } from '@/app/api/orders/[id]/payment-proof/route'
import { getServerSession } from 'next-auth'

const TEST_USER_ID = 'test-user-1'
const TEST_ORDER_ID = 'order-1'
const VALID_PROOF_PATH = `payments/${TEST_USER_ID}/${TEST_ORDER_ID}/receipt.webp`

function validImageBlob() {
  return new Blob([
    new Uint8Array([
      0x52, 0x49, 0x46, 0x46,
      0x08, 0x00, 0x00, 0x00,
      0x57, 0x45, 0x42, 0x50,
      0x56, 0x50, 0x38, 0x20,
    ]),
  ], { type: 'image/webp' })
}

function createValidProxyUrl(): string {
  return `/api/image-proxy?bucket=payment-proofs&path=${encodeURIComponent(VALID_PROOF_PATH)}`
}

function createPaymentProofRequest(
  body: Record<string, unknown> = {},
  orderId: string = TEST_ORDER_ID
): NextRequest {
  return new NextRequest(`http://localhost/api/orders/${orderId}/payment-proof`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function routeParams(orderId: string = TEST_ORDER_ID): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id: orderId }) }
}

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
  mockRateLimit.mockResolvedValue({ allowed: true })
  mockDownload.mockResolvedValue({ data: validImageBlob(), error: null })
  mockPrisma.order.findUnique.mockResolvedValue(
    createSubmittableOrder(orderOverrides) as never
  )
  mockPrisma.order.updateMany.mockImplementation(async (args: { where: { id: string }; data: Record<string, unknown> }) => {
    mockPrisma.order.findUnique.mockResolvedValue(createSubmittableOrder({ ...orderOverrides, ...args.data }))
    return { count: 1 }
  })
}

describe('POST /api/orders/[id]/payment-proof', () => {
  beforeEach(() => {
    resetAllMocks()
    mockRateLimit.mockReset()
    mockDownload.mockReset()
    mockPrisma.order.findUnique.mockReset()
    mockPrisma.order.updateMany.mockReset()
    setupDefaultMocks()
  })

  it('1. returns 401 without an authenticated session', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null)

    const res = await POST(createPaymentProofRequest({ paymentProofPath: VALID_PROOF_PATH }), routeParams())
    const json = await res.json()

    expect(res.status).toBe(401)
    expect(json.error).toMatch(/autorizado/i)
  })

  it('2. returns 404 when the order does not exist', async () => {
    mockPrisma.order.findUnique.mockResolvedValue(null as never)

    const res = await POST(createPaymentProofRequest({ paymentProofPath: VALID_PROOF_PATH }), routeParams())
    const json = await res.json()

    expect(res.status).toBe(404)
    expect(json.error).toMatch(/no encontrado/i)
  })

  it('3. returns 404 when the order belongs to another user', async () => {
    mockPrisma.order.findUnique.mockResolvedValue(
      createSubmittableOrder({ userId: 'other-user' }) as never
    )

    const res = await POST(createPaymentProofRequest({ paymentProofPath: VALID_PROOF_PATH }), routeParams())
    expect(res.status).toBe(404)
    expect(mockPrisma.order.updateMany).not.toHaveBeenCalled()
  })

  it('4. returns 400 when provider is not manual', async () => {
    mockPrisma.order.findUnique.mockResolvedValue(
      createSubmittableOrder({ provider: 'admin', paymentStatus: 'paid', orderStatus: 'completed' }) as never
    )

    const res = await POST(createPaymentProofRequest({ paymentProofPath: VALID_PROOF_PATH }), routeParams())
    const json = await res.json()

    expect(res.status).toBe(400)
    expect(json.error).toMatch(/manual/i)
  })

  it('5. returns 400 when the order state does not allow proof submission', async () => {
    for (const state of [
      { paymentStatus: 'paid', orderStatus: 'completed', provider: 'manual' },
      { paymentStatus: 'rejected', orderStatus: 'cancelled', provider: 'manual' },
      { paymentStatus: 'pending', orderStatus: 'cancelled', provider: 'manual' },
    ]) {
      mockPrisma.order.findUnique.mockResolvedValue(createSubmittableOrder(state) as never)
      const res = await POST(createPaymentProofRequest({ paymentProofPath: VALID_PROOF_PATH }), routeParams())
      expect(res.status).toBe(400)
    }
  })

  it('6. returns 400 when both proof and manual reference are missing', async () => {
    const res = await POST(createPaymentProofRequest({}), routeParams())
    expect(res.status).toBe(400)
  })

  it('7. rejects proof paths that are not owned by this exact order', async () => {
    const invalidPaths = [
      'user/file.webp',
      `payments/${TEST_USER_ID}/another-order/receipt.webp`,
      `payments/other-user/${TEST_ORDER_ID}/receipt.webp`,
      `payments/${TEST_USER_ID}/${TEST_ORDER_ID}/../../etc/passwd.webp`,
      `payments/${TEST_USER_ID}/${TEST_ORDER_ID}/receipt.txt`,
    ]

    for (const paymentProofPath of invalidPaths) {
      const res = await POST(createPaymentProofRequest({ paymentProofPath }), routeParams())
      expect(res.status).toBe(400)
      expect(mockPrisma.order.updateMany).not.toHaveBeenCalled()
    }
  })

  it('8. accepts an owned proof and verifies the stored image before registration', async () => {
    const res = await POST(createPaymentProofRequest({ paymentProofPath: VALID_PROOF_PATH }), routeParams())

    expect(res.status).toBe(200)
    expect(mockDownload).toHaveBeenCalledWith(VALID_PROOF_PATH)
    expect(mockPrisma.order.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: TEST_ORDER_ID, userId: TEST_USER_ID, paymentStatus: expect.any(String), adminReviewStatus: 'pending' }),
        data: expect.objectContaining({
          paymentStatus: 'under_review',
          orderStatus: 'processing',
          adminReviewStatus: 'pending',
          paymentProofUrl: expect.stringContaining('payment-proofs'),
        }),
      })
    )
  })

  it('9. keeps transitional support for a valid owned proxy URL', async () => {
    const res = await POST(createPaymentProofRequest({ paymentProofUrl: createValidProxyUrl() }), routeParams())
    expect(res.status).toBe(200)
    expect(mockDownload).toHaveBeenCalledWith(VALID_PROOF_PATH)
  })

  it('10. accepts a manual reference without touching object storage', async () => {
    const res = await POST(createPaymentProofRequest({ manualPaymentReference: 'REF-12345' }), routeParams())
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.order).toBeDefined()
    expect(mockDownload).not.toHaveBeenCalled()
    expect(mockPrisma.order.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ manualPaymentReference: 'REF-12345' }),
      })
    )
  })

  it('11. allows resubmission while the payment remains under review', async () => {
    mockPrisma.order.findUnique.mockResolvedValue(
      createSubmittableOrder({ paymentStatus: 'under_review', orderStatus: 'processing' }) as never
    )

    const res = await POST(createPaymentProofRequest({
      paymentProofPath: VALID_PROOF_PATH,
      manualPaymentReference: 'REF-UPDATED',
    }), routeParams())

    expect(res.status).toBe(200)
    expect(mockPrisma.order.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          paymentStatus: 'under_review',
          manualPaymentReference: 'REF-UPDATED',
        }),
      })
    )
  })

  it('12. rejects a stored object whose magic bytes are not an allowed image', async () => {
    mockDownload.mockResolvedValue({
      data: new Blob([new Uint8Array(16)], { type: 'application/octet-stream' }),
      error: null,
    })

    const res = await POST(createPaymentProofRequest({ paymentProofPath: VALID_PROOF_PATH }), routeParams())
    const json = await res.json()

    expect(res.status).toBe(400)
    expect(json.error).toMatch(/imagen/i)
    expect(mockPrisma.order.updateMany).not.toHaveBeenCalled()
  })

  it('13. does not allow a non-manual order to enter manual review', async () => {
    mockPrisma.order.findUnique.mockResolvedValue(
      createSubmittableOrder({ provider: 'admin', paymentStatus: 'pending', orderStatus: 'pending' }) as never
    )

    const res = await POST(createPaymentProofRequest({ paymentProofPath: VALID_PROOF_PATH }), routeParams())
    const json = await res.json()

    expect(res.status).toBe(400)
    expect(json.error).toMatch(/manual/i)
    expect(mockPrisma.order.updateMany).not.toHaveBeenCalled()
  })
  it('NEW-06 rejects a stale proof submission after concurrent approval', async () => {
    mockPrisma.order.updateMany.mockResolvedValue({ count: 0 });
    const res = await POST(createPaymentProofRequest({ manualPaymentReference: 'test-ref' }), routeParams());
    expect(res.status).toBe(409);
  });

})
