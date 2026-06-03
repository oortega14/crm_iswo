import axios, { isAxiosError } from 'axios'

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '/api/v1'

export const ADMIN_TOKEN_STORAGE_KEY = 'crm-super-admin-token'

/** Token guardado en sessionStorage o el valor del campo si aún no se guardó. */
export function resolveAdminToken(inputValue: string): string {
  const typed = inputValue.trim()
  if (typed) return typed
  if (typeof window === 'undefined') return ''
  return window.sessionStorage.getItem(ADMIN_TOKEN_STORAGE_KEY)?.trim() ?? ''
}

export type AdminClientSession = {
  accessToken?: string | null
  tenantSlug?: string | null
}

/** Cliente super-admin: token + sesión JWT del tenant ISWO (admin plataforma). */
export function createAdminClient(adminToken: string, session?: AdminClientSession) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'X-Admin-Token': adminToken.trim(),
  }
  if (session?.accessToken) {
    headers.Authorization = `Bearer ${session.accessToken}`
  }
  if (session?.tenantSlug) {
    headers['X-Tenant-Slug'] = session.tenantSlug.trim().toLowerCase()
  }
  return axios.create({
    baseURL: apiBaseUrl,
    headers,
    withCredentials: true,
  })
}

export function formatAdminApiError(err: unknown, fallback: string): string {
  if (!isAxiosError(err)) {
    return err instanceof Error ? err.message : fallback
  }
  const status = err.response?.status
  const data = err.response?.data
  const message =
    data && typeof data === 'object' && typeof (data as { message?: string }).message === 'string'
      ? (data as { message: string }).message
      : undefined

  if (status === 503 || (data as { error?: string })?.error === 'service_unavailable') {
    return (
      message ??
      'El servidor no tiene SUPER_ADMIN_TOKEN. Añádelo a api/.env y reinicia Rails.'
    )
  }
  if (status === 403) {
    return (
      message ??
      'Solo un administrador del tenant ISWO puede gestionar el onboarding de tenants.'
    )
  }
  if (status === 401) {
    return (
      message ??
      'Token inválido. Debe ser idéntico a SUPER_ADMIN_TOKEN en api/.env (sin espacios extra).'
    )
  }
  if (status === 422) {
    return message ?? 'Datos inválidos (revisa slug, email o si el tenant ya existe).'
  }
  if (message?.trim()) return message
  return fallback
}
