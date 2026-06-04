import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import {
  canPickLoginTenant,
  inferTenantFromEmail,
  normalizeLoginTenantSlug,
  resolveLoginTenant,
  resolveSubmitTenantSlug,
} from '@/lib/loginTenant'
import { PLATFORM_TENANT_SLUG } from '@/lib/platformTenant'

vi.mock('@/lib/landingUrls', () => ({
  getTenantFromHostname: vi.fn(() => ''),
}))

describe('loginTenant', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('normaliza alias de Mi Casita', () => {
    expect(normalizeLoginTenantSlug('casita')).toBe('micasita')
    expect(normalizeLoginTenantSlug('mi-casita')).toBe('micasita')
  })

  it('infiere tenant desde email de seeds', () => {
    expect(inferTenantFromEmail('admin@micasita.local')).toBe('micasita')
    expect(inferTenantFromEmail('admin@iswo.local')).toBe('iswo')
  })

  it('prioriza email cuando ENV fijó otro tenant', () => {
    const slug = resolveSubmitTenantSlug({
      showTenantPicker: false,
      lockedTenant: 'iswo',
      email: 'admin@micasita.local',
    })
    expect(slug).toBe('micasita')
  })

  it('usa locked tenant cuando coincide con el email', () => {
    const slug = resolveSubmitTenantSlug({
      showTenantPicker: false,
      lockedTenant: 'micasita',
      email: 'admin@micasita.local',
    })
    expect(slug).toBe('micasita')
  })

  it('solo super-admin puede elegir empresa en login', () => {
    expect(canPickLoginTenant(PLATFORM_TENANT_SLUG)).toBe(true)
    expect(canPickLoginTenant('micasita')).toBe(false)
  })

  it('resuelve tenant desde URL', () => {
    expect(resolveLoginTenant('casita')).toBe('micasita')
    expect(resolveLoginTenant('micasita')).toBe('micasita')
  })

  it('usa localStorage incluyendo super-admin', () => {
    localStorage.setItem('crm-tenant-slug', PLATFORM_TENANT_SLUG)
    expect(resolveLoginTenant()).toBe(PLATFORM_TENANT_SLUG)
    expect(canPickLoginTenant(PLATFORM_TENANT_SLUG)).toBe(true)
  })

  it('usa localStorage comercial cuando no hay URL ni subdominio', () => {
    localStorage.setItem('crm-tenant-slug', 'libranzas')
    expect(resolveLoginTenant()).toBe('libranzas')
  })
})
