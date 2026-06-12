export interface MockAccount {
  id: string
  accountType: string
  accountName: string | null
  ownerUserId: string | null
  status: string
  packageId: string | null
  maxChipsAllocated: number
  maxProfilesAllocated: number
  createdAt: Date
  updatedAt: Date
}

let accountCounter = 0

export function createMockAccount(overrides: Partial<MockAccount> = {}): MockAccount {
  accountCounter++
  const id = `account-${accountCounter}`
  return {
    id,
    accountType: 'personal',
    accountName: 'Test Account',
    ownerUserId: 'test-user-id',
    status: 'active',
    packageId: 'package-1',
    maxChipsAllocated: 3,
    maxProfilesAllocated: 1,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  }
}

export function resetAccountCounter(): void {
  accountCounter = 0
}