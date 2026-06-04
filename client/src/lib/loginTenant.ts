import { PLATFORM_TENANT_SLUG } from '@/lib/platformTenant'

/** Alias habituales → slug en BD (seeds F5). */
const TENANT_SLUG_ALIASES: Record<string, string> = {
  'mi-casita': 'micasita',
  mi_casita: 'micasita',
  'mi casita': 'micasita',
  casita: 'micasita',
}

export type TenantLoginOption = { slug: string; name: string }

export function normalizeLoginTenantSlug(slug: string): string {
  const normalized = slug.trim().toLowerCase()
  if (!normalized) return ''
  return TENANT_SLUG_ALIASES[normalized] ?? normalized
}

/** Solo super-admin puede elegir empresa en el formulario (RFC F5). */
export function canPickLoginTenant(tenantFromUrl?: string): boolean {
  const slug = tenantFromUrl?.trim().toLowerCase() ?? ''
  return slug === PLATFORM_TENANT_SLUG
}

/** Slug fijado solo por ?tenant= en la URL (no localStorage ni ENV). */
export function resolveLoginTenantFromUrl(fromUrl?: string): string {
  if (!fromUrl?.trim()) return ''
  return normalizeLoginTenantSlug(fromUrl)
}

/**
 * Slug a enviar en X-Tenant-Slug.
 * Vacío = el API resuelve la empresa por correo (usuarios comerciales).
 */
export function resolveSubmitTenantSlug(options: {
  showTenantPicker: boolean
  formTenant?: string
}): string {
  if (options.showTenantPicker) {
    return normalizeLoginTenantSlug(options.formTenant ?? '') || PLATFORM_TENANT_SLUG
  }
  return ''
}

export function isTenantAmbiguousError(error: unknown): error is {
  response?: { data?: { error?: string; tenants?: TenantLoginOption[] } }
} {
  const data = (error as { response?: { data?: unknown } })?.response?.data
  if (!data || typeof data !== 'object') return false
  return (data as { error?: string }).error === 'tenant_ambiguous'
}

export function tenantsFromAmbiguousError(error: unknown): TenantLoginOption[] {
  if (!isTenantAmbiguousError(error)) return []
  const tenants = error.response?.data?.tenants
  return Array.isArray(tenants) ? tenants : []
}
