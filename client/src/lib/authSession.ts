import axios, { type AxiosResponse } from 'axios'
import { getSubdomain } from '@/lib/utils'
import { clearSessionQueryCache } from '@/lib/queryClient'
import { useAuthStore } from '@/stores/auth'
import type { Tenant, TenantSettings, User } from '@/types'

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '/api/v1'

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
  return {
    id: resource.id,
    name: attrs.name,
    subdomain: attrs.slug,
    logo_url: attrs.logo_url || undefined,
    primary_color: attrs.brand_color || '#2563eb',
    currency: attrs.currency || 'COP',
    timezone: attrs.timezone || 'America/Bogota',
    settings: attrs.settings,
    created_at: attrs.created_at || new Date().toISOString(),
  }
}

/** Extrae el bearer JWT del header Authorization (mismo mecanismo que login). */
export function extractBearerToken(response: AxiosResponse): string | null {
  const authHeader = response.headers.authorization as string | undefined
  return authHeader?.replace(/^Bearer\s+/i, '').trim() || null
}

function resolveTenantSlugForAuth(): string {
  const fromStore = useAuthStore.getState().tenant?.subdomain?.trim().toLowerCase()
  if (fromStore) return fromStore
  return getSubdomain()
}

let refreshInFlight: Promise<{ user: User; token: string } | null> | null = null

/** Renueva sesión con la cookie httpOnly de refresh (una sola petición en vuelo). */
export async function refreshAccessToken(): Promise<{ user: User; token: string } | null> {
  if (refreshInFlight) return refreshInFlight

  refreshInFlight = (async () => {
    const tenantSlug = resolveTenantSlugForAuth()
    if (!tenantSlug) return null

    const response = await axios.post(
      `${apiBaseUrl}/sessions/refresh`,
      {},
      {
        withCredentials: true,
        headers: { 'X-Tenant-Slug': tenantSlug },
      },
    )

    const token = extractBearerToken(response)
    const sessionData = response.data?.data as JsonApiResource<SessionAttributes> | undefined
    if (!token || !sessionData) return null

    const user = buildUserFromSession(sessionData)
    if (tenantSlug) {
      window.localStorage.setItem('crm-tenant-slug', tenantSlug)
    }
    return { user, token }
  })().finally(() => {
    refreshInFlight = null
  })

  return refreshInFlight
}

/** Restaura sesión al cargar la app si hay cookie de refresh válida. */
export async function bootstrapAuth(): Promise<boolean> {
  const { isAuthenticated, accessToken, tenant } = useAuthStore.getState()
  if (isAuthenticated && accessToken) return true

  const tenantSlug =
    tenant?.subdomain?.trim().toLowerCase() ||
    getSubdomain() ||
    import.meta.env.VITE_TENANT_SLUG?.trim().toLowerCase() ||
    ''

  if (!tenantSlug) return false

  try {
    const session = await refreshAccessToken()
    if (!session) return false

    const { login, setTenant } = useAuthStore.getState()
    clearSessionQueryCache()
    login(session.user, session.token)

    try {
      const tenantResponse = await axios.get(`${apiBaseUrl}/tenant`, {
        withCredentials: true,
        headers: {
          Authorization: `Bearer ${session.token}`,
          'X-Tenant-Slug': tenantSlug,
        },
      })
      const tenantData = tenantResponse.data?.data as JsonApiResource<TenantAttributes> | undefined
      if (tenantData) setTenant(buildTenant(tenantData))
    } catch {
      // Tenant opcional en bootstrap; el usuario ya puede navegar.
    }

    return true
  } catch {
    return false
  }
}
