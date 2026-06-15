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
 * Creates a minimal mock Stripe checkout.session.completed event.
 */
function createCheckoutSessionCompletedEvent(overrides: Record<string, unknown> = {}) {
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
    // No stripe-signature header
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

    // SECURITY: must not leak internal error details
    expect(json.error).not.toMatch(/no signatures|expected signature|No signatures matching/i)
    expect(json.details).toBeUndefined()
    expect(json.stack).toBeUndefined()

    // Should return the safe generic message (not the raw Stripe error)
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

    // Verify no account or order writes
    expect(mockPrisma.account.update).not.toHaveBeenCalled()
    expect(mockPrisma.order.create).not.toHaveBeenCalled()
  })

  // ─── Missing metadata ────────────────────────────────────────────────────

  it('4. handles checkout.session.completed with missing userId or packageId metadata', async () => {
    const event = createCheckoutSessionCompletedEvent({
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

    // Verify no account or order writes
    expect(mockPrisma.account.update).not.toHaveBeenCalled()
    expect(mockPrisma.order.create).not.toHaveBeenCalled()
  })

  // ─── Invalid user ───────────────────────────────────────────────────────

  it('5. handles an invalid/nonexistent user without creating an order', async () => {
    const event = createCheckoutSessionCompletedEvent()
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
    const event = createCheckoutSessionCompletedEvent()
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
    const event = createCheckoutSessionCompletedEvent()
    mockHandleWebhook.mockResolvedValue(event)
    setupDefaultMocks()
    // An existing order already exists with this providerReference
    mockPrisma.order.findFirst.mockResolvedValue({ id: 'existing-order-1' } as never)

    const req = createWebhookRequest()
    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.received).toBe(true)

    // Verify no duplicate writes
    expect(mockPrisma.account.update).not.toHaveBeenCalled()
    expect(mockPrisma.order.create).not.toHaveBeenCalled()
  })

  // ─── Successful processing ───────────────────────────────────────────────

  it('8. processes a valid checkout.session.completed event successfully', async () => {
    const event = createCheckoutSessionCompletedEvent()
    mockHandleWebhook.mockResolvedValue(event)
    setupDefaultMocks()

    const req = createWebhookRequest()
    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.received).toBe(true)

    // Verify webhook verification was invoked
    expect(mockHandleWebhook).toHaveBeenCalled()
    expect(mockPrisma.$transaction).toHaveBeenCalled()

    // Verify user and package were loaded
    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: TEST_USER_ID } })
    )
    expect(mockPrisma.package.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: TEST_PACKAGE_ID } })
    )

    // Verify account was activated/updated with package limits
    expect(mockPrisma.account.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: TEST_ACCOUNT_ID },
        data: expect.objectContaining({
          packageId: TEST_PACKAGE_ID,
          maxChipsAllocated: 5,
          maxProfilesAllocated: 3,
          status: 'active',
        }),
      })
    )

    // Verify order was created with correct data
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

  // ─── Transaction usage ──────────────────────────────────────────────────

  it('9. executes account update and order creation inside prisma.$transaction', async () => {
    const event = createCheckoutSessionCompletedEvent()
    mockHandleWebhook.mockResolvedValue(event)
    setupDefaultMocks()

    const req = createWebhookRequest()
    await POST(req)

    expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1)
    expect(mockPrisma.$transaction).toHaveBeenCalledWith(expect.any(Function))
  })

  // ─── Unexpected internal error ──────────────────────────────────────────

  it('10. returns a controlled generic response for an unexpected internal processing error', async () => {
    mockHandleWebhook.mockRejectedValue(new Error('Internal Stripe configuration error'))

    const req = createWebhookRequest()
    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(400)

    // SECURITY: must not expose raw internal error details
    expect(json.error).not.toMatch(/stripe|configuration error/i)
    expect(json.details).toBeUndefined()
    expect(json.stack).toBeUndefined()

    // Should return the safe generic message
    expect(json.error).toEqual('Error de verificación de webhook')
  })
})