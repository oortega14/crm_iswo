import { create } from 'zustand'
import { normalizeTenantBranding } from '@/lib/tenantBrand'
import { clearTenantBranding, persistTenantBranding } from '@/lib/tenantStorage'
import type { User, Tenant, UserRole } from '@/types'

function applyTenantTheme(primaryColor?: string) {
  if (primaryColor && typeof document !== 'undefined') {
    document.documentElement.style.setProperty('--primary', primaryColor)
  }
}

function tenantSnapshotEqual(a: Tenant, b: Tenant): boolean {
  return (
    a.id === b.id &&
    a.name === b.name &&
    a.subdomain === b.subdomain &&
    a.logo_url === b.logo_url &&
    a.primary_color === b.primary_color &&
    a.currency === b.currency &&
    a.timezone === b.timezone
  )
}

export interface AuthState {
  // State
  user: User | null
  tenant: Tenant | null
  accessToken: string | null
  isAuthenticated: boolean
  isLoading: boolean
  
  // Actions
  setUser: (user: User) => void
  setTenant: (tenant: Tenant) => void
  setAccessToken: (token: string) => void
  login: (user: User, token: string) => void
  /** Restaura sesión en una sola actualización (bootstrap / F5). */
  restoreSession: (session: { user: User; token: string; tenant?: Tenant | null }) => void
  logout: () => void
  setLoading: (loading: boolean) => void
  
  // Helpers
  hasRole: (roles: UserRole[]) => boolean
  isAdmin: () => boolean
  isManager: () => boolean
  isConsultant: () => boolean
  isViewer: () => boolean
}

export const useAuthStore = create<AuthState>((set, get) => ({
  // Initial state
  user: null,
  tenant: null,
  accessToken: null,
  isAuthenticated: false,
  isLoading: true,
  
  // Actions
  setUser: (user) => set({ user }),
  
  setTenant: (tenant) => {
    const prev = get().tenant
    const sameTenant =
      Boolean(prev?.subdomain && tenant.subdomain) &&
      prev!.subdomain.trim().toLowerCase() === tenant.subdomain.trim().toLowerCase()
    const merged = normalizeTenantBranding(
      (sameTenant && prev ? { ...prev, ...tenant } : tenant) as Tenant,
    )
    if (prev && tenantSnapshotEqual(prev, merged)) return

    applyTenantTheme(merged.primary_color)
    persistTenantBranding(merged)
    set({ tenant: merged })
  },
  
  setAccessToken: (token) => set({ accessToken: token }),
  
  login: (user, token) => set({
    user,
    accessToken: token,
    isAuthenticated: true,
    isLoading: false,
  }),

  restoreSession: ({ user, token, tenant }) => {
    const prev = get().tenant
    const mergedTenant = tenant
      ? normalizeTenantBranding(
          prev?.subdomain?.trim().toLowerCase() === tenant.subdomain?.trim().toLowerCase()
            ? { ...prev, ...tenant }
            : tenant,
        )
      : prev

    if (mergedTenant && (!prev || !tenantSnapshotEqual(prev, mergedTenant))) {
      applyTenantTheme(mergedTenant.primary_color)
      persistTenantBranding(mergedTenant)
    }

    set({
      user,
      accessToken: token,
      isAuthenticated: true,
      isLoading: false,
      tenant: mergedTenant,
    })
  },
  
  logout: () => {
    clearTenantBranding()
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('crm-tenant-slug')
    }
    set({
      user: null,
      tenant: null,
      accessToken: null,
      isAuthenticated: false,
      isLoading: false,
    })
  },
  
  setLoading: (loading) => set({ isLoading: loading }),
  
  // Role helpers
  hasRole: (roles) => {
    const { user } = get()
    if (!user) return false
    return roles.includes(user.role)
  },
  
  isAdmin: () => get().user?.role === 'admin',
  isManager: () => get().hasRole(['admin', 'manager']),
  isConsultant: () => get().hasRole(['admin', 'manager', 'consultant']),
  isViewer: () => get().hasRole(['admin', 'manager', 'consultant', 'viewer']),
}))

// Selector hooks for optimized re-renders
export const useUser = () => useAuthStore((state) => state.user)
export const useTenant = () => useAuthStore((state) => state.tenant)
export const useIsAuthenticated = () => useAuthStore((state) => state.isAuthenticated)
export const useUserRole = () => useAuthStore((state) => state.user?.role)
