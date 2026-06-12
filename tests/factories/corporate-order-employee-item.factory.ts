export interface MockCorporateOrderEmployeeItem {
  id: string
  orderId: string
  organizationMemberId: string
  productId: string
  chipId: string | null
  fulfillmentStatus: string
  activatedAt: Date | null
  quantity: number
  unitPrice: number
  subtotal: number
  createdAt: Date
}

let itemCounter = 0

export function createMockCorporateOrderEmployeeItem(
  overrides: Partial<MockCorporateOrderEmployeeItem> = {}
): MockCorporateOrderEmployeeItem {
  itemCounter++
  const id = `corp-item-${itemCounter}`
  return {
    id,
    orderId: 'order-1',
    organizationMemberId: 'member-1',
    productId: 'product-1',
    chipId: 'chip-1',
    fulfillmentStatus: 'pending_assignment',
    activatedAt: null,
    quantity: 1,
    unitPrice: 25.0,
    subtotal: 25.0,
    createdAt: new Date('2026-01-01'),
    ...overrides,
  }
}

export function resetCorporateOrderEmployeeItemCounter(): void {
  itemCounter = 0
}