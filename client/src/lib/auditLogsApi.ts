import api, { formatRailsError } from '@/lib/api'
import { jsonApiPrimaryList, type JsonApiResource } from '@/lib/opportunityApi'

export type AuditLogsFilters = {
  q?: string
  event_action?: string
  entity_type?: string
  date_from?: string
  date_to?: string
  page?: number
  items?: number
}

export type AuditEventRow = {
  id: string
  action: string
  entityType: string
  entityId: number | string | null
  metadata: Record<string, unknown>
  ipAddress?: string
  userAgent?: string
  createdAt: string
  actor: {
    id: string | null
    name: string
    email?: string | null
    role?: string | null
  }
}

export type AuditLogsListResult = {
  events: AuditEventRow[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

function mapAuditEventResource(resource: JsonApiResource): AuditEventRow | null {
  if (!resource.id) return null
  const a = resource.attributes ?? {}
  const actorRaw = a.actor
  let actor = { id: null as string | null, name: 'sistema', email: null as string | null, role: null as string | null }
  if (actorRaw && typeof actorRaw === 'object') {
    const ar = actorRaw as Record<string, unknown>
    actor = {
      id: ar.id != null ? String(ar.id) : null,
      name: String(ar.name ?? 'sistema'),
      email: ar.email != null ? String(ar.email) : null,
      role: ar.role != null ? String(ar.role) : null,
    }
  }

  const entityId = a.entity_id
  return {
    id: String(resource.id),
    action: String(a.action ?? ''),
    entityType: String(a.entity_type ?? ''),
    entityId:
      entityId == null
        ? null
        : typeof entityId === 'number'
          ? entityId
          : String(entityId),
    metadata:
      a.metadata && typeof a.metadata === 'object' && !Array.isArray(a.metadata)
        ? (a.metadata as Record<string, unknown>)
        : {},
    ipAddress: a.ip_address != null ? String(a.ip_address) : undefined,
    userAgent: a.user_agent != null ? String(a.user_agent) : undefined,
    createdAt: String(a.created_at ?? ''),
    actor,
  }
}

export function formatAuditAction(action: string): string {
  const trimmed = action.trim()
  if (!trimmed) return '—'
  const labels: Record<string, string> = {
    tenant_onboard: 'Alta de tenant',
    tenant_activate: 'Activación de tenant',
    tenant_deactivate: 'Desactivación de tenant',
    login: 'Inicio de sesión',
    logout: 'Cierre de sesión',
  }
  if (labels[trimmed]) return labels[trimmed]
  return trimmed.replace(/\./g, ' · ')
}

export function auditLogsErrorMessage(error: unknown): string {
  return formatRailsError(error, 'No se pudo cargar el registro de auditoría')
}

export async function fetchAuditLogs(filters: AuditLogsFilters): Promise<AuditLogsListResult> {
  const page = filters.page ?? 1
  const pageSize = filters.items ?? 25
  const params: Record<string, string | number> = { page, items: pageSize }
  if (filters.q) params.q = filters.q
  if (filters.event_action) params.event_action = filters.event_action
  if (filters.entity_type) params.entity_type = filters.entity_type
  if (filters.date_from) params.date_from = filters.date_from
  if (filters.date_to) params.date_to = filters.date_to

  const response = await api.get('/audit_events', { params })
  const rows = jsonApiPrimaryList(response.data)
  const pagination = (
    response.data as { meta?: { pagination?: { count?: number; page?: number; pages?: number } } }
  )?.meta?.pagination

  const events = rows.map(mapAuditEventResource).filter((e): e is AuditEventRow => e != null)

  return {
    events,
    total: pagination?.count ?? events.length,
    page: pagination?.page ?? page,
    pageSize,
    totalPages: pagination?.pages ?? 1,
  }
}
