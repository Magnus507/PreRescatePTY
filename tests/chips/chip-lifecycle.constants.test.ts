import { describe, it, expect } from 'vitest'
import {
  CHIP_STATUS,
  CHIP_SERVICE_STATUS,
  ACTIVATABLE_CHIP_STATUSES,
  USED_CAPACITY_CHIP_STATUSES,
  PUBLIC_ACTIVE_CHIP_STATUSES,
  UNAVAILABLE_INVENTORY_STATUSES,
} from '@/domains/chips/chip-lifecycle.constants'

describe('CHIP_STATUS', () => {
  it('has all expected chip statuses', () => {
    expect(CHIP_STATUS.INVENTORY).toBe('inventory')
    expect(CHIP_STATUS.CONSIGNED).toBe('consigned')
    expect(CHIP_STATUS.SOLD).toBe('sold')
    expect(CHIP_STATUS.ACTIVATED).toBe('activated')
    expect(CHIP_STATUS.SUSPENDED).toBe('suspended')
    expect(CHIP_STATUS.DAMAGED).toBe('damaged')
    expect(CHIP_STATUS.LOST).toBe('lost')
  })

  it('has 7 distinct statuses', () => {
    const values = Object.values(CHIP_STATUS)
    expect(values).toHaveLength(7)
    expect(new Set(values).size).toBe(7)
  })
})

describe('CHIP_SERVICE_STATUS', () => {
  it('has all expected service statuses', () => {
    expect(CHIP_SERVICE_STATUS.ACTIVE).toBe('active')
    expect(CHIP_SERVICE_STATUS.INACTIVE).toBe('inactive')
    expect(CHIP_SERVICE_STATUS.EXPIRED).toBe('expired')
    expect(CHIP_SERVICE_STATUS.SUSPENDED).toBe('suspended')
  })

  it('has 4 distinct service statuses', () => {
    const values = Object.values(CHIP_SERVICE_STATUS)
    expect(values).toHaveLength(4)
    expect(new Set(values).size).toBe(4)
  })
})

describe('ACTIVATABLE_CHIP_STATUSES', () => {
  it('includes inventory, consigned, and sold', () => {
    expect(ACTIVATABLE_CHIP_STATUSES).toContain(CHIP_STATUS.INVENTORY)
    expect(ACTIVATABLE_CHIP_STATUSES).toContain(CHIP_STATUS.CONSIGNED)
    expect(ACTIVATABLE_CHIP_STATUSES).toContain(CHIP_STATUS.SOLD)
  })

  it('has exactly 3 statuses', () => {
    expect(ACTIVATABLE_CHIP_STATUSES).toHaveLength(3)
  })

  it('does not include activated, suspended, damaged, or lost', () => {
    expect(ACTIVATABLE_CHIP_STATUSES).not.toContain(CHIP_STATUS.ACTIVATED)
    expect(ACTIVATABLE_CHIP_STATUSES).not.toContain(CHIP_STATUS.SUSPENDED)
    expect(ACTIVATABLE_CHIP_STATUSES).not.toContain(CHIP_STATUS.DAMAGED)
    expect(ACTIVATABLE_CHIP_STATUSES).not.toContain(CHIP_STATUS.LOST)
  })

  it('has no duplicates', () => {
    expect(new Set(ACTIVATABLE_CHIP_STATUSES).size).toBe(ACTIVATABLE_CHIP_STATUSES.length)
  })
})

