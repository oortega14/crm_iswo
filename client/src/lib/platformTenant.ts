import type { Tenant } from '@/types'

/** Único tenant plataforma — onboarding de otros tenants (RFC F5). */
export const PLATFORM_TENANT_SLUG = 'super-admin'

/** Home del super-admin: alta de tenants, no dashboard comercial. */
export const PLATFORM_HOME = '/settings/tenant-onboarding'

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
