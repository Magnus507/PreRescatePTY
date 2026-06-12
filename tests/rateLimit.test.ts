import { describe, it, expect } from 'vitest'
import { rateLimit } from '@/lib/rateLimit'

describe('rateLimit fallback', () => {
  it('allows up to limit in fallback store', async () => {
    const id = 'test-ip'
    const namespace = 'unittest'
    for (let i = 1; i <= 3; i++) {
      const res = await rateLimit(namespace, id, { limit: 3, windowMs: 1000 * 60 })
      if (i < 3) expect(res.allowed).toBe(true)
      if (i === 3) expect(res.allowed).toBe(true)
    }
    const resAfter = await rateLimit(namespace, id, { limit: 3, windowMs: 1000 * 60 })
    expect(resAfter.allowed).toBe(false)
  })
})
