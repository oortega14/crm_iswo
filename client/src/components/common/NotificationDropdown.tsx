import { useNavigate } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Bell, Target, AlertCircle, UserPlus, CheckCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { queryKeys } from '@/lib/queryClient'
import api from '@/lib/api'
import { formatRelativeTime } from '@/lib/utils'

// -------------------------------------------------------------------------
// Types
// -------------------------------------------------------------------------

interface ApiNotification {
  id: string
  attributes: {
    kind: 'reminder_due' | 'stage_change' | 'new_lead' | 'duplicate_found'
    title: string
    body: string | null
    resource_type: string | null
    resource_id: string | null
    unread: boolean
    read_at: string | null
    created_at: string
  }
}

interface Notification {
  id: string
  type: 'reminder_due' | 'stage_change' | 'new_lead' | 'duplicate_found'
  title: string
  message: string
  opportunityId: string | null
  unread: boolean
  createdAt: string
}

function mapNotification(r: ApiNotification): Notification {
  const a = r.attributes
  const opportunityId =
    a.resource_type === 'Opportunity' ? (a.resource_id ?? null) : null
  return {
    id: r.id,
    type: a.kind,
    title: a.title,
    message: a.body ?? '',
    opportunityId,
    unread: a.unread,
    createdAt: a.created_at,
  }
}

// -------------------------------------------------------------------------
// Component
// -------------------------------------------------------------------------

export function NotificationDropdown() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: notifications = [] } = useQuery<Notification[]>({
    queryKey: queryKeys.notifications,
    queryFn: async () => {
      const res = await api.get<{ data: ApiNotification[] }>('/notifications', {
        params: { unread: 'true', limit: 20 },
      })
      return (res.data.data ?? []).map(mapNotification)
    },
    refetchInterval: 30_000,
  })

  const readMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/notifications/${id}/read`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.notifications }),
  })

  const readAllMutation = useMutation({
    mutationFn: () => api.post('/notifications/read_all'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.notifications }),
  })

  const unreadCount = notifications.length

  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'reminder_due':    return Bell
      case 'stage_change':    return Target
      case 'new_lead':        return UserPlus
      case 'duplicate_found': return AlertCircle
      default:                return Bell
    }
  }

  const handleClick = (n: Notification) => {
    readMutation.mutate(n.id)
    if (n.opportunityId) {
      void navigate({ to: '/opportunities', search: { selected: n.opportunityId } })
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="size-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -right-1 -top-1 h-5 min-w-5 px-1 text-xs"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
          <span className="sr-only">Notificaciones</span>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notificaciones</span>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs text-muted-foreground"
              onClick={() => readAllMutation.mutate()}
              disabled={readAllMutation.isPending}
            >
              <CheckCheck className="mr-1 h-3 w-3" />
              Marcar todas
            </Button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        <ScrollArea className="h-[300px]">
          {notifications.length > 0 ? (
            notifications.map((n) => {
              const Icon = getIcon(n.type)
              return (
                <DropdownMenuItem
                  key={n.id}
                  onClick={() => handleClick(n)}
                  className="flex items-start gap-3 p-3 cursor-pointer"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Icon className="size-4" />
                  </div>
                  <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                    <p className="text-sm font-medium leading-tight">{n.title}</p>
                    {n.message && (
                      <p className="text-xs text-muted-foreground line-clamp-2">{n.message}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {formatRelativeTime(n.createdAt)}
                    </p>
                  </div>
                  {n.unread && (
                    <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
                  )}
                </DropdownMenuItem>
              )
            })
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Bell className="size-8 text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">Sin notificaciones nuevas</p>
            </div>
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
