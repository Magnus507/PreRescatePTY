import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { mockPrisma } from '../helpers/mock-prisma'
import { resetAllMocks } from '../helpers/reset-mocks'

// ─── Mocks ──────────────────────────────────────────────────────────────────

vi.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}))

const mockHandleWebhook = vi.hoisted(() => vi.fn())
const mockGenerateOrderNumber = vi.hoisted(() => vi.fn())

vi.mock('@/domains/shared/services/payment.service', () => ({
  PaymentService: {
    handleWebhook: mockHandleWebhook,
  },
}))

vi.mock('@/lib/order-number', () => ({
  generateOrderNumber: mockGenerateOrderNumber,
}))

// ─── Imports after mocks ────────────────────────────────────────────────────
import { POST } from '@/app/api/payments/webhook/route'

// ─── Helpers ────────────────────────────────────────────────────────────────

const TEST_USER_ID = 'test-user-1'
const TEST_ACCOUNT_ID = 'test-account-id'
const TEST_PACKAGE_ID = 'pkg_123'
const TEST_PAYMENT_INTENT = 'pi_test_123'
const TEST_SESSION_ID = 'cs_test_123'

/**
 * Creates a minimal mock Stripe checkout.session.completed event
 * with valid financial snapshot metadata.
 */
function createValidCheckoutEvent(overrides: Record<string, unknown> = {}) {
  return {
    type: 'checkout.session.completed',
    data: {
      object: {
        id: TEST_SESSION_ID,
        client_reference_id: TEST_USER_ID,
        payment_intent: TEST_PAYMENT_INTENT,
        amount_total: 4999,
        currency: 'usd',
        metadata: {
          packageId: TEST_PACKAGE_ID,
          expected_amount_cents: '4999',
          expected_currency: 'usd',
        },
        ...overrides,
      },
    },
  }
}

/**
 * Creates a minimal mock Stripe event of an unsupported type.
 */
function createUnsupportedEvent() {
  return {
    type: 'customer.subscription.updated',
    data: { object: { id: 'sub_123' } },
  }
}

/**
 * Creates a webhook POST request.
 */
function createWebhookRequest(body: string = '{}', signature: string = 'test_sig'): NextRequest {
  const req = new NextRequest('http://localhost/api/payments/webhook', {
    method: 'POST',
    body,
  })
  req.headers.set('stripe-signature', signature)
  return req
}

