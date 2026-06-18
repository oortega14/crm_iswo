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

export function requireAdmin(fallback = '/settings') {
  if (currentAuth().user?.role !== 'admin') {
    throw redirect({ to: fallback })
  }
}
