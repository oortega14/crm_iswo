import { useEffect, useMemo, useState } from 'react'
import { createFileRoute, useSearch } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { MessageCircle } from 'lucide-react'
import { AppPageShell } from '@/components/layout/AppPageShell'
import { PageHeader } from '@/components/layout/PageHeader'
import { ConversationList, type InboxScope } from '@/components/inbox/ConversationList'
import { WhatsAppThread, type ThreadMessage } from '@/components/opportunities/WhatsAppThread'
import { useAuthStore } from '@/stores/auth'
import { getAuthQueryScope, queryKeys } from '@/lib/queryClient'
import api from '@/lib/api'
import { jsonApiPrimaryList } from '@/lib/opportunityApi'
import { fetchConversations, markConversationRead } from '@/lib/whatsappInboxApi'

const inboxSearchSchema = z.object({
  contact: z.string().optional(),
})

export const Route = createFileRoute('/_app/inbox')({
  validateSearch: inboxSearchSchema,
  component: InboxPage,
})

const THREAD_STATUSES: ThreadMessage['status'][] = ['pending', 'queued', 'sent', 'delivered', 'read', 'failed']

function mapThreadMessages(body: unknown): ThreadMessage[] {
  return jsonApiPrimaryList(body)
    .map((r): ThreadMessage => {
      const a = r.attributes ?? {}
      const dir = String(a.direction ?? 'in')
      const st = String(a.status ?? 'sent')
      return {
        id: String(r.id ?? ''),
        content: String(a.body ?? ''),
        timestamp: String(a.created_at ?? ''),
        isOutgoing: dir === 'out',
        provider: String(a.provider ?? ''),
        status: (THREAD_STATUSES.includes(st as ThreadMessage['status']) ? st : 'sent') as ThreadMessage['status'],
        errorMessage:
          typeof a.error_message === 'string' && a.error_message.trim() ? String(a.error_message) : undefined,
      }
    })
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
}

function InboxPage() {
  const search = useSearch({ from: '/_app/inbox' })
  const navigate = Route.useNavigate()
  const queryClient = useQueryClient()
  const role = useAuthStore((s) => s.user?.role)
  const authScope = getAuthQueryScope()
  const canSeeAll = role !== 'consultant'
  const canSend = role !== 'viewer'

  const [scope, setScope] = useState<InboxScope>(canSeeAll ? 'all' : 'mine')
  const [searchText, setSearchText] = useState('')

  const { data: listResult, isLoading } = useQuery({
    queryKey: queryKeys.whatsappConversations.list(authScope, { scope }),
    queryFn: () => fetchConversations({ scope }),
    enabled: Boolean(authScope),
    refetchInterval: 20_000,
    refetchOnWindowFocus: true,
  })

  const conversations = useMemo(() => listResult?.conversations ?? [], [listResult])
  const selected = useMemo(
    () => conversations.find((c) => c.contactId === search.contact) ?? null,
    [conversations, search.contact],
  )

  // Auto-selecciona la primera conversación si no hay ninguna en la URL.
  useEffect(() => {
    if (!search.contact && conversations.length > 0) {
      void navigate({ search: { contact: conversations[0].contactId }, replace: true })
    }
  }, [search.contact, conversations, navigate])

  const { data: threadMessages, isLoading: threadLoading } = useQuery({
    queryKey: queryKeys.whatsappConversations.messages(selected?.contactId ?? ''),
    queryFn: async () => {
      const response = await api.get('/whatsapp_messages', { params: { contact_id: selected?.contactId } })
      return mapThreadMessages(response.data)
    },
    enabled: Boolean(selected?.contactId),
    refetchInterval: 8000,
  })

  const markReadMutation = useMutation({
    mutationFn: (contactId: string) => markConversationRead(contactId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.whatsappConversations.all })
    },
  })

  useEffect(() => {
    if (selected && selected.unreadCount > 0) {
      markReadMutation.mutate(selected.contactId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.contactId, selected?.unreadCount])

  return (
    <AppPageShell className="h-full min-h-0" contentClassName="flex h-full min-h-0 flex-col gap-4 p-4 lg:p-6">
      <PageHeader
        title="WhatsApp"
        description="Bandeja de entrada unificada — todas las conversaciones sin abrir cada oportunidad (RFC §6.6)."
      />

      <div className="flex min-h-0 flex-1 overflow-hidden rounded-lg border">
        <ConversationList
          conversations={conversations}
          isLoading={isLoading}
          activeContactId={selected?.contactId ?? null}
          onSelect={(contactId) => void navigate({ search: { contact: contactId } })}
          scope={scope}
          onScopeChange={setScope}
          canSeeAll={canSeeAll}
          search={searchText}
          onSearchChange={setSearchText}
        />

        <div className="flex min-h-0 flex-1 flex-col p-3">
          {selected ? (
            <WhatsAppThread
              contactId={selected.contactId}
              contactName={selected.contactName ?? 'Sin nombre'}
              contactPhone={selected.contactPhone ?? ''}
              messages={threadLoading ? [] : (threadMessages ?? [])}
              canSend={canSend}
              canDelete={false}
            />
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 text-muted-foreground">
              <MessageCircle className="size-10" />
              <p className="text-sm">Selecciona una conversación para ver el hilo</p>
            </div>
          )}
        </div>
      </div>
    </AppPageShell>
  )
}