function setupDefaultMocks() {
  mockPrisma.user.findUnique.mockResolvedValue({
    id: TEST_USER_ID,
    accountId: TEST_ACCOUNT_ID,
  } as never)
  mockPrisma.package.findUnique.mockResolvedValue({
    id: TEST_PACKAGE_ID,
    name: 'Plan Básico',
    price: 49.99,
    isActive: true,
    accountType: 'personal',
    maxChips: 5,
    maxProfiles: 3,
  } as never)
  mockPrisma.order.findFirst.mockResolvedValue(null as never)
  mockPrisma.account.update.mockResolvedValue({} as never)
  mockPrisma.order.create.mockResolvedValue({} as never)
  mockPrisma.$transaction.mockImplementation(async (callback: (tx: typeof mockPrisma) => Promise<void>) => {
    return callback(mockPrisma)
  })
  mockGenerateOrderNumber.mockResolvedValue('ORD-00001')
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('POST /api/payments/webhook', () => {
  beforeEach(() => {
    resetAllMocks()
    mockHandleWebhook.mockReset()
    mockGenerateOrderNumber.mockReset()
    mockPrisma.$transaction.mockReset()
    mockPrisma.user.findUnique.mockReset()
    mockPrisma.package.findUnique.mockReset()
    mockPrisma.order.findFirst.mockReset()
    mockPrisma.account.update.mockReset()
    mockPrisma.order.create.mockReset()
  })

  // ─── Missing signature ───────────────────────────────────────────────────

  it('1. returns 400 when stripe-signature header is missing', async () => {
    const req = new NextRequest('http://localhost/api/payments/webhook', {
      method: 'POST',
      body: '{}',
    })
    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(400)
    expect(json.error).toMatch(/signature/i)
  })

  // ─── Signature verification failure ──────────────────────────────────────

  it('2. returns 400 with a generic safe response when signature verification fails', async () => {
    mockHandleWebhook.mockRejectedValue(new Error('No signatures found matching the expected signature'))

    const req = createWebhookRequest()
    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(400)
    expect(json.error).not.toMatch(/no signatures|expected signature/i)
    expect(json.details).toBeUndefined()
    expect(json.stack).toBeUndefined()
    expect(json.error).toEqual('Error de verificación de webhook')
  })

  // ─── Unsupported event type ──────────────────────────────────────────────

  it('3. returns 200 for an unsupported/non-checkout event', async () => {
    mockHandleWebhook.mockResolvedValue(createUnsupportedEvent())
    setupDefaultMocks()

    const req = createWebhookRequest()
    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.received).toBe(true)

    expect(mockPrisma.account.update).not.toHaveBeenCalled()
    expect(mockPrisma.order.create).not.toHaveBeenCalled()
  })

  // ─── Missing metadata ────────────────────────────────────────────────────

  it('4. handles checkout.session.completed with missing userId or packageId metadata', async () => {
    const event = createValidCheckoutEvent({
      client_reference_id: null,
      metadata: { packageId: null },
    })
    mockHandleWebhook.mockResolvedValue(event)
    setupDefaultMocks()

    const req = createWebhookRequest()
    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.warning).toMatch(/missing metadata/i)

    expect(mockPrisma.account.update).not.toHaveBeenCalled()
    expect(mockPrisma.order.create).not.toHaveBeenCalled()
  })

  // ─── Invalid user ───────────────────────────────────────────────────────

  it('5. handles an invalid/nonexistent user without creating an order', async () => {
    const event = createValidCheckoutEvent()
    mockHandleWebhook.mockResolvedValue(event)
    setupDefaultMocks()
    mockPrisma.user.findUnique.mockResolvedValue(null as never)

    const req = createWebhookRequest()
    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.error).toMatch(/user or package invalid/i)

    expect(mockPrisma.account.update).not.toHaveBeenCalled()
    expect(mockPrisma.order.create).not.toHaveBeenCalled()
  })

  // ─── Invalid package ────────────────────────────────────────────────────

  it('6. handles an invalid/nonexistent package without creating an order', async () => {
    const event = createValidCheckoutEvent()
    mockHandleWebhook.mockResolvedValue(event)
    setupDefaultMocks()
    mockPrisma.package.findUnique.mockResolvedValue(null as never)

    const req = createWebhookRequest()
    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.error).toMatch(/user or package invalid/i)

    expect(mockPrisma.account.update).not.toHaveBeenCalled()
    expect(mockPrisma.order.create).not.toHaveBeenCalled()
  })

  // ─── Idempotency ────────────────────────────────────────────────────────

  it('7. does not create a duplicate order when an order with the same Stripe providerReference already exists', async () => {
    const event = createValidCheckoutEvent()
    mockHandleWebhook.mockResolvedValue(event)
    setupDefaultMocks()
    // An existing order already exists with this providerReference
    mockPrisma.order.findFirst.mockResolvedValue({ id: 'existing-order-1' } as never)

    const req = createWebhookRequest()
    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.received).toBe(true)

    // Verify no duplicate writes — idempotency prevented them
    expect(mockPrisma.account.update).not.toHaveBeenCalled()
    expect(mockPrisma.order.create).not.toHaveBeenCalled()
  })

  // ─── Financial validation: valid case ───────────────────────────────────

  it('8. processes a valid checkout.session.completed event when amount_total equals expected_amount_cents and currency matches', async () => {
    const event = createValidCheckoutEvent()
    mockHandleWebhook.mockResolvedValue(event)
    setupDefaultMocks()

    const req = createWebhookRequest()
    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.received).toBe(true)

    expect(mockHandleWebhook).toHaveBeenCalled()
    expect(mockPrisma.$transaction).toHaveBeenCalled()
    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: TEST_USER_ID } })
    )
    expect(mockPrisma.package.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: TEST_PACKAGE_ID } })
    )
    expect(mockPrisma.account.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: TEST_ACCOUNT_ID },
        data: expect.objectContaining({
          packageId: TEST_PACKAGE_ID,
          status: 'active',
        }),
      })
    )
    expect(mockPrisma.order.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: TEST_USER_ID,
          provider: 'stripe',
          paymentStatus: 'paid',
          orderStatus: 'completed',
          providerReference: TEST_PAYMENT_INTENT,
        }),
      })
    )
  })

  // ─── Financial validation: amount mismatch ──────────────────────────────

  it('9. returns 200 and performs no writes when amount_total differs from expected_amount_cents', async () => {
    const event = createValidCheckoutEvent({
      amount_total: 9999, // different from expected 4999
    })
    mockHandleWebhook.mockResolvedValue(event)
    setupDefaultMocks()

    const req = createWebhookRequest()
    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.warning).toMatch(/financial validation/i)

    expect(mockPrisma.$transaction).not.toHaveBeenCalled()
    expect(mockPrisma.account.update).not.toHaveBeenCalled()
    expect(mockPrisma.order.create).not.toHaveBeenCalled()
  })

  // ─── Financial validation: currency mismatch ────────────────────────────

  it('10. returns 200 and performs no writes when currency differs from expected_currency', async () => {
    const event = createValidCheckoutEvent({
      currency: 'eur',
    })
    mockHandleWebhook.mockResolvedValue(event)
    setupDefaultMocks()

    const req = createWebhookRequest()
    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.warning).toMatch(/financial validation/i)

    expect(mockPrisma.$transaction).not.toHaveBeenCalled()
    expect(mockPrisma.account.update).not.toHaveBeenCalled()
    expect(mockPrisma.order.create).not.toHaveBeenCalled()
  })

  // ─── Financial validation: missing expected_amount_cents ────────────────

  it('11. returns 200 and performs no writes when expected_amount_cents metadata is missing', async () => {
    const event = createValidCheckoutEvent({
      metadata: { packageId: TEST_PACKAGE_ID },
    })
    mockHandleWebhook.mockResolvedValue(event)
    setupDefaultMocks()

    const req = createWebhookRequest()
    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.warning).toMatch(/financial validation/i)

    expect(mockPrisma.$transaction).not.toHaveBeenCalled()
    expect(mockPrisma.account.update).not.toHaveBeenCalled()
    expect(mockPrisma.order.create).not.toHaveBeenCalled()
  })

  // ─── Financial validation: missing expected_currency ────────────────────

  it('12. returns 200 and performs no writes when expected_currency metadata is missing', async () => {
    const event = createValidCheckoutEvent({
      metadata: {
        packageId: TEST_PACKAGE_ID,
        expected_amount_cents: '4999',
      },
    })
    mockHandleWebhook.mockResolvedValue(event)
    setupDefaultMocks()

    const req = createWebhookRequest()
    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.warning).toMatch(/financial validation/i)

    expect(mockPrisma.$transaction).not.toHaveBeenCalled()
    expect(mockPrisma.account.update).not.toHaveBeenCalled()
    expect(mockPrisma.order.create).not.toHaveBeenCalled()
  })

  // ─── Financial validation: invalid expected_amount_cents ────────────────

  it('13. returns 200 and performs no writes when expected_amount_cents is not a valid integer string', async () => {
    for (const invalidValue of ['49.99', 'abc', '-1']) {
      const event = createValidCheckoutEvent({
        metadata: {
          packageId: TEST_PACKAGE_ID,
          expected_amount_cents: invalidValue,
          expected_currency: 'usd',
        },
      })
      mockHandleWebhook.mockResolvedValue(event)
      setupDefaultMocks()

      const req = createWebhookRequest()
      const res = await POST(req)
      const json = await res.json()

      expect(res.status).toBe(200)
      expect(json.warning).toMatch(/financial validation/i)
      expect(mockPrisma.$transaction).not.toHaveBeenCalled()
    }
  })

  // ─── Financial validation: amount_total null ────────────────────────────

  it('14. returns 200 and performs no writes when amount_total is null', async () => {
    const event = createValidCheckoutEvent({
      amount_total: null,
    })
    mockHandleWebhook.mockResolvedValue(event)
    setupDefaultMocks()

    const req = createWebhookRequest()
    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.warning).toMatch(/financial validation/i)

    expect(mockPrisma.$transaction).not.toHaveBeenCalled()
    expect(mockPrisma.account.update).not.toHaveBeenCalled()
    expect(mockPrisma.order.create).not.toHaveBeenCalled()
  })

  // ─── Financial validation: case-insensitive currency ────────────────────

  it('15. currency comparison is case-insensitive after normalization', async () => {
    const event = createValidCheckoutEvent({
      metadata: {
        packageId: TEST_PACKAGE_ID,
        expected_amount_cents: '4999',
        expected_currency: 'USD',
      },
      currency: 'usd',
    })
    mockHandleWebhook.mockResolvedValue(event)
    setupDefaultMocks()

    const req = createWebhookRequest()
    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.received).toBe(true)

    // Account and order should be created (validation passed)
    expect(mockPrisma.$transaction).toHaveBeenCalled()
    expect(mockPrisma.account.update).toHaveBeenCalled()
    expect(mockPrisma.order.create).toHaveBeenCalled()
  })

  // ─── Financial mismatch + no writes assertion ───────────────────────────

  it('16. financial mismatch does not call tx.account.update or tx.order.create', async () => {
    const event = createValidCheckoutEvent({ amount_total: 1 })
    mockHandleWebhook.mockResolvedValue(event)
    setupDefaultMocks()

    const req = createWebhookRequest()
    const res = await POST(req)

    expect(res.status).toBe(200)
    expect(mockPrisma.account.update).not.toHaveBeenCalled()
    expect(mockPrisma.order.create).not.toHaveBeenCalled()
  })

  // ─── Idempotency after financial validation ─────────────────────────────

  it('17. duplicate-event idempotency still works after financial validation', async () => {
    const event = createValidCheckoutEvent()
    mockHandleWebhook.mockResolvedValue(event)
    setupDefaultMocks()
    mockPrisma.order.findFirst.mockResolvedValue({ id: 'existing-order-1' } as never)

    const req = createWebhookRequest()
    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.received).toBe(true)

    expect(mockPrisma.account.update).not.toHaveBeenCalled()
    expect(mockPrisma.order.create).not.toHaveBeenCalled()
  })

  // ─── Unsupported events still work ──────────────────────────────────────

  it('18. existing unsupported-event behavior remains unchanged', async () => {
    mockHandleWebhook.mockResolvedValue(createUnsupportedEvent())
    setupDefaultMocks()

    const req = createWebhookRequest()
    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.received).toBe(true)

    expect(mockPrisma.account.update).not.toHaveBeenCalled()
    expect(mockPrisma.order.create).not.toHaveBeenCalled()
  })

  // ─── Transaction usage ──────────────────────────────────────────────────

  it('19. executes account update and order creation inside prisma.$transaction', async () => {
    const event = createValidCheckoutEvent()
    mockHandleWebhook.mockResolvedValue(event)
    setupDefaultMocks()

    const req = createWebhookRequest()
    await POST(req)

    expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1)
    expect(mockPrisma.$transaction).toHaveBeenCalledWith(expect.any(Function))
  })

  // ─── Unexpected internal error ──────────────────────────────────────────

  it('20. returns a controlled generic response for an unexpected internal processing error', async () => {
    mockHandleWebhook.mockRejectedValue(new Error('Internal Stripe configuration error'))

    const req = createWebhookRequest()
    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(400)
    expect(json.error).not.toMatch(/stripe|configuration error/i)
    expect(json.details).toBeUndefined()
    expect(json.stack).toBeUndefined()
    expect(json.error).toEqual('Error de verificación de webhook')
  })
})