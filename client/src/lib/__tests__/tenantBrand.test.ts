import { describe, expect, it } from 'vitest'
import {
  normalizeTenantBranding,
  resolveKnownBrandSlug,
  resolvePrimaryColor,
  resolveTenantBrand,
} from '@/lib/tenantBrand'
import type { Tenant } from '@/types'

const baseTenant = (overrides: Partial<Tenant>): Tenant => ({
  id: '1',
  name: 'Test',
  subdomain: 'test',
  primary_color: '#000000',
  currency: 'COP',
  timezone: 'America/Bogota',
  created_at: '2026-01-01T00:00:00.000Z',
  ...overrides,
})

describe('tenantBrand', () => {
  it('resuelve alias de Mi Casita', () => {
    expect(resolveKnownBrandSlug('mi-casita')).toBe('micasita')
    expect(resolveTenantBrand({ subdomain: 'micasita', name: 'Mi Casita' })?.label).toBe('Mi Casita')
  })

  it('corrige colores legado en Mi Casita', () => {
    const fromBlue = baseTenant({ subdomain: 'micasita', name: 'Mi Casita', primary_color: '#1D4ED8' })
    expect(resolvePrimaryColor(fromBlue)).toBe('#B45309')

    const fromTeal = baseTenant({ subdomain: 'micasita', name: 'Mi Casita', primary_color: '#0D9488' })
    expect(normalizeTenantBranding(fromTeal).primary_color).toBe('#B45309')
  })

  it('corrige verde oscuro legado en Libranzas', () => {
    const tenant = baseTenant({ subdomain: 'libranzas', name: 'Libranzas ISWO', primary_color: '#166534' })
    expect(resolvePrimaryColor(tenant)).toBe('#047857')
  })
})
