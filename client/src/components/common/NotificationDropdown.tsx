import { useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Bell, Target, AlertCircle, UserPlus } from 'lucide-react'
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
import type { Notification } from '@/types'

export function NotificationDropdown() {
  const navigate = useNavigate()

  const { data: notifications } = useQuery({
    queryKey: queryKeys.notifications,
    queryFn: async () => {
      const response = await api.get<{ data: Notification[] }>(
        '/reminders?status=pending&overdue=true&per_page=10'
      )
      // Transform reminders to notifications format
      return response.data.data.map((r) => ({
        id: r.id,
        type: 'reminder_due' as const,
        title: 'Recordatorio pendiente',
        message: r.message,
        opportunity_id: r.opportunity_id,
        created_at: r.scheduled_at,
      }))
    },
    refetchInterval: 60000,
  })

  const unreadCount = notifications?.length || 0

  const getIcon = (type: string) => {
    switch (type) {
      case 'reminder_due':
        return Bell
      case 'stage_change':
        return Target
      case 'new_lead':
        return UserPlus
      case 'duplicate_found':
        return AlertCircle
      default:
        return Bell
    }
  }

  const handleNotificationClick = (notification: Notification) => {
    if (notification.opportunity_id) {
      navigate({ to: '/opportunities', search: { selected: notification.opportunity_id } })
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
              {unreadCount}
            </Badge>
          )}
          <span className="sr-only">Notificaciones</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notificaciones</span>
          {unreadCount > 0 && (
            <Badge variant="secondary" className="text-xs">
              {unreadCount} pendientes
            </Badge>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <ScrollArea className="h-[300px]">
          {notifications && notifications.length > 0 ? (
            notifications.map((notification) => {
              const Icon = getIcon(notification.type)
              return (
                <DropdownMenuItem
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className="flex items-start gap-3 p-3 cursor-pointer"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Icon className="size-4" />
                  </div>
                  <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                    <p className="text-sm font-medium">{notification.title}</p>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {notification.message}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatRelativeTime(notification.created_at)}
                    </p>
                  </div>
                </DropdownMenuItem>
              )
            })
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Bell className="size-8 text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">No hay notificaciones</p>
            </div>
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
