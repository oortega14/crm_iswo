import { describe, expect, it } from 'vitest'
import { tenantHasModule, tenantModules } from '@/lib/tenantModules'
import type { Tenant } from '@/types'

function tenant(subdomain: string, modules?: string[]): Tenant {
  return {
    id: '1',
    name: subdomain,
    subdomain,
    primary_color: '#000',
    currency: 'COP',
    timezone: 'America/Bogota',
    created_at: '',
    settings: modules !== undefined ? { modules } : undefined,
  }
}

describe('tenantModules — plataforma', () => {
  it('super-admin no tiene módulos comerciales', () => {
    expect(tenantModules(tenant('super-admin', []))).toEqual([])
    expect(tenantHasModule(tenant('super-admin', []), 'opportunities')).toBe(false)
  })

  it('tenant comercial con modules vacío no cae al default', () => {
    expect(tenantModules(tenant('custom', []))).toEqual([])
  })

  it('tenant sin settings usa default comercial', () => {
    expect(tenantModules(tenant('iswo'))).toContain('opportunities')
  })
})
