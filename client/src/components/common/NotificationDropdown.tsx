import { useEffect, useRef } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Bell, Target, AlertCircle, UserPlus, CheckCheck, Loader2 } from 'lucide-react'
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
import {
  getAuthQueryScope,
  invalidateDuplicateFlagsQueries,
  invalidateNotificationsQueries,
  queryKeys,
} from '@/lib/queryClient'
import {
  fetchUnreadNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  notificationErrorMessage,
  type AppNotification,
} from '@/lib/notificationApi'
import { isPlatformTenant } from '@/lib/platformTenant'
import { useAuthStore, useTenant } from '@/stores/auth'
import { formatRelativeTime } from '@/lib/utils'

function getIcon(type: AppNotification['type']) {
  switch (type) {
    case 'reminder_due':
    case 'reminder_created':
    case 'reminder_upcoming':
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

export function NotificationDropdown() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const userRole = useAuthStore((s) => s.user?.role)
  const tenant = useTenant()
  const authScope = getAuthQueryScope()
  const isStaff = userRole === 'admin' || userRole === 'manager'
  const isCommercial = isAuthenticated && !isPlatformTenant(tenant) && Boolean(authScope)

  const notificationsQueryKey = authScope
    ? queryKeys.notifications.unread(authScope)
    : queryKeys.notifications.all

  const {
    data: notifications = [],
    isPending,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: notificationsQueryKey,
    queryFn: () => fetchUnreadNotifications(20),
    enabled: isCommercial,
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    retry: 1,
  })

  const duplicateNotifIdsRef = useRef('')
  useEffect(() => {
    if (!isStaff) return
    const dupKey = notifications
      .filter((n) => n.type === 'duplicate_found')
      .map((n) => n.id)
      .sort()
      .join(',')
    if (!dupKey || dupKey === duplicateNotifIdsRef.current) return
    duplicateNotifIdsRef.current = dupKey
    void invalidateDuplicateFlagsQueries(queryClient)
  }, [notifications, isStaff, queryClient])

  const readMutation = useMutation({
    mutationFn: markNotificationRead,
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: notificationsQueryKey })
      const previous = queryClient.getQueryData<AppNotification[]>(notificationsQueryKey)
      queryClient.setQueryData<AppNotification[]>(notificationsQueryKey, (old) =>
        (old ?? []).filter((n) => n.id !== id),
      )
      return { previous }
    },
    onError: (_err, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(notificationsQueryKey, context.previous)
      }
    },
    onSettled: () => void invalidateNotificationsQueries(queryClient),
  })

  const readAllMutation = useMutation({
    mutationFn: markAllNotificationsRead,
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: notificationsQueryKey })
      const previous = queryClient.getQueryData<AppNotification[]>(notificationsQueryKey)
      queryClient.setQueryData<AppNotification[]>(notificationsQueryKey, [])
      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(notificationsQueryKey, context.previous)
      }
    },
    onSettled: () => void invalidateNotificationsQueries(queryClient),
  })

  if (!isCommercial) {
    return null
  }

  const unreadCount = notifications.length

  const handleSelect = (n: AppNotification) => {
    readMutation.mutate(n.id)
    if (n.opportunityId) {
      void navigate({ to: '/opportunities', search: { selected: n.opportunityId } })
      return
    }
    if (n.type === 'reminder_due' || n.type === 'reminder_created' || n.type === 'reminder_upcoming') {
      void navigate({ to: '/reminders' })
      return
    }
    if (n.type === 'duplicate_found') {
      void navigate({ to: '/duplicates' })
    }
  }

  return (
    <DropdownMenu onOpenChange={(open) => open && void refetch()}>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={
            unreadCount > 0
              ? `Notificaciones, ${unreadCount} sin leer`
              : 'Notificaciones'
          }
        >
          <Bell className="size-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -right-1 -top-1 h-5 min-w-5 px-1 text-xs"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between gap-2">
          <span>Notificaciones</span>
          {(isPending || isFetching) && (
            <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
          )}
        </DropdownMenuLabel>

        {unreadCount > 0 && (
          <DropdownMenuItem
            className="text-xs text-muted-foreground focus:text-foreground"
            disabled={readAllMutation.isPending}
            onSelect={(e) => {
              e.preventDefault()
              readAllMutation.mutate()
            }}
          >
            <CheckCheck className="mr-2 size-3.5" />
            Marcar todas como leídas
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator />

        <ScrollArea className="h-[300px]">
          {isError ? (
            <div className="flex flex-col items-center justify-center gap-2 px-3 py-8 text-center">
              <p className="text-sm text-destructive">
                {notificationErrorMessage(error, 'No se pudieron cargar las notificaciones.')}
              </p>
              <Button variant="outline" size="sm" onClick={() => void refetch()}>
                Reintentar
              </Button>
            </div>
          ) : isPending ? (
            <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
              <Loader2 className="mr-2 size-4 animate-spin" />
              Cargando…
            </div>
          ) : notifications.length > 0 ? (
            notifications.map((n) => {
              const Icon = getIcon(n.type)
              return (
                <DropdownMenuItem
                  key={n.id}
                  className="flex cursor-pointer items-start gap-3 p-3"
                  onSelect={() => handleSelect(n)}
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Icon className="size-4" />
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <p className="text-sm font-medium leading-tight">{n.title}</p>
                    {n.message && (
                      <p className="line-clamp-2 text-xs text-muted-foreground">{n.message}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {formatRelativeTime(n.createdAt)}
                    </p>
                  </div>
                  {n.unread && (
                    <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" aria-hidden />
                  )}
                </DropdownMenuItem>
              )
            })
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Bell className="mb-2 size-8 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">Sin notificaciones nuevas</p>
            </div>
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
