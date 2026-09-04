import api, { formatRailsError } from '@/lib/api'
import { jsonApiPrimaryList, type JsonApiResource } from '@/lib/opportunityApi'

export type ConversationBucket = 'mine' | 'network' | 'unassigned' | 'other'

export interface ConversationRow {
  contactId: string
  contactName: string | null
  contactPhone: string | null
  opportunityId: string | null
  opportunityStage: string | null
  ownerUserId: string | null
  ownerName: string | null
  lastMessageBody: string | null
  lastMessageDirection: 'in' | 'out'
  lastMessageStatus: string
  lastMessageAt: string | null
  unreadCount: number
  bucket: ConversationBucket
}

export type ConversationsFilters = {
  scope?: 'mine' | 'unassigned' | 'all'
  unread?: boolean
  page?: number
  items?: number
}

export type ConversationsPagination = {
  page: number
  pages: number
  count: number
  items: number
}

export type ConversationsListResult = {
  conversations: ConversationRow[]
  pagination?: ConversationsPagination
}

export function mapConversationResource(resource: JsonApiResource): ConversationRow | null {
  if (!resource.id) return null
  const a = resource.attributes ?? {}

  return {
    contactId: String(a.contact_id ?? resource.id),
    contactName: a.contact_name != null ? String(a.contact_name) : null,
    contactPhone: a.contact_phone != null ? String(a.contact_phone) : null,
    opportunityId: a.opportunity_id != null ? String(a.opportunity_id) : null,
    opportunityStage: a.opportunity_stage != null ? String(a.opportunity_stage) : null,
    ownerUserId: a.owner_user_id != null ? String(a.owner_user_id) : null,
    ownerName: a.owner_name != null ? String(a.owner_name) : null,
    lastMessageBody: a.last_message_body != null ? String(a.last_message_body) : null,
    lastMessageDirection: a.last_message_direction === 'out' ? 'out' : 'in',
    lastMessageStatus: typeof a.last_message_status === 'string' ? a.last_message_status : 'pending',
    lastMessageAt: a.last_message_at != null ? String(a.last_message_at) : null,
    unreadCount: Number(a.unread_count ?? 0),
    bucket: (['mine', 'network', 'unassigned', 'other'] as const).includes(a.bucket as ConversationBucket)
      ? (a.bucket as ConversationBucket)
      : 'other',
  }
}

export async function fetchConversations(filters: ConversationsFilters = {}): Promise<ConversationsListResult> {
  const params: Record<string, string | number> = {
    items: filters.items ?? 50,
    page: filters.page ?? 1,
  }
  if (filters.scope && filters.scope !== 'all') params.scope = filters.scope
  if (filters.unread) params.unread = 'true'

  const response = await api.get('/whatsapp_conversations', { params })
  const conversations = jsonApiPrimaryList(response.data)
    .map(mapConversationResource)
    .filter((row): row is ConversationRow => row !== null)
  const pagination = (response.data as { meta?: { pagination?: ConversationsPagination } })?.meta?.pagination

  return { conversations, pagination }
}

export async function fetchConversationStats(): Promise<{ unread: number }> {
  const response = await api.get<{ data: { unread: number } }>('/whatsapp_conversations/stats')
  return { unread: Number(response.data?.data?.unread ?? 0) }
}

export async function markConversationRead(contactId: string): Promise<void> {
  await api.patch(`/whatsapp_conversations/${contactId}/mark_read`)
}

export async function sendConversationMessage(
  contactId: string,
  payload: { to_number: string; body: string },
): Promise<void> {
  await api.post(`/whatsapp_conversations/${contactId}/send_message`, payload)
}

export async function claimContact(contactId: string): Promise<void> {
  await api.post(`/contacts/${contactId}/claim`)
}

export function whatsappInboxErrorMessage(err: unknown): string {
  return formatRailsError(err, 'No se pudo cargar la bandeja de WhatsApp')
}