describe('USED_CAPACITY_CHIP_STATUSES', () => {
  it('includes activated and suspended', () => {
    expect(USED_CAPACITY_CHIP_STATUSES).toContain(CHIP_STATUS.ACTIVATED)
    expect(USED_CAPACITY_CHIP_STATUSES).toContain(CHIP_STATUS.SUSPENDED)
  })

  it('has exactly 2 statuses', () => {
    expect(USED_CAPACITY_CHIP_STATUSES).toHaveLength(2)
  })

  it('does not include inventory, consigned, sold, damaged, or lost', () => {
    expect(USED_CAPACITY_CHIP_STATUSES).not.toContain(CHIP_STATUS.INVENTORY)
    expect(USED_CAPACITY_CHIP_STATUSES).not.toContain(CHIP_STATUS.CONSIGNED)
    expect(USED_CAPACITY_CHIP_STATUSES).not.toContain(CHIP_STATUS.SOLD)
    expect(USED_CAPACITY_CHIP_STATUSES).not.toContain(CHIP_STATUS.DAMAGED)
    expect(USED_CAPACITY_CHIP_STATUSES).not.toContain(CHIP_STATUS.LOST)
  })

  it('has no duplicates', () => {
    expect(new Set(USED_CAPACITY_CHIP_STATUSES).size).toBe(USED_CAPACITY_CHIP_STATUSES.length)
  })
})

describe('PUBLIC_ACTIVE_CHIP_STATUSES', () => {
  it('includes only activated', () => {
    expect(PUBLIC_ACTIVE_CHIP_STATUSES).toContain(CHIP_STATUS.ACTIVATED)
  })

  it('has exactly 1 status', () => {
    expect(PUBLIC_ACTIVE_CHIP_STATUSES).toHaveLength(1)
  })
})

describe('UNAVAILABLE_INVENTORY_STATUSES', () => {
  it('includes sold, consigned, activated, suspended, damaged, lost', () => {
    expect(UNAVAILABLE_INVENTORY_STATUSES).toContain(CHIP_STATUS.SOLD)
    expect(UNAVAILABLE_INVENTORY_STATUSES).toContain(CHIP_STATUS.CONSIGNED)
    expect(UNAVAILABLE_INVENTORY_STATUSES).toContain(CHIP_STATUS.ACTIVATED)
    expect(UNAVAILABLE_INVENTORY_STATUSES).toContain(CHIP_STATUS.SUSPENDED)
    expect(UNAVAILABLE_INVENTORY_STATUSES).toContain(CHIP_STATUS.DAMAGED)
    expect(UNAVAILABLE_INVENTORY_STATUSES).toContain(CHIP_STATUS.LOST)
  })

  it('has exactly 6 statuses', () => {
    expect(UNAVAILABLE_INVENTORY_STATUSES).toHaveLength(6)
  })

  it('does not include inventory', () => {
    expect(UNAVAILABLE_INVENTORY_STATUSES).not.toContain(CHIP_STATUS.INVENTORY)
  })

  it('has no duplicates', () => {
    expect(new Set(UNAVAILABLE_INVENTORY_STATUSES).size).toBe(UNAVAILABLE_INVENTORY_STATUSES.length)
  })
})

describe('lifecycle semantics', () => {
  it('inventory chip is activatable but not used-capacity', () => {
    expect(ACTIVATABLE_CHIP_STATUSES).toContain(CHIP_STATUS.INVENTORY)
    expect(USED_CAPACITY_CHIP_STATUSES).not.toContain(CHIP_STATUS.INVENTORY)
  })

  it('activated chip is used-capacity but not activatable', () => {
    expect(USED_CAPACITY_CHIP_STATUSES).toContain(CHIP_STATUS.ACTIVATED)
    expect(ACTIVATABLE_CHIP_STATUSES).not.toContain(CHIP_STATUS.ACTIVATED)
  })

  it('suspended chip is used-capacity but not activatable', () => {
    expect(USED_CAPACITY_CHIP_STATUSES).toContain(CHIP_STATUS.SUSPENDED)
    expect(ACTIVATABLE_CHIP_STATUSES).not.toContain(CHIP_STATUS.SUSPENDED)
  })

  it('damaged and lost are neither activatable nor used-capacity', () => {
    expect(ACTIVATABLE_CHIP_STATUSES).not.toContain(CHIP_STATUS.DAMAGED)
    expect(ACTIVATABLE_CHIP_STATUSES).not.toContain(CHIP_STATUS.LOST)
    expect(USED_CAPACITY_CHIP_STATUSES).not.toContain(CHIP_STATUS.DAMAGED)
    expect(USED_CAPACITY_CHIP_STATUSES).not.toContain(CHIP_STATUS.LOST)
  })
})