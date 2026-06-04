import api, { formatRailsError } from '@/lib/api'
import { jsonApiPrimaryList, jsonApiPrimaryOne, mapUserResource } from '@/lib/opportunityApi'
import type { User, UserRole } from '@/types'

export type UserListFilters = {
  q?: string
  role?: UserRole | 'all'
  active?: 'all' | 'true' | 'false'
  page?: number
  items?: number
}

export type CreateUserPayload = {
  name: string
  email: string
  phone?: string
  role: UserRole
  password?: string
}

export type CreateUserResult = {
  user: User
  passwordGenerated: boolean
  temporaryPassword: string | null
}

function buildUserListParams(filters: UserListFilters): URLSearchParams {
  const params = new URLSearchParams()
  if (filters.q?.trim()) params.set('q', filters.q.trim())
  if (filters.role && filters.role !== 'all') params.set('role', filters.role)
  if (filters.active && filters.active !== 'all') params.set('active', filters.active)
  params.set('items', String(filters.items ?? 200))
  if (filters.page) params.set('page', String(filters.page))
  return params
}

export async function fetchUsersList(filters: UserListFilters = {}): Promise<User[]> {
  const qs = buildUserListParams(filters).toString()
  const response = await api.get(`/users?${qs}`)
  const rows = jsonApiPrimaryList(response.data)
  return rows.filter((r) => r.id).map(mapUserResource)
}

export async function createUser(payload: CreateUserPayload): Promise<CreateUserResult> {
  const response = await api.post('/users', {
    user: {
      name: payload.name.trim(),
      email: payload.email.trim().toLowerCase(),
      phone: payload.phone?.trim() || undefined,
      role: payload.role,
      ...(payload.password ? { password: payload.password } : {}),
    },
  })
  const row = jsonApiPrimaryOne(response.data)
  if (!row?.id) throw new Error('Respuesta inválida al crear el usuario')
  const meta = (response.data as { meta?: Record<string, unknown> })?.meta ?? {}
  return {
    user: mapUserResource(row),
    passwordGenerated: Boolean(meta.password_generated),
    temporaryPassword:
      meta.temporary_password != null ? String(meta.temporary_password) : null,
  }
}

export async function updateUserRole(userId: string, role: UserRole): Promise<User> {
  const response = await api.patch(`/users/${userId}`, { user: { role } })
  const row = jsonApiPrimaryOne(response.data)
  if (!row?.id) throw new Error('Respuesta inválida al actualizar el rol')
  return mapUserResource(row)
}

export async function setUserActive(userId: string, active: boolean): Promise<void> {
  if (active) {
    await api.post(`/users/${userId}/activate`)
  } else {
    await api.post(`/users/${userId}/deactivate`)
  }
}

export async function deleteUser(userId: string): Promise<void> {
  await api.delete(`/users/${userId}`)
}

export async function requestUserPasswordReset(userId: string): Promise<void> {
  await api.post(`/users/${userId}/reset_password`)
}

export function userApiErrorMessage(error: unknown, fallback: string): string {
  return formatRailsError(error, fallback)
}
