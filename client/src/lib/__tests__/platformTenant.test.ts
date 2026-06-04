import { describe, expect, it } from 'vitest'
import { isPlatformTenant, PLATFORM_HOME, PLATFORM_TENANT_SLUG } from '@/lib/platformTenant'
import type { Tenant } from '@/types'

function tenant(subdomain: string): Tenant {
  return {
    id: '1',
    name: subdomain,
    subdomain,
    primary_color: '#000',
    currency: 'COP',
    timezone: 'America/Bogota',
    created_at: '',
  }
}

describe('platformTenant', () => {
  it('usa super-admin como tenant plataforma', () => {
    expect(PLATFORM_TENANT_SLUG).toBe('super-admin')
    expect(PLATFORM_HOME).toBe('/settings/tenant-onboarding')
    expect(isPlatformTenant(tenant('super-admin'))).toBe(true)
  })

  it('rechaza iswo y otros tenants comerciales', () => {
    expect(isPlatformTenant(tenant('iswo'))).toBe(false)
    expect(isPlatformTenant(tenant('micasita'))).toBe(false)
  })
})
