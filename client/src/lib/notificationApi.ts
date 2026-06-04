import api, { formatRailsError } from '@/lib/api'
import { jsonApiPrimaryList, type JsonApiResource } from '@/lib/opportunityApi'

export type NotificationKind =
  | 'reminder_due'
  | 'reminder_created'
  | 'reminder_upcoming'
  | 'stage_change'
  | 'new_lead'
  | 'duplicate_found'

export interface AppNotification {
  id: string
  type: NotificationKind
  title: string
  message: string
  opportunityId: string | null
  unread: boolean
  createdAt: string
}

function parseKind(value: unknown): NotificationKind {
  const k = typeof value === 'string' ? value : ''
  if (
    k === 'reminder_due' ||
    k === 'reminder_created' ||
    k === 'reminder_upcoming' ||
    k === 'stage_change' ||
    k === 'new_lead' ||
    k === 'duplicate_found'
  ) {
    return k
  }
  return 'reminder_due'
}

export function mapNotification(resource: JsonApiResource): AppNotification | null {
  if (!resource.id) return null
  const a = resource.attributes ?? {}
  const resourceType =
    typeof a.resource_type === 'string' ? a.resource_type.toLowerCase() : ''
  const isOpportunity = resourceType === 'opportunity'
  const resourceId = a.resource_id

  return {
    id: String(resource.id),
    type: parseKind(a.kind),
    title: String(a.title ?? ''),
    message: a.body != null ? String(a.body) : '',
    opportunityId: isOpportunity && resourceId != null ? String(resourceId) : null,
    unread: Boolean(a.unread ?? a.read_at == null),
    createdAt: String(a.created_at ?? ''),
  }
}

export function notificationErrorMessage(error: unknown, fallback: string): string {
  return formatRailsError(error, fallback)
}

export async function fetchUnreadNotifications(limit = 20): Promise<AppNotification[]> {
  const res = await api.get('/notifications', {
    params: { unread: 'true', limit },
  })
  return jsonApiPrimaryList(res.data)
    .map(mapNotification)
    .filter((n): n is AppNotification => n != null)
}

export async function markNotificationRead(id: string): Promise<void> {
  await api.patch(`/notifications/${id}/read`)
}

export async function markAllNotificationsRead(): Promise<void> {
  await api.post('/notifications/read_all')
}
