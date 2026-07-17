import { describe, expect, it } from 'vitest'
import {
  canPickLoginTenant,
  isTenantAmbiguousError,
  normalizeLoginTenantSlug,
  resolveLoginTenantFromUrl,
  resolveSubmitTenantSlug,
  tenantsFromAmbiguousError,
} from '@/lib/loginTenant'
import { PLATFORM_TENANT_SLUG } from '@/lib/platformTenant'

describe('loginTenant', () => {
  it('normaliza alias de Mi Casita', () => {
    expect(normalizeLoginTenantSlug('casita')).toBe('micasita')
    expect(normalizeLoginTenantSlug('mi-casita')).toBe('micasita')
    expect(normalizeLoginTenantSlug('mi casita')).toBe('micasita')
  })

  it('deja pasar slugs sin alias y normaliza a minúsculas', () => {
    expect(normalizeLoginTenantSlug('Libranzas')).toBe('libranzas')
    expect(normalizeLoginTenantSlug('  ')).toBe('')
  })

  it('solo super-admin puede elegir empresa en login', () => {
    expect(canPickLoginTenant(PLATFORM_TENANT_SLUG)).toBe(true)
    expect(canPickLoginTenant('micasita')).toBe(false)
    expect(canPickLoginTenant(undefined)).toBe(false)
  })

  it('resuelve tenant desde la URL (con alias)', () => {
    expect(resolveLoginTenantFromUrl('casita')).toBe('micasita')
    expect(resolveLoginTenantFromUrl('micasita')).toBe('micasita')
    expect(resolveLoginTenantFromUrl()).toBe('')
  })

  it('resuelve el slug a enviar según el picker', () => {
    // Con picker: usa el del formulario (normalizado) o cae al tenant plataforma.
    expect(resolveSubmitTenantSlug({ showTenantPicker: true, formTenant: 'casita' })).toBe('micasita')
    expect(resolveSubmitTenantSlug({ showTenantPicker: true, formTenant: '' })).toBe(PLATFORM_TENANT_SLUG)
    // Sin picker: vacío → el API resuelve la empresa por correo.
    expect(resolveSubmitTenantSlug({ showTenantPicker: false })).toBe('')
  })

  it('detecta y extrae tenants de un error tenant_ambiguous', () => {
    const tenants = [{ slug: 'micasita', name: 'Mi Casita' }]
    const error = { response: { data: { error: 'tenant_ambiguous', tenants } } }
    expect(isTenantAmbiguousError(error)).toBe(true)
    expect(tenantsFromAmbiguousError(error)).toEqual(tenants)

    const other = { response: { data: { error: 'invalid_credentials' } } }
    expect(isTenantAmbiguousError(other)).toBe(false)
    expect(tenantsFromAmbiguousError(other)).toEqual([])
  })
})
