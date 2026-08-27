import { describe, it, expect } from 'vitest'
import { z } from 'zod'
import { validateOrThrow, profileUpdateSchema, orderCreateSchema } from '@/lib/validations'

describe('validations: profileUpdateSchema', () => {
  it('accepts valid safeReturnLat and safeReturnLng', () => {
    const payload = {
      firstName: 'Juan',
      lastName: 'Perez',
      bloodType: 'O+',
      safeReturnLat: '9.5',
      safeReturnLng: '-79.5',
    }

    const parsed = validateOrThrow(profileUpdateSchema.partial() as z.ZodTypeAny, payload)
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
    expect(() => validateOrThrow(profileUpdateSchema.partial() as z.ZodTypeAny, payload)).toThrow()
  })
})

describe('validations: orderCreateSchema', () => {
  const baseOrder = {
    customerName: 'Juan Perez',
    customerEmail: 'juan@example.com',
    customerPhone: '6000-0000',
    shippingAddress: 'Calle 50, edificio de prueba',
    shippingCity: 'Panamá',
    shippingNotes: '',
    paymentMethod: 'yappy',
    items: [
      {
        productType: 'product-1',
        quantity: 1,
        unitPrice: 25,
      },
    ],
  }

  it('accepts serialized numeric strings from the store API', () => {
    const parsed = validateOrThrow(orderCreateSchema, {
      ...baseOrder,
      items: [
        {
          productType: 'product-1',
          quantity: '2',
          unitPrice: '25.00',
        },
      ],
    })

    expect(parsed.items[0].quantity).toBe(2)
    expect(parsed.items[0].unitPrice).toBe(25)
  })

  it('rejects empty or non-numeric order values instead of coercing them to zero', () => {
    expect(() => validateOrThrow(orderCreateSchema, {
      ...baseOrder,
      items: [{ productType: 'product-1', quantity: '', unitPrice: '25.00' }],
    })).toThrow()

    expect(() => validateOrThrow(orderCreateSchema, {
      ...baseOrder,
      items: [{ productType: 'product-1', quantity: '2', unitPrice: 'abc' }],
    })).toThrow()
  })

  it('requires an explicit delivery snapshot', () => {
    const { customerPhone: _phone, ...withoutPhone } = baseOrder
    expect(() => validateOrThrow(orderCreateSchema, withoutPhone)).toThrow()

    const { shippingAddress: _address, ...withoutAddress } = baseOrder
    expect(() => validateOrThrow(orderCreateSchema, withoutAddress)).toThrow()
  })
})
