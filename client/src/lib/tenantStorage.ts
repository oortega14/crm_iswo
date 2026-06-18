import { normalizeTenantBranding } from '@/lib/tenantBrand'
import type { Tenant } from '@/types'

const STORAGE_KEY = 'crm-tenant-branding'

/** Snapshot mínimo del tenant para branding (logo, nombre) tras F5 o refresh de sesión. */
export function persistTenantBranding(tenant: Tenant): void {
  if (typeof window === 'undefined') return
  try {
    const payload: Tenant = {
      id: tenant.id,
      name: tenant.name,
      subdomain: tenant.subdomain,
      logo_url: tenant.logo_url,
      primary_color: tenant.primary_color,
      currency: tenant.currency,
      timezone: tenant.timezone,
      settings: tenant.settings,
      created_at: tenant.created_at,
    }
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  } catch {
    // sessionStorage lleno o bloqueado
  }
}

export function readTenantBranding(subdomain?: string | null): Tenant | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Tenant
    const slug = subdomain?.trim().toLowerCase()
    if (slug && parsed.subdomain?.trim().toLowerCase() !== slug) return null
    return normalizeTenantBranding(parsed)
  } catch {
    return null
  }
}

export function clearTenantBranding(): void {
  if (typeof window === 'undefined') return
  try {
    window.sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
}
