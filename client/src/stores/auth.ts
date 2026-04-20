import { create } from 'zustand'
import type { User, Tenant, UserRole } from '@/types'

interface AuthState {
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
    // Apply tenant branding
    if (tenant.primary_color && typeof document !== 'undefined') {
      document.documentElement.style.setProperty('--primary', tenant.primary_color)
    }
    set({ tenant })
  },
  
  setAccessToken: (token) => set({ accessToken: token }),
  
  login: (user, token) => set({
    user,
    accessToken: token,
    isAuthenticated: true,
    isLoading: false,
  }),
  
  logout: () => set({
    user: null,
    accessToken: null,
    isAuthenticated: false,
    isLoading: false,
  }),
  
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
