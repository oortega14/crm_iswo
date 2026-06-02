import api from '@/lib/api'

export type NotificationKind =
  | 'reminder_due'
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

interface ApiNotification {
  id: string | number
  attributes: {
    kind: NotificationKind
    title: string
    body: string | null
    resource_type: string | null
    resource_id: string | null
    unread: boolean
    read_at: string | null
    created_at: string
  }
}

export function mapNotification(r: ApiNotification): AppNotification {
  const a = r.attributes
  const isOpportunity =
    typeof a.resource_type === 'string' &&
    a.resource_type.toLowerCase() === 'opportunity'
  const opportunityId = isOpportunity ? (a.resource_id != null ? String(a.resource_id) : null) : null

  return {
    id: String(r.id),
    type: a.kind,
    title: a.title,
    message: a.body ?? '',
    opportunityId,
    unread: a.unread,
    createdAt: a.created_at,
  }
}

export async function fetchUnreadNotifications(limit = 20): Promise<AppNotification[]> {
  const res = await api.get<{ data: ApiNotification[] }>('/notifications', {
    params: { unread: 'true', limit },
  })
  return (res.data.data ?? []).map(mapNotification)
}

export async function markNotificationRead(id: string): Promise<void> {
  await api.patch(`/notifications/${id}/read`)
}

export async function markAllNotificationsRead(): Promise<void> {
  await api.post('/notifications/read_all')
}
