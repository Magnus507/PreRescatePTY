import { describe, it, expect } from 'vitest'
import {
  isTokenAvailableNow,
  isTokenReservedNow,
  isTokenUsed,
  isTokenExpired,
  isTokenHistorical,
  TOKEN_AVAILABLE_WHERE,
  TOKEN_RESERVED_WHERE,
  TOKEN_HISTORICAL_WHERE,
} from '@/domains/chips/token-lifecycle.helpers'

describe('isTokenAvailableNow', () => {
  it('returns true when token has no orderId, no usedAt, and expiresAt is in the future', () => {
    const future = new Date(Date.now() + 1000 * 60 * 60)
    expect(isTokenAvailableNow({ orderId: null, usedAt: null, expiresAt: future }, new Date())).toBe(true)
  })

  it('returns false when token has an orderId', () => {
    const future = new Date(Date.now() + 1000 * 60 * 60)
    expect(isTokenAvailableNow({ orderId: 'order-1', usedAt: null, expiresAt: future }, new Date())).toBe(false)
  })

  it('returns false when token has been used', () => {
    const future = new Date(Date.now() + 1000 * 60 * 60)
    expect(isTokenAvailableNow({ orderId: null, usedAt: new Date(), expiresAt: future }, new Date())).toBe(false)
  })

  it('returns false when token is expired', () => {
    const past = new Date(Date.now() - 1000 * 60 * 60)
    expect(isTokenAvailableNow({ orderId: null, usedAt: null, expiresAt: past }, new Date())).toBe(false)
  })

  it('returns false when expiresAt is null', () => {
    expect(isTokenAvailableNow({ orderId: null, usedAt: null, expiresAt: null }, new Date())).toBe(false)
  })
})

describe('isTokenReservedNow', () => {
  it('returns true when token has orderId, no usedAt, and expiresAt is in the future', () => {
    const future = new Date(Date.now() + 1000 * 60 * 60)
    expect(isTokenReservedNow({ orderId: 'order-1', usedAt: null, expiresAt: future }, new Date())).toBe(true)
  })

  it('returns false when token has no orderId', () => {
    const future = new Date(Date.now() + 1000 * 60 * 60)
    expect(isTokenReservedNow({ orderId: null, usedAt: null, expiresAt: future }, new Date())).toBe(false)
  })

  it('returns false when token has been used', () => {
    const future = new Date(Date.now() + 1000 * 60 * 60)
    expect(isTokenReservedNow({ orderId: 'order-1', usedAt: new Date(), expiresAt: future }, new Date())).toBe(false)
  })

  it('returns false when token is expired', () => {
    const past = new Date(Date.now() - 1000 * 60 * 60)
    expect(isTokenReservedNow({ orderId: 'order-1', usedAt: null, expiresAt: past }, new Date())).toBe(false)
  })
})

describe('isTokenUsed', () => {
  it('returns true when usedAt is set', () => {
    expect(isTokenUsed({ usedAt: new Date() })).toBe(true)
  })

  it('returns false when usedAt is null', () => {
    expect(isTokenUsed({ usedAt: null })).toBe(false)
  })

  it('returns false when usedAt is undefined', () => {
    expect(isTokenUsed({})).toBe(false)
  })
})

describe('isTokenExpired', () => {
  it('returns true when expiresAt is in the past', () => {
    const past = new Date(Date.now() - 1000 * 60 * 60)
    expect(isTokenExpired({ expiresAt: past }, new Date())).toBe(true)
  })

  it('returns false when expiresAt is in the future', () => {
    const future = new Date(Date.now() + 1000 * 60 * 60)
    expect(isTokenExpired({ expiresAt: future }, new Date())).toBe(false)
  })

  it('returns false when expiresAt is null', () => {
    expect(isTokenExpired({ expiresAt: null }, new Date())).toBe(false)
  })
})

describe('isTokenHistorical', () => {
  it('returns true when token is used', () => {
    expect(isTokenHistorical({ usedAt: new Date() })).toBe(true)
  })

  it('returns true when token is expired', () => {
    const past = new Date(Date.now() - 1000 * 60 * 60)
    expect(isTokenHistorical({ expiresAt: past }, new Date())).toBe(true)
  })

  it('returns true when token has orderId', () => {
    expect(isTokenHistorical({ orderId: 'order-1' })).toBe(true)
  })

  it('returns false when token is available (no orderId, no usedAt, future expiresAt)', () => {
    const future = new Date(Date.now() + 1000 * 60 * 60)
    expect(isTokenHistorical({ orderId: null, usedAt: null, expiresAt: future }, new Date())).toBe(false)
  })
})

describe('TOKEN_AVAILABLE_WHERE', () => {
  it('returns correct Prisma where clause', () => {
    const now = new Date('2026-01-01T00:00:00Z')
    const result = TOKEN_AVAILABLE_WHERE(now)
    expect(result).toEqual({
      orderId: null,
      usedAt: null,
      expiresAt: { gt: now },
    })
  })
})

describe('TOKEN_RESERVED_WHERE', () => {
  it('returns correct Prisma where clause', () => {
    const now = new Date('2026-01-01T00:00:00Z')
    const result = TOKEN_RESERVED_WHERE(now)
    expect(result).toEqual({
      orderId: { not: null },
      usedAt: null,
      expiresAt: { gt: now },
    })
  })
})

describe('TOKEN_HISTORICAL_WHERE', () => {
  it('returns correct Prisma where clause with OR', () => {
    const now = new Date('2026-01-01T00:00:00Z')
    const result = TOKEN_HISTORICAL_WHERE(now)
    expect(result).toEqual({
      OR: [
        { usedAt: { not: null } },
        { expiresAt: { lte: now } },
        { orderId: { not: null } },
      ],
    })
  })
})