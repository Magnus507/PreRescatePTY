import crypto from 'crypto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  decrypt,
  decryptSensitiveValue,
  encrypt,
  encryptSensitiveValue,
  getEncryptionVersion,
  isEncrypted,
  isLegacyCiphertext,
} from '@/lib/encryption'

const LEGACY_ALGORITHM = 'aes-256-cbc'
const LEGACY_IV_LENGTH = 16

const originalEncryptionKey = process.env.ENCRYPTION_KEY

function getTestKey(): Buffer {
  const configuredKey = process.env.ENCRYPTION_KEY

  if (!configuredKey) {
    throw new Error('ENCRYPTION_KEY is required for tests')
  }

  if (configuredKey.length === 64 && /^[0-9a-fA-F]+$/.test(configuredKey)) {
    return Buffer.from(configuredKey, 'hex')
  }

  if (Buffer.byteLength(configuredKey, 'utf8') === 32) {
    return Buffer.from(configuredKey, 'utf8')
  }

  throw new Error('ENCRYPTION_KEY must be a valid 32-byte value for tests')
}

function encryptLegacyCbc(plaintext: string): string {
  const iv = crypto.randomBytes(LEGACY_IV_LENGTH)
  const cipher = crypto.createCipheriv(LEGACY_ALGORITHM, getTestKey(), iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  return `${iv.toString('hex')}:${encrypted.toString('hex')}`
}

function flipBase64UrlChar(value: string) {
  const lastChar = value.slice(-1)
  const replacement = lastChar === 'A' ? 'B' : 'A'
  return `${value.slice(0, -1)}${replacement}`
}

describe('encryption', () => {
  beforeEach(() => {
    if (!process.env.ENCRYPTION_KEY) {
      vi.stubEnv('ENCRYPTION_KEY', '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef')
    }
  })

  afterEach(() => {
    if (originalEncryptionKey === undefined) {
      vi.unstubAllEnvs()
    } else {
      process.env.ENCRYPTION_KEY = originalEncryptionKey
    }
  })

  it('encrypts and decrypts strings with versioned GCM output', () => {
    const plain = 'secret message 123'
    const enc = encrypt(plain)
    expect(isEncrypted(enc)).toBe(true)
    expect(getEncryptionVersion(enc)).toBe('v2')

    const dec = decrypt(enc)
    expect(dec).toBe(plain)
  })

  it('produces different ciphertext for the same plaintext', () => {
    const plain = 'repeatable input'
    const first = encryptSensitiveValue(plain)
    const second = encryptSensitiveValue(plain)

    expect(first).not.toBe(second)
    expect(decrypt(first)).toBe(plain)
    expect(decrypt(second)).toBe(plain)
  })

  it('reads legacy CBC ciphertext and marks it for migration', () => {
    const legacyCiphertext = encryptLegacyCbc('legacy sensitive value')
    const result = decryptSensitiveValue(legacyCiphertext)

    expect(result.plaintext).toBe('legacy sensitive value')
    expect(result.version).toBe('legacy-cbc')
    expect(result.needsMigration).toBe(true)
    expect(isLegacyCiphertext(legacyCiphertext)).toBe(true)
  })

  it('allows plaintext only when explicitly enabled', () => {
    const plain = 'plain text'

    expect(() => decryptSensitiveValue(plain)).toThrow('plaintext_not_allowed')
    expect(decryptSensitiveValue(plain, { allowPlaintextLegacy: true })).toEqual({
      plaintext: plain,
      version: 'plaintext',
      needsMigration: false,
    })
  })

  it('fails securely on malformed or tampered GCM ciphertext', () => {
    const encrypted = encrypt('tamper me')
    const [prefix, mode, iv, authTag, ciphertext] = encrypted.split(':')

    expect(prefix).toBe('v2')
    expect(mode).toBe('gcm')

    const tamperedCiphertext = `v2:gcm:${iv}:${authTag}:${flipBase64UrlChar(ciphertext)}`
    const tamperedTag = `v2:gcm:${iv}:${flipBase64UrlChar(authTag)}:${ciphertext}`
    const truncated = `v2:gcm:${iv}:${authTag}`

    expect(() => decrypt(tamperedCiphertext)).toThrow('authentication_failed')
    expect(() => decrypt(tamperedTag)).toThrow('authentication_failed')
    expect(() => decrypt(truncated)).toThrow('malformed_ciphertext')
  })

  it('fails on unknown versions and invalid keys', () => {
    expect(() => decrypt('v3:gcm:abc:def:ghi')).toThrow('unsupported_version')

    const legacyCiphertext = encryptLegacyCbc('legacy-invalid-key')
    vi.stubEnv('ENCRYPTION_KEY', 'invalid-key-value')
    expect(() => encrypt('test')).toThrow('invalid_key')
    expect(() => decryptSensitiveValue(legacyCiphertext)).toThrow('invalid_key')
  })

  it('treats empty strings as empty values', () => {
    expect(encrypt('')).toBe('')
    expect(decrypt('')).toBe('')
    expect(getEncryptionVersion('')).toBe('plaintext')
  })
})
