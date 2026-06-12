import { describe, it, expect } from 'vitest'
import { validateOrThrow, profileUpdateSchema } from '@/lib/validations'

describe('validations: profileUpdateSchema', () => {
  it('accepts valid safeReturnLat and safeReturnLng', () => {
    const payload = {
      firstName: 'Juan',
      lastName: 'Perez',
      bloodType: 'O+',
      safeReturnLat: '9.5',
      safeReturnLng: '-79.5',
    }

    const parsed = validateOrThrow<any>(profileUpdateSchema as any, payload)
    expect(parsed.safeReturnLat).toBeCloseTo(9.5)
    expect(parsed.safeReturnLng).toBeCloseTo(-79.5)
  })

  it('throws for invalid latitudes', () => {
    const payload = {
      firstName: 'Juan',
      lastName: 'Perez',
      bloodType: 'O+',
      safeReturnLat: '999',
    }
    expect(() => validateOrThrow<any>(profileUpdateSchema as any, payload)).toThrow()
  })
})
