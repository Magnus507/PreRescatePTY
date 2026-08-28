import { vi } from 'vitest'

/**
 * In-memory mock Prisma client for unit/integration tests.
 * Does NOT import real PrismaClient. Does NOT connect to any database.
 * All methods are vi.fn() stubs that return by default.
 */

function createMockDelegate() {
  return {
    findUnique: vi.fn().mockResolvedValue(null),
    findFirst: vi.fn().mockResolvedValue(null),
    findMany: vi.fn().mockResolvedValue([]),
    create: vi.fn().mockResolvedValue({}),
    update: vi.fn().mockResolvedValue({}),
    updateMany: vi.fn().mockResolvedValue({ count: 0 }),
    upsert: vi.fn().mockResolvedValue({}),
    delete: vi.fn().mockResolvedValue({}),
    deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    count: vi.fn().mockResolvedValue(0),
    aggregate: vi.fn().mockResolvedValue({ _sum: {}, _avg: {}, _count: 0 }),
    groupBy: vi.fn().mockResolvedValue([]),
  }
}

type MockDelegate = ReturnType<typeof createMockDelegate>

export interface MockPrismaClient {
  user: MockDelegate
  account: MockDelegate
  profile: MockDelegate
  chip: MockDelegate
  chipClaimToken: MockDelegate
  order: MockDelegate
  orderItem: MockDelegate
  paymentAttempt: MockDelegate
  paymentEvent: MockDelegate
  invoice: MockDelegate
  invoiceLine: MockDelegate
  operationCommercialOrder: MockDelegate
  operationCommercialOrderItem: MockDelegate
  operationFinishedGoodUnit: MockDelegate
  operationFinishedGoodUnitEvent: MockDelegate
  operationDigitalBatch: MockDelegate
  operationDigitalBatchItem: MockDelegate
  operationProductionOrder: MockDelegate
  operationProductionEvent: MockDelegate
  operationPrintOrder: MockDelegate
  operationPrintOrderItem: MockDelegate
  auditLog: MockDelegate
  notification: MockDelegate
  scanEvent: MockDelegate
  consent: MockDelegate
  contact: MockDelegate
  profileContact: MockDelegate
  organization: MockDelegate
  organizationMember: MockDelegate
  package: MockDelegate
  pointOfSale: MockDelegate
  product: MockDelegate
  productOperationalMapping: MockDelegate
  systemConfig: MockDelegate
  commerceOrderSyncOutbox: MockDelegate
  corporatePublicProfile: MockDelegate
  corporateOrderEmployeeItem: MockDelegate
  corporateProductRequest: MockDelegate
  corporateProductRequestItem: MockDelegate
  digitalPass: MockDelegate
  appNotification: MockDelegate
  passwordResetToken: MockDelegate
  $transaction: ReturnType<typeof vi.fn>
  $connect: ReturnType<typeof vi.fn>
  $disconnect: ReturnType<typeof vi.fn>
}

export const mockPrisma: MockPrismaClient = {
  user: createMockDelegate(),
  account: createMockDelegate(),
  profile: createMockDelegate(),
  chip: createMockDelegate(),
  chipClaimToken: createMockDelegate(),
  order: createMockDelegate(),
  orderItem: createMockDelegate(),
  paymentAttempt: createMockDelegate(),
  paymentEvent: createMockDelegate(),
  invoice: createMockDelegate(),
  invoiceLine: createMockDelegate(),
  operationCommercialOrder: createMockDelegate(),
  operationCommercialOrderItem: createMockDelegate(),
  operationFinishedGoodUnit: createMockDelegate(),
  operationFinishedGoodUnitEvent: createMockDelegate(),
  operationDigitalBatch: createMockDelegate(),
  operationDigitalBatchItem: createMockDelegate(),
  operationProductionOrder: createMockDelegate(),
  operationProductionEvent: createMockDelegate(),
  operationPrintOrder: createMockDelegate(),
  operationPrintOrderItem: createMockDelegate(),
  auditLog: createMockDelegate(),
  notification: createMockDelegate(),
  scanEvent: createMockDelegate(),
  consent: createMockDelegate(),
  contact: createMockDelegate(),
  profileContact: createMockDelegate(),
  organization: createMockDelegate(),
  organizationMember: createMockDelegate(),
  package: createMockDelegate(),
  pointOfSale: createMockDelegate(),
  product: createMockDelegate(),
  productOperationalMapping: createMockDelegate(),
  systemConfig: createMockDelegate(),
  commerceOrderSyncOutbox: createMockDelegate(),
  corporatePublicProfile: createMockDelegate(),
  corporateOrderEmployeeItem: createMockDelegate(),
  corporateProductRequest: createMockDelegate(),
  corporateProductRequestItem: createMockDelegate(),
  digitalPass: createMockDelegate(),
  appNotification: createMockDelegate(),
  passwordResetToken: createMockDelegate(),
  $transaction: vi.fn(async (arg: unknown) => {
    if (Array.isArray(arg)) {
      return Promise.all(arg as Array<Promise<unknown>>)
    }
    if (typeof arg === "function") {
      return (arg as (tx: typeof mockPrisma) => Promise<unknown>)(mockPrisma)
    }
    throw new TypeError("Unsupported transaction signature")
  }) as unknown as MockPrismaClient["$transaction"],
  $connect: vi.fn().mockResolvedValue(undefined),
  $disconnect: vi.fn().mockResolvedValue(undefined),
}

/**
 * Clears all mock call history and resets return values to defaults.
 */
export function resetMockPrisma(): void {
  for (const delegate of Object.values(mockPrisma)) {
    if (typeof delegate === 'object' && delegate !== null && 'findUnique' in delegate) {
      const d = delegate as MockDelegate
      d.findUnique.mockReset()
      d.findUnique.mockResolvedValue(null)
      d.findFirst.mockReset()
      d.findFirst.mockResolvedValue(null)
      d.findMany.mockReset()
      d.findMany.mockResolvedValue([])
      d.create.mockReset()
      d.create.mockResolvedValue({})
      d.update.mockReset()
      d.update.mockResolvedValue({})
      d.updateMany.mockReset()
      d.updateMany.mockResolvedValue({ count: 0 })
      d.upsert.mockReset()
      d.upsert.mockResolvedValue({})
      d.delete.mockReset()
      d.delete.mockResolvedValue({})
      d.deleteMany.mockReset()
      d.deleteMany.mockResolvedValue({ count: 0 })
      d.count.mockReset()
      d.count.mockResolvedValue(0)
      d.aggregate.mockReset()
      d.aggregate.mockResolvedValue({ _sum: {}, _avg: {}, _count: 0 })
      d.groupBy.mockReset()
      d.groupBy.mockResolvedValue([])
    }
  }
  mockPrisma.$transaction.mockReset()
  mockPrisma.$transaction.mockImplementation(async (arg: unknown) => {
    if (Array.isArray(arg)) {
      return Promise.all(arg as Array<Promise<unknown>>)
    }
    if (typeof arg === "function") {
      return (arg as (tx: typeof mockPrisma) => Promise<unknown>)(mockPrisma)
    }
    throw new TypeError("Unsupported transaction signature")
  })
  mockPrisma.$connect.mockReset()
  mockPrisma.$connect.mockResolvedValue(undefined)
  mockPrisma.$disconnect.mockReset()
  mockPrisma.$disconnect.mockResolvedValue(undefined)
}
