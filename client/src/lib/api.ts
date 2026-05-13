import axios, { AxiosError, InternalAxiosRequestConfig, isAxiosError } from 'axios'
import { useAuthStore } from '@/stores/auth'
import type { ApiError } from '@/types'
import { getSubdomain } from './utils'

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '/api/v1'

// Create axios instance
const api = axios.create({
  baseURL: apiBaseUrl,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  withCredentials: true, // For httpOnly cookies
})

// Request interceptor - add auth token and tenant subdomain
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = useAuthStore.getState().accessToken
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    
    // Backend tenant resolver expects X-Tenant-Slug
    config.headers['X-Tenant-Slug'] = getSubdomain()
    
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor - handle token refresh
let isRefreshing = false
let failedQueue: Array<{
  resolve: (token: string) => void
  reject: (error: Error) => void
}> = []

const processQueue = (error: Error | null, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error)
    } else {
      prom.resolve(token!)
    }
  })
  failedQueue = []
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiError>) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean
    }
    const requestUrl = originalRequest?.url || ''
    const isAuthEndpoint =
      requestUrl.includes('/sessions') || requestUrl.includes('/password/')

    // Handle 401 - try to refresh token
    if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`
            return api(originalRequest)
          })
          .catch((err) => Promise.reject(err))
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        const response = await axios.post(
          `${apiBaseUrl}/sessions/refresh`,
          {},
          {
            withCredentials: true,
            headers: {
              'X-Tenant-Slug': getSubdomain(),
            },
          }
        )
        
        const { access_token } = response.data
        useAuthStore.getState().setAccessToken(access_token)
        
        processQueue(null, access_token)
        
        originalRequest.headers.Authorization = `Bearer ${access_token}`
        return api(originalRequest)
      } catch (refreshError) {
        processQueue(refreshError as Error, null)
        useAuthStore.getState().logout()
        
        // Show toast explaining logout
        window.dispatchEvent(
          new CustomEvent('auth:session-expired', {
            detail: { message: 'Tu sesión ha expirado. Por favor, inicia sesión de nuevo.' },
          })
        )
        
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }

    // Parse JSON:API error format
    if (error.response?.data?.errors) {
      const apiErrors = error.response.data.errors
      const message = apiErrors.map((e) => e.detail || e.title).join(', ')
      return Promise.reject(new Error(message))
    }

    return Promise.reject(error)
  }
)

export default api

/** Mensaje legible para errores 422 de Rails (`error` + `details` de validación). */
export function formatRailsError(err: unknown, fallback = 'Error en la petición'): string {
  if (isAxiosError(err)) {
    const d = err.response?.data
    if (d && typeof d === 'object') {
      const details = (d as { details?: Record<string, string[] | string> }).details
      if (details && typeof details === 'object') {
        const parts: string[] = []
        for (const v of Object.values(details)) {
          if (Array.isArray(v)) parts.push(...v.filter((x) => typeof x === 'string'))
          else if (typeof v === 'string') parts.push(v)
        }
        if (parts.length) return parts.join('. ')
      }
      const slug = (d as { error?: string }).error
      const msg = (d as { message?: string }).message
      if (typeof msg === 'string' && msg.trim()) return msg
      if (slug === 'connection_failed') {
        return 'La prueba de conexión falló. Revisa las credenciales o variables del servidor (p. ej. Google OAuth).'
      }
      if (slug === 'whatsapp_not_configured') {
        return 'Configura el número de WhatsApp de salida en Ajustes → Integraciones o en el servidor.'
      }
    }
    return err.message || fallback
  }
  return err instanceof Error ? err.message : fallback
}

// Helper functions for common API patterns
export const apiHelpers = {
  // GET with pagination
  async getPaginated<T>(
    url: string,
    params?: Record<string, unknown>
  ): Promise<{ data: T[]; meta: { total: number; page: number; per_page: number } }> {
    const response = await api.get(url, { params })
    return response.data
  },

  // GET single resource
  async get<T>(url: string): Promise<T> {
    const response = await api.get(url)
    return response.data.data
  },

  // POST create
  async create<T>(url: string, data: Record<string, unknown>): Promise<T> {
    const response = await api.post(url, { data })
    return response.data.data
  },

  // PATCH update
  async update<T>(url: string, data: Record<string, unknown>): Promise<T> {
    const response = await api.patch(url, { data })
    return response.data.data
  },

  // DELETE
  async delete(url: string): Promise<void> {
    await api.delete(url)
  },
}
