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
  systemConfig: MockDelegate
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
  systemConfig: createMockDelegate(),
  corporatePublicProfile: createMockDelegate(),
  corporateOrderEmployeeItem: createMockDelegate(),
  corporateProductRequest: createMockDelegate(),
  corporateProductRequestItem: createMockDelegate(),
  digitalPass: createMockDelegate(),
  appNotification: createMockDelegate(),
  passwordResetToken: createMockDelegate(),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  $transaction: vi.fn(async (fn: any) => fn(mockPrisma)) as any,
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
      d.count.mockReset()
      d.count.mockResolvedValue(0)
      d.aggregate.mockReset()
      d.aggregate.mockResolvedValue({ _sum: {}, _avg: {}, _count: 0 })
      d.groupBy.mockReset()
      d.groupBy.mockResolvedValue([])
    }
  }
  mockPrisma.$transaction.mockReset()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  mockPrisma.$transaction.mockImplementation(async (fn: any) => fn(mockPrisma))
  mockPrisma.$connect.mockReset()
  mockPrisma.$connect.mockResolvedValue(undefined)
  mockPrisma.$disconnect.mockReset()
  mockPrisma.$disconnect.mockResolvedValue(undefined)
}