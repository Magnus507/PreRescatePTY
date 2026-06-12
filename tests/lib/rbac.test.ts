import { describe, it, expect } from 'vitest'
import {
  hasRole,
  ORDER_ADMIN_ROLES,
  GENERAL_ADMIN_ROLES,
  SUPERADMIN_ROLES,
} from '@/lib/rbac'

describe('hasRole', () => {
  it('returns true when role is in allowedRoles', () => {
    expect(hasRole('admin', ['admin', 'superadmin'])).toBe(true)
  })

  it('returns false when role is not in allowedRoles', () => {
    expect(hasRole('user', ['admin', 'superadmin'])).toBe(false)
  })

  it('returns false when role is undefined', () => {
    expect(hasRole(undefined, ['admin', 'superadmin'])).toBe(false)
  })

  it('returns false when role is null', () => {
    expect(hasRole(null, ['admin', 'superadmin'])).toBe(false)
  })

  it('returns false when allowedRoles is empty', () => {
    expect(hasRole('admin', [])).toBe(false)
  })

  it('returns true for superadmin in SUPERADMIN_ROLES', () => {
    expect(hasRole('superadmin', SUPERADMIN_ROLES)).toBe(true)
  })

  it('returns false for admin in SUPERADMIN_ROLES', () => {
    expect(hasRole('admin', SUPERADMIN_ROLES)).toBe(false)
  })

  it('returns true for admin in GENERAL_ADMIN_ROLES', () => {
    expect(hasRole('admin', GENERAL_ADMIN_ROLES)).toBe(true)
  })

  it('returns true for superadmin in GENERAL_ADMIN_ROLES', () => {
    expect(hasRole('superadmin', GENERAL_ADMIN_ROLES)).toBe(true)
  })

  it('returns false for imprenta in GENERAL_ADMIN_ROLES', () => {
    expect(hasRole('imprenta', GENERAL_ADMIN_ROLES)).toBe(false)
  })

  it('returns true for imprenta in ORDER_ADMIN_ROLES', () => {
    expect(hasRole('imprenta', ORDER_ADMIN_ROLES)).toBe(true)
  })

  it('returns true for admin in ORDER_ADMIN_ROLES', () => {
    expect(hasRole('admin', ORDER_ADMIN_ROLES)).toBe(true)
  })

  it('returns true for superadmin in ORDER_ADMIN_ROLES', () => {
    expect(hasRole('superadmin', ORDER_ADMIN_ROLES)).toBe(true)
  })

  it('returns false for user in ORDER_ADMIN_ROLES', () => {
    expect(hasRole('user', ORDER_ADMIN_ROLES)).toBe(false)
  })
})

describe('role constants', () => {
  it('ORDER_ADMIN_ROLES contains admin, superadmin, imprenta', () => {
    expect(ORDER_ADMIN_ROLES).toEqual(['admin', 'superadmin', 'imprenta'])
  })

  it('GENERAL_ADMIN_ROLES contains admin, superadmin', () => {
    expect(GENERAL_ADMIN_ROLES).toEqual(['admin', 'superadmin'])
  })

  it('SUPERADMIN_ROLES contains only superadmin', () => {
    expect(SUPERADMIN_ROLES).toEqual(['superadmin'])
  })

  it('GENERAL_ADMIN_ROLES is a subset of ORDER_ADMIN_ROLES', () => {
    for (const role of GENERAL_ADMIN_ROLES) {
      expect(ORDER_ADMIN_ROLES).toContain(role)
    }
  })

  it('SUPERADMIN_ROLES is a subset of GENERAL_ADMIN_ROLES', () => {
    for (const role of SUPERADMIN_ROLES) {
      expect(GENERAL_ADMIN_ROLES).toContain(role)
    }
  })
})