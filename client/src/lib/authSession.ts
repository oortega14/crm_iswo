import axios, { type AxiosResponse } from 'axios'
import { getSubdomain } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth'
import { normalizeTenantBranding } from '@/lib/tenantBrand'
import { readTenantBranding } from '@/lib/tenantStorage'
import { clearSessionQueryCache, queryClient } from '@/lib/queryClient'
import type { Tenant, TenantSettings, User } from '@/types'

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '/api/v1'

let logoutInProgress = false
let bootstrapPromise: Promise<boolean> | null = null

/** Evita que el interceptor de refresh re-autentique durante el cierre de sesión. */
export function isLogoutInProgress(): boolean {
  return logoutInProgress
}

function resolveTenantSlugForLogout(): string {
  const fromStore = useAuthStore.getState().tenant?.subdomain?.trim().toLowerCase()
  if (fromStore) return fromStore

  const fromHost = getSubdomain()
  if (fromHost) return fromHost

  return window.localStorage.getItem('crm-tenant-slug')?.trim().toLowerCase() || ''
}

/** Cierra sesión: limpia el cliente al instante y revoca la cookie en segundo plano. */
export function logoutSession(): void {
  if (logoutInProgress) return
  logoutInProgress = true

  const tenantSlug = resolveTenantSlugForLogout()

  window.localStorage.removeItem('crm-tenant-slug')
  clearSessionQueryCache(queryClient)
  useAuthStore.getState().logout()

  const headers: Record<string, string> = {}
  if (tenantSlug) headers['X-Tenant-Slug'] = tenantSlug

  // Solo cookie de refresh (no JWT): un Bearer expirado puede romper el DELETE en el API.
  void axios
    .delete(`${apiBaseUrl}/sessions`, {
      withCredentials: true,
      headers,
    })
    .catch(() => {
      // El cliente ya quedó limpio aunque falle el servidor.
    })
    .finally(() => {
      logoutInProgress = false
    })
}

export type JsonApiResource<TAttributes> = {
  id: string
  attributes: TAttributes
}

type SessionAttributes = {
  email: string
  full_name?: string
  first_name?: string
  last_name?: string
  role: User['role']
  avatar_url?: string | null
  active?: boolean
  last_sign_in_at?: string
  created_at?: string
  updated_at?: string
}

type TenantAttributes = {
  name: string
  slug: string
  logo_url?: string | null
  brand_color?: string
  currency?: string
  timezone?: string
  settings?: TenantSettings
  created_at?: string
}

export const buildUserFromSession = (resource: JsonApiResource<SessionAttributes>): User => {
  const attrs = resource.attributes
  const fullName = attrs.full_name || [attrs.first_name, attrs.last_name].filter(Boolean).join(' ')
  const timestamp = new Date().toISOString()

  return {
    id: resource.id,
    email: attrs.email,
    name: fullName || attrs.email,
    role: attrs.role,
    avatar_url: attrs.avatar_url || undefined,
    active: attrs.active ?? true,
    last_sign_in_at: attrs.last_sign_in_at,
    created_at: attrs.created_at || timestamp,
    updated_at: attrs.updated_at || timestamp,
  }
}

export const buildTenant = (resource: JsonApiResource<TenantAttributes>): Tenant => {
  const attrs = resource.attributes
  return normalizeTenantBranding({
    id: resource.id,
    name: attrs.name,
    subdomain: attrs.slug,
    logo_url: attrs.logo_url || undefined,
    primary_color: attrs.brand_color || '#2563eb',
    currency: attrs.currency || 'COP',
    timezone: attrs.timezone || 'America/Bogota',
    settings: attrs.settings,
    created_at: attrs.created_at || new Date().toISOString(),
  })
}

/** Extrae el bearer JWT del header Authorization (mismo mecanismo que login). */
export function extractBearerToken(response: AxiosResponse): string | null {
  const headers = response.headers as Record<string, string | undefined>
  const authHeader = headers.authorization ?? headers.Authorization
  return authHeader?.replace(/^Bearer\s+/i, '').trim() || null
}

function resolveTenantSlugForAuth(): string {
  const fromStore = useAuthStore.getState().tenant?.subdomain?.trim().toLowerCase()
  if (fromStore) return fromStore
  return getSubdomain()
}

let refreshInFlight: Promise<{ user: User; token: string } | null> | null = null

