import { redirect } from '@tanstack/react-router'
import { useAuthStore } from '@/stores/auth'
import { isPlatformTenant, PLATFORM_HOME } from '@/lib/platformTenant'
import type { UserRole } from '@/types'

/** Estado de auth en tiempo real (no depender del snapshot de context del router). */
export function currentAuth() {
  return useAuthStore.getState()
}

export function requireAuth() {
  if (!currentAuth().isAuthenticated) {
    throw redirect({ to: '/login' })
  }
}

export function redirectIfAuthenticated(home = '/') {
  if (currentAuth().isAuthenticated) {
    const tenant = currentAuth().tenant
    throw redirect({ to: isPlatformTenant(tenant) ? PLATFORM_HOME : home })
  }
}

export function requireRole(...roles: UserRole[]) {
  const role = currentAuth().user?.role
  if (!role || !roles.includes(role)) {
    throw redirect({ to: '/' })
  }
}

/**
 * Igual que requireRole pero pensado para páginas dentro de /settings:
 * si el rol no está permitido redirige a /settings (el layout padre reenvía
 * al primer ajuste visible del rol). Espeja el filtro de SETTINGS_NAV_ITEMS.
 */
export function requireSettingsRole(...roles: UserRole[]) {
  const role = currentAuth().user?.role
  if (!role || !roles.includes(role)) {
    throw redirect({ to: '/settings' })
  }
}

export function requireAdmin(fallback = '/settings') {
  if (currentAuth().user?.role !== 'admin') {
    throw redirect({ to: fallback })
  }
}
