import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios'
import { useAuthStore } from '@/stores/auth'
import type { ApiError } from '@/types'
import { getSubdomain } from './utils'

// Create axios instance
const api = axios.create({
  baseURL: '/api/v1',
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
    
    // Add tenant subdomain header
    config.headers['X-Tenant-Subdomain'] = getSubdomain()
    
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

    // Handle 401 - try to refresh token
    if (error.response?.status === 401 && !originalRequest._retry) {
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
          '/api/v1/sessions/refresh',
          {},
          { withCredentials: true }
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
