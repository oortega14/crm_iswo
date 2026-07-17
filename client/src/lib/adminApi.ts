import { isAxiosError } from 'axios'
import { PLATFORM_TENANT_SLUG } from '@/lib/platformTenant'

/** Headers obligatorios para /api/v1/admin/* (tenant plataforma). */
export function adminPlatformHeaders(): Record<string, string> {
  return { 'X-Tenant-Slug': PLATFORM_TENANT_SLUG }
}

/** Errores de /api/v1/admin/* (onboarding de tenants). */
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

  if (status === 403) {
    return (
      message ??
      'Solo un administrador del tenant plataforma (super-admin) puede gestionar el onboarding de tenants.'
    )
  }
  if (status === 401) {
    return message ?? 'Sesión expirada o no autorizado. Vuelve a iniciar sesión como admin de super-admin.'
  }
  if (status === 400) {
    return message ?? 'No se pudo resolver el tenant plataforma. Revisa que exista super-admin (db:seed).'
  }
  if (status === 422) {
    return message ?? 'Datos inválidos (revisa slug, email o si el tenant ya existe).'
  }
  if (message?.trim()) return message
  return fallback
}
