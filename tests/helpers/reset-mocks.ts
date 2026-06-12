import { vi } from 'vitest'
import { resetMockPrisma } from './mock-prisma'
import { resetChipCounter, resetTokenCounter } from '../factories/chip.factory'
import { resetUserCounter } from '../factories/user.factory'
import { resetProfileCounter } from '../factories/profile.factory'
import { resetOrderCounter } from '../factories/order.factory'
import { resetAccountCounter } from '../factories/account.factory'

/**
 * Resets all test mocks and factory counters.
 * Call this in beforeEach() to ensure test isolation.
 */
export function resetAllMocks(): void {
  vi.clearAllMocks()
  resetMockPrisma()
  resetChipCounter()
  resetTokenCounter()
  resetUserCounter()
  resetProfileCounter()
  resetOrderCounter()
  resetAccountCounter()
}
