import type { Tenant } from '@/types'
import { isPlatformTenant } from '@/lib/platformTenant'

export const DEFAULT_TENANT_MODULES = [
  'opportunities',
  'contacts',
  'pipeline',
  'reminders',
  'network',
  'exports',
  'landings',
] as const

export type TenantModule = (typeof DEFAULT_TENANT_MODULES)[number]

export function tenantModules(tenant: Tenant | null | undefined): string[] {
  // RFC F5: tenant plataforma sin módulos comerciales.
  if (isPlatformTenant(tenant)) return []

  const raw = tenant?.settings?.modules
  if (Array.isArray(raw)) return raw.map(String)
  return [...DEFAULT_TENANT_MODULES]
}

export function tenantHasModule(
  tenant: Tenant | null | undefined,
  module: TenantModule | string,
): boolean {
  return tenantModules(tenant).includes(module)
}

export function tenantShowBant(tenant: Tenant | null | undefined): boolean {
  if (tenant?.settings?.show_bant === false) return false
  return tenantHasModule(tenant, 'opportunities')
}