/** Renueva sesión con la cookie httpOnly de refresh (una sola petición en vuelo). */
export async function refreshAccessToken(): Promise<{
  user: User
  token: string
  tenantSlug?: string
} | null> {
  if (refreshInFlight) return refreshInFlight

  refreshInFlight = (async () => {
    const tenantSlug = resolveTenantSlugForAuth()
    const headers: Record<string, string> = {}
    if (tenantSlug) headers['X-Tenant-Slug'] = tenantSlug

    const response = await axios.post(
      `${apiBaseUrl}/sessions/refresh`,
      {},
      {
        withCredentials: true,
        headers,
        timeout: 8_000,
      },
    )

    const token = extractBearerToken(response)
    const sessionData = response.data?.data as JsonApiResource<SessionAttributes> | undefined
    const meta = (response.data?.meta || {}) as { tenant?: { id?: string; slug?: string; name?: string } }
    if (!token || !sessionData) return null

    const user = buildUserFromSession(sessionData)
    const slug = meta.tenant?.slug?.trim().toLowerCase() || tenantSlug
    if (slug) {
      window.localStorage.setItem('crm-tenant-slug', slug)
    }
    return { user, token, tenantSlug: slug }
  })().finally(() => {
    refreshInFlight = null
  })

  return refreshInFlight
}

type TenantMeta = {
  id?: string | number
  slug?: string
  name?: string
}

export function resolveTenantSlug(
  tenantSlug?: string,
  meta?: TenantMeta,
): string {
  return (
    meta?.slug?.trim().toLowerCase() ||
    tenantSlug?.trim().toLowerCase() ||
    window.localStorage.getItem('crm-tenant-slug')?.trim().toLowerCase() ||
    getSubdomain() ||
    import.meta.env.VITE_TENANT_SLUG?.trim().toLowerCase() ||
    ''
  )
}

export function minimalTenantFromMeta(meta: TenantMeta): Tenant {
  const slug = meta.slug?.trim().toLowerCase() || 'tenant'
  return normalizeTenantBranding({
    id: String(meta.id ?? '0'),
    name: meta.name ?? slug,
    subdomain: slug,
    primary_color: '#2563eb',
    currency: 'COP',
    timezone: 'America/Bogota',
    created_at: new Date().toISOString(),
  })
}

export function minimalTenantFromSlug(slug: string): Tenant {
  const normalized = slug.trim().toLowerCase()
  return normalizeTenantBranding({
    id: '0',
    name: normalized,
    subdomain: normalized,
    primary_color: '#2563eb',
    currency: 'COP',
    timezone: 'America/Bogota',
    created_at: new Date().toISOString(),
  })
}

export function resolveInitialTenant(
  tenantSlug: string,
  meta?: TenantMeta,
): Tenant | null {
  if (!tenantSlug) return null
  return (
    readTenantBranding(tenantSlug) ??
    (meta?.slug ? minimalTenantFromMeta(meta) : minimalTenantFromSlug(tenantSlug))
  )
}

/** Completa logo/color del tenant sin bloquear login ni bootstrap. */
export async function fetchTenantBranding(
  token: string,
  tenantSlug: string,
): Promise<Tenant | null> {
  if (!tenantSlug) return null

  try {
    const tenantResponse = await axios.get(`${apiBaseUrl}/tenant`, {
      withCredentials: true,
      headers: {
        Authorization: `Bearer ${token}`,
        'X-Tenant-Slug': tenantSlug,
      },
      timeout: 8_000,
    })
    const tenantData = tenantResponse.data?.data as JsonApiResource<TenantAttributes> | undefined
    return tenantData ? buildTenant(tenantData) : null
  } catch {
    return null
  }
}

export function hydrateTenantBranding(token: string, tenantSlug: string): void {
  void fetchTenantBranding(token, tenantSlug).then((tenant) => {
    if (!tenant) return

    const { isAuthenticated, tenant: currentTenant } = useAuthStore.getState()
    if (
      !isAuthenticated ||
      currentTenant?.subdomain?.trim().toLowerCase() !== tenantSlug.trim().toLowerCase()
    ) {
      return
    }

    useAuthStore.getState().setTenant(tenant)
  })
}

async function runBootstrapAuth(): Promise<boolean> {
  const { isAuthenticated, accessToken } = useAuthStore.getState()
  if (isAuthenticated && accessToken) return true

  try {
    const session = await refreshAccessToken()
    if (!session) {
      useAuthStore.getState().logout()
      return false
    }

    const tenantSlug = resolveTenantSlug(session.tenantSlug)
    const tenant = resolveInitialTenant(tenantSlug, session.tenantSlug ? { slug: session.tenantSlug } : undefined)

    useAuthStore.getState().restoreSession({
      user: session.user,
      token: session.token,
      tenant,
    })

    if (tenantSlug) {
      hydrateTenantBranding(session.token, tenantSlug)
    }

    return true
  } catch {
    useAuthStore.getState().logout()
    return false
  }
}

/** Espera el bootstrap en curso (rutas protegidas / redirect si ya hay sesión). */
export function waitForAuthBootstrap(): Promise<boolean> {
  if (bootstrapPromise) return bootstrapPromise
  return Promise.resolve(useAuthStore.getState().isAuthenticated)
}

/** Restaura sesión al cargar la app si hay cookie de refresh válida. */
export function bootstrapAuth(): Promise<boolean> {
  if (!bootstrapPromise) {
    bootstrapPromise = runBootstrapAuth().finally(() => {
      useAuthStore.getState().setLoading(false)
    })
  }
  return bootstrapPromise
}
