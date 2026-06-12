import { describe, it, expect } from 'vitest'
import { encrypt, decrypt, isEncrypted } from '@/lib/encryption'

describe('encryption', () => {
  it('encrypts and decrypts strings roundtrip', () => {
    const plain = 'secret message 123'
    const enc = encrypt(plain)
    expect(isEncrypted(enc)).toBe(true)
    const dec = decrypt(enc)
    expect(dec).toBe(plain)
  })

  it('decrypt returns original if not encrypted', () => {
    const plain = 'plain text'
    const dec = decrypt(plain)
    expect(dec).toBe(plain)
  })
})
