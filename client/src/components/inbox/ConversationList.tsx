import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { Search, Inbox } from 'lucide-react'
import { ConversationListItem } from './ConversationListItem'
import type { ConversationRow } from '@/lib/whatsappInboxApi'

export type InboxScope = 'mine' | 'unassigned' | 'all'

export function ConversationList({
  conversations,
  isLoading,
  activeContactId,
  onSelect,
  scope,
  onScopeChange,
  canSeeAll,
  search,
  onSearchChange,
}: {
  conversations: ConversationRow[]
  isLoading: boolean
  activeContactId: string | null
  onSelect: (contactId: string) => void
  scope: InboxScope
  onScopeChange: (scope: InboxScope) => void
  canSeeAll: boolean
  search: string
  onSearchChange: (value: string) => void
}) {
  const filtered = search.trim()
    ? conversations.filter((c) => {
        const q = search.trim().toLowerCase()
        return (
          c.contactName?.toLowerCase().includes(q) ||
          c.contactPhone?.toLowerCase().includes(q) ||
          c.lastMessageBody?.toLowerCase().includes(q)
        )
      })
    : conversations

  return (
    <div className="flex h-full min-h-0 w-full max-w-[320px] shrink-0 flex-col border-r">
      <div className="shrink-0 space-y-3 border-b p-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar conversación..."
            className="h-8 pl-8 text-sm"
          />
        </div>
        <Tabs value={scope} onValueChange={(v) => onScopeChange(v as InboxScope)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="mine" className="text-xs">Mías</TabsTrigger>
            <TabsTrigger value="unassigned" className="text-xs">Sin asignar</TabsTrigger>
            <TabsTrigger value="all" disabled={!canSeeAll} className="text-xs">Todas</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        {isLoading ? (
          <div className="space-y-3 p-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="size-9 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-2/3" />
                  <Skeleton className="h-3 w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-12 text-center text-muted-foreground">
            <Inbox className="size-8" />
            <p className="text-sm">
              {scope === 'unassigned' ? 'No hay leads sin asignar' : 'No hay conversaciones'}
            </p>
          </div>
        ) : (
          filtered.map((c) => (
            <ConversationListItem
              key={c.contactId}
              conversation={c}
              active={c.contactId === activeContactId}
              onClick={() => onSelect(c.contactId)}
            />
          ))
        )}
      </ScrollArea>
    </div>
  )
}
