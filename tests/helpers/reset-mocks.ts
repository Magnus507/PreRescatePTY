import { vi } from 'vitest'
import { resetMockPrisma } from './mock-prisma'
import { resetChipCounter } from '../factories/chip.factory'
import { resetUserCounter } from '../factories/user.factory'
import { resetProfileCounter } from '../factories/profile.factory'
import { resetOrderCounter } from '../factories/order.factory'

/**
 * Resets all test mocks and factory counters.
 * Call this in beforeEach() to ensure test isolation.
 */
export function resetAllMocks(): void {
  vi.clearAllMocks()
  resetMockPrisma()
  resetChipCounter()
  resetUserCounter()
  resetProfileCounter()
  resetOrderCounter()
}