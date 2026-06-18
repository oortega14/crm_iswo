import { redirect } from '@tanstack/react-router'
import { currentAuth } from '@/lib/authGuards'
import { isPlatformTenant, PLATFORM_HOME } from '@/lib/platformTenant'

export { PLATFORM_HOME }

/** Rutas permitidas para el tenant plataforma (RFC F5 — sin CRM comercial). */
const PLATFORM_EXACT_PATHS = new Set([
  '/settings',
  '/settings/tenant-onboarding',
  '/settings/users',
  '/settings/audit',
])

export function isPlatformAllowedPath(pathname: string): boolean {
  if (PLATFORM_EXACT_PATHS.has(pathname)) return true
  return false
}

/** Bloquea rutas comerciales cuando la sesión es del tenant plataforma. */
export function enforcePlatformRouteAccess(pathname: string, auth = currentAuth()): void {
  if (!isPlatformTenant(auth.tenant)) return

  if (pathname === '/') {
    throw redirect({ to: PLATFORM_HOME })
  }

  if (!isPlatformAllowedPath(pathname)) {
    throw redirect({ to: PLATFORM_HOME })
  }
}

/** Solo tenant plataforma (p. ej. onboarding). */
export function requirePlatformTenant(auth = currentAuth()): void {
  if (!isPlatformTenant(auth.tenant)) {
    throw redirect({ to: '/settings' })
  }
}

/** Solo tenants comerciales (verticales F5 y clientes). */
export function requireCommercialTenant(auth = currentAuth()): void {
  if (isPlatformTenant(auth.tenant)) {
    throw redirect({ to: PLATFORM_HOME })
  }
}

/** Admin del tenant plataforma (onboarding, auditoría). */
export function requirePlatformAdmin(): void {
  const auth = currentAuth()
  requirePlatformTenant(auth)
  if (auth.user?.role !== 'admin') {
    throw redirect({ to: '/settings' })
  }
}
