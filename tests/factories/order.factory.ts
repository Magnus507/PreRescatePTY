export interface MockOrder {
  id: string
  orderNumber: string
  userId: string | null
  amount: number
  currency: string
  orderStatus: string
  paymentStatus: string
  paymentMethod: string
  adminReviewStatus: string
  adminReviewedAt: Date | null
  adminReviewedById: string | null
  adminReviewNotes: string | null
  provider: string
  providerReference: string | null
  paymentProofUrl: string | null
  customerName: string | null
  customerEmail: string | null
  customerPhone: string | null
  customerDocument: string | null
  shippingAddress: string | null
  shippingCity: string | null
  shippingNotes: string | null
  createdAt: Date
  updatedAt: Date
  manualPaymentReference: string | null
  organizationId: string | null
  orderType: string
  corporateDeliveryStatus: string | null
  estimatedDeliveryDate: Date | null
  deliveryNote: string | null
  packageId: string | null
}

let orderCounter = 0

export function createMockOrder(overrides: Partial<MockOrder> = {}): MockOrder {
  orderCounter++
  const id = `order-${orderCounter}`
  return {
    id,
    orderNumber: `ORD-${String(orderCounter).padStart(6, '0')}`,
    userId: 'test-user-id',
    amount: 25.0,
    currency: 'USD',
    orderStatus: 'pending',
    paymentStatus: 'pending',
    paymentMethod: 'manual',
    adminReviewStatus: 'pending',
    adminReviewedAt: null,
    adminReviewedById: null,
    adminReviewNotes: null,
    provider: 'manual',
    providerReference: null,
    paymentProofUrl: null,
    customerName: 'Juan Perez',
    customerEmail: 'juan@test.com',
    customerPhone: '+50760001234',
    customerDocument: '8-123-4567',
    shippingAddress: null,
    shippingCity: null,
    shippingNotes: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    manualPaymentReference: null,
    organizationId: null,
    orderType: 'manual',
    corporateDeliveryStatus: null,
    estimatedDeliveryDate: null,
    deliveryNote: null,
    packageId: null,
    ...overrides,
  }
}

export function createMockOrderItem(overrides: Record<string, unknown> = {}) {
  orderCounter++
  return {
    id: `order-item-${orderCounter}`,
    orderId: 'order-1',
    chipId: null,
    profileId: null,
    quantity: 1,
    unitPrice: 25.0,
    totalPrice: 25.0,
    createdAt: new Date('2026-01-01'),
    ...overrides,
  }
}

export function resetOrderCounter(): void {
  orderCounter = 0
}