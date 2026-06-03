import type { Tenant } from '@/types'

/** Tenant plataforma ISWO — único autorizado para onboarding de otros tenants (RFC F5). */
export const PLATFORM_TENANT_SLUG = 'iswo'

export function isPlatformTenant(tenant: Tenant | null | undefined): boolean {
  const slug = tenant?.subdomain?.trim().toLowerCase()
  return slug === PLATFORM_TENANT_SLUG
}

export function canManageTenantOnboarding(
  role: string | undefined,
  tenant: Tenant | null | undefined,
): boolean {
  return role === 'admin' && isPlatformTenant(tenant)
}
