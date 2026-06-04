import { describe, expect, it } from 'vitest'
import { isPlatformAllowedPath } from '@/lib/platformRouteGuard'

describe('platformRouteGuard', () => {
  it('permite rutas de plataforma RFC F5', () => {
    expect(isPlatformAllowedPath('/settings')).toBe(true)
    expect(isPlatformAllowedPath('/settings/tenant-onboarding')).toBe(true)
    expect(isPlatformAllowedPath('/settings/users')).toBe(true)
    expect(isPlatformAllowedPath('/settings/audit')).toBe(true)
  })

  it('bloquea CRM comercial y settings de tenant', () => {
    expect(isPlatformAllowedPath('/opportunities')).toBe(false)
    expect(isPlatformAllowedPath('/contacts')).toBe(false)
    expect(isPlatformAllowedPath('/settings/general')).toBe(false)
    expect(isPlatformAllowedPath('/settings/pipelines')).toBe(false)
  })
})
