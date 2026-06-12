import { CHIP_STATUS } from '@/domains/chips/chip-lifecycle.constants'

export interface MockChip {
  id: string
  accountId: string | null
  assignedProfileId: string | null
  chipUidInternal: string
  serialPublic: string
  shortCode: string
  nfcUrl: string
  qrUrl: string
  batchId: string | null
  productType: string
  nicheType: string
  internalLabel: string | null
  chipAlias: string | null
  status: string
  ownerUserId: string | null
  activatedAt: Date | null
  lastScanAt: Date | null
  lastScanLocation: string | null
  transferLock: boolean
  serviceStartDate: Date | null
  serviceEndDate: Date | null
  serviceStatus: string
  isPhysical: boolean
  createdAt: Date
  updatedAt: Date
  pointOfSaleId: string | null
  consignedAt: Date | null
}

let chipCounter = 0

export function createMockChip(overrides: Partial<MockChip> = {}): MockChip {
  chipCounter++
  const id = `chip-${chipCounter}`
  return {
    id,
    accountId: 'test-account-id',
    assignedProfileId: null,
    chipUidInternal: `uid-${id}`,
    serialPublic: `SER-${String(chipCounter).padStart(6, '0')}`,
    shortCode: `SC${String(chipCounter).padStart(4, '0')}`,
    nfcUrl: `https://prerescatepty.com/nfc/${id}`,
    qrUrl: `https://prerescatepty.com/qr/${id}`,
    batchId: null,
    productType: 'sticker_nfc_qr',
    nicheType: 'motorcycle',
    internalLabel: null,
    chipAlias: null,
    status: CHIP_STATUS.INVENTORY,
    ownerUserId: null,
    activatedAt: null,
    lastScanAt: null,
    lastScanLocation: null,
    transferLock: false,
    serviceStartDate: null,
    serviceEndDate: null,
    serviceStatus: 'active',
    isPhysical: false,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    pointOfSaleId: null,
    consignedAt: null,
    ...overrides,
  }
}

export function resetChipCounter(): void {
  chipCounter = 0
}

// ─── ChipClaimToken factory ─────────────────────────────────────────────────

export interface MockChipClaimToken {
  id: string
  chipId: string
  activationCode: string
  orderId: string | null
  expiresAt: Date
  usedAt: Date | null
  createdAt: Date
}

let tokenCounter = 0

export function createMockChipClaimToken(overrides: Partial<MockChipClaimToken> = {}): MockChipClaimToken {
  tokenCounter++
  const id = `token-${tokenCounter}`
  return {
    id,
    chipId: 'chip-1',
    activationCode: `ACT${String(tokenCounter).padStart(6, '0')}`,
    orderId: null,
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
    usedAt: null,
    createdAt: new Date('2026-01-01'),
    ...overrides,
  }
}

export function resetTokenCounter(): void {
  tokenCounter = 0
}
