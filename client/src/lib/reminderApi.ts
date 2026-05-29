import api, { formatRailsError } from '@/lib/api'
import { jsonApiIncluded, jsonApiPrimaryList, type JsonApiResource } from '@/lib/opportunityApi'

export type ReminderChannel = 'email' | 'whatsapp' | 'in_app'
export type ReminderStatus = 'pending' | 'sent' | 'failed' | 'done'

export interface ReminderSummary {
  id: string
  subject: string
  message: string
  remindAt: string
  channel: ReminderChannel | string
  status: ReminderStatus | string
  completed: boolean
  overdue: boolean
  opportunityId?: string
  opportunityTitle?: string
  sentAt?: string
  lastError?: string
}

/** Fila de recordatorio en pestaña de oportunidad (mismo shape que antes). */
export type OpportunityReminderRow = {
  id: string
  subject: string
  message: string
  remind_at: string
  channel: string
  status: string
}

export interface ReminderListFilters {
  status?: ReminderStatus | string
  overdue?: boolean
  upcoming?: boolean
  page?: number
  items?: number
  [key: string]: unknown
}

export interface ReminderListResult {
  reminders: ReminderSummary[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export interface ReminderStats {
  pending: number
  overdue: number
  done: number
}

type ReminderAttributes = {
  subject?: string
  message?: string
  title?: string
  body?: string
  remind_at?: string
  channel?: string
  status?: string
  sent_at?: string
  last_error?: string
  overdue?: boolean
}

function opportunityTitleFromIncluded(
  opportunityId: string | undefined,
  included: JsonApiResource[],
): string | undefined {
  if (!opportunityId) return undefined
  const opp = included.find((r) => String(r.id) === opportunityId && r.type === 'opportunity')
  if (!opp?.attributes) return undefined
  const a = opp.attributes as { contact_name?: string; title?: string }
  return a.contact_name?.trim() || a.title?.trim() || undefined
}

export function mapReminderResource(
  resource: JsonApiResource,
  included: JsonApiResource[] = [],
): ReminderSummary {
  const attrs = (resource.attributes ?? {}) as ReminderAttributes
  const oppRel = resource.relationships?.opportunity?.data as { id?: string } | null
  const opportunityId = oppRel?.id != null ? String(oppRel.id) : undefined
  const status = (attrs.status || 'pending') as ReminderStatus

  return {
    id: String(resource.id ?? ''),
    subject: attrs.subject || attrs.title || 'Recordatorio',
    message: attrs.message || attrs.body || '',
    remindAt: attrs.remind_at || '',
    channel: (attrs.channel || 'in_app') as ReminderChannel,
    status,
    completed: status === 'done',
    overdue: Boolean(attrs.overdue),
    opportunityId,
    opportunityTitle: opportunityTitleFromIncluded(opportunityId, included),
    sentAt: attrs.sent_at,
    lastError: attrs.last_error,
  }
}

export function mapOpportunityReminderResource(resource: JsonApiResource): OpportunityReminderRow {
  const summary = mapReminderResource(resource, [])
  return {
    id: summary.id,
    subject: summary.subject,
    message: summary.message,
    remind_at: summary.remindAt,
    channel: summary.channel,
    status: summary.status,
  }
}

function parsePaginationMeta(body: unknown): {
  total: number
  page: number
  pageSize: number
  totalPages: number
} {
  const meta = (body as { meta?: { pagination?: Record<string, number> } })?.meta?.pagination
  return {
    total: meta?.count ?? 0,
    page: meta?.page ?? 1,
    pageSize: meta?.items ?? 25,
    totalPages: meta?.pages ?? 1,
  }
}

export function buildReminderListParams(filters: ReminderListFilters): Record<string, string | number> {
  const params: Record<string, string | number> = {}
  if (filters.status) params.status = filters.status
  if (filters.overdue) params.overdue = 'true'
  if (filters.upcoming) params.upcoming = 'true'
  if (filters.page) params.page = filters.page
  if (filters.items) params.items = filters.items
  return params
}

export async function fetchRemindersList(filters: ReminderListFilters = {}): Promise<ReminderListResult> {
  const response = await api.get('/reminders', {
    params: buildReminderListParams({ items: 200, ...filters }),
  })
  const resources = jsonApiPrimaryList(response.data)
  const included = jsonApiIncluded(response.data)
  const pagination = parsePaginationMeta(response.data)
  return {
    reminders: resources.map((r) => mapReminderResource(r, included)),
    ...pagination,
    total: pagination.total || resources.length,
  }
}

export async function fetchOpportunityReminders(opportunityId: string): Promise<OpportunityReminderRow[]> {
  const response = await api.get(`/opportunities/${opportunityId}/reminders`)
  return jsonApiPrimaryList(response.data).map(mapOpportunityReminderResource)
}

export async function fetchReminderStats(): Promise<ReminderStats> {
  const base = { items: 1 }
  const [pendingRes, overdueRes, doneRes] = await Promise.all([
    api.get('/reminders', { params: { ...base, status: 'pending' } }),
    api.get('/reminders', { params: { ...base, status: 'pending', overdue: 'true' } }),
    api.get('/reminders', { params: { ...base, status: 'done' } }),
  ])
  const read = (body: unknown) => parsePaginationMeta(body).total
  return {
    pending: read(pendingRes.data),
    overdue: read(overdueRes.data),
    done: read(doneRes.data),
  }
}

export async function fetchOverdueRemindersCount(): Promise<number> {
  const response = await api.get('/reminders', {
    params: { status: 'pending', overdue: 'true', items: 1 },
  })
  return parsePaginationMeta(response.data).total
}

export interface CreateReminderInput {
  opportunityId: string
  remindAt: string
  channel: ReminderChannel
  subject: string
  message?: string
}

export async function createOpportunityReminder(input: CreateReminderInput): Promise<ReminderSummary> {
  const response = await api.post(`/opportunities/${input.opportunityId}/reminders`, {
    reminder: {
      remind_at: input.remindAt,
      channel: input.channel,
      subject: input.subject.trim(),
      message: input.message?.trim() || undefined,
    },
  })
  const resource = jsonApiPrimaryList(response.data)[0]
  if (!resource) throw new Error('Respuesta inválida al crear recordatorio')
  return mapReminderResource(resource, jsonApiIncluded(response.data))
}

export async function completeReminder(id: string): Promise<void> {
  await api.post(`/reminders/${id}/complete`)
}

export async function reopenReminder(id: string): Promise<void> {
  await api.patch(`/reminders/${id}`, { reminder: { status: 'pending' } })
}

export async function snoozeReminder(id: string, minutes: number): Promise<void> {
  await api.post(`/reminders/${id}/snooze`, { minutes })
}

export async function deleteReminder(id: string): Promise<void> {
  await api.delete(`/reminders/${id}`)
}

/** Opciones para vincular recordatorio a una oportunidad (diálogo de creación). */
export async function fetchOpportunityOptionsForReminder(): Promise<Array<{ id: string; label: string }>> {
  const response = await api.get('/opportunities', { params: { items: 100 } })
  return jsonApiPrimaryList(response.data).map((r) => {
    const a = r.attributes ?? {}
    const contactName = typeof a.contact_name === 'string' ? a.contact_name : ''
    const title = typeof a.title === 'string' ? a.title : ''
    return {
      id: String(r.id ?? ''),
      label: contactName || title || `Oportunidad ${r.id}`,
    }
  })
}

export function reminderListErrorMessage(err: unknown): string {
  return formatRailsError(err, 'Error al cargar recordatorios')
}
