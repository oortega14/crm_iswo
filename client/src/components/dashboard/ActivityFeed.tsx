import { useNavigate, Link } from '@tanstack/react-router'
import {
  Activity,
  ArrowRight,
  Bell,
  CalendarClock,
  Target,
  UserPlus,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { cn, formatRelativeTime, getInitials, formatStatusLabel } from '@/lib/utils'
import type { DashboardActivityItem } from '@/lib/dashboardApi'

type ActivityType = DashboardActivityItem['type']

interface ActivityFeedProps {
  data?: DashboardActivityItem[]
  isLoading?: boolean
  isError?: boolean
  /** Divide recordatorios vs resto del día (layout Citas | Movimiento) */
  variant?: 'default' | 'split'
}

const getActivityIcon = (type: ActivityType) => {
  switch (type) {
    case 'reminder_due':
      return Bell
    case 'stage_change':
      return ArrowRight
    case 'new_lead':
      return UserPlus
    default:
      return Target
  }
}

const getActivityMessage = (item: DashboardActivityItem) => {
  switch (item.type) {
    case 'reminder_due':
      return (
        <>
          Recordatorio pendiente para{' '}
          <span className="font-medium">{item.opportunity_name}</span>
        </>
      )
    case 'stage_change':
      return (
        <>
          <span className="font-medium">{item.opportunity_name}</span>
          {' cambió de '}
          <Badge variant="outline" className="mx-1 text-xs">
            {formatStatusLabel(item.old_value || '')}
          </Badge>
          {' a '}
          <Badge variant="secondary" className="mx-1 text-xs">
            {formatStatusLabel(item.new_value || '')}
          </Badge>
        </>
      )
    case 'new_lead':
      return (
        <>
          Nuevo lead{' '}
          <span className="font-medium">{item.opportunity_name}</span>
          {item.source && (
            <span className="text-muted-foreground"> desde {item.source}</span>
          )}
        </>
      )
    default:
      return item.opportunity_name
  }
}

const cardShell =
  'overflow-hidden border-border/70 shadow-sm transition-shadow duration-300 hover:shadow-md'

function ActivityRow({
  item,
  onNavigate,
}: {
  item: DashboardActivityItem
  onNavigate: (opportunityId: string) => void
}) {
  const Icon = getActivityIcon(item.type)
  return (
    <button
      type="button"
      onClick={() => onNavigate(item.opportunity_id)}
      className={cn(
        'group flex items-start gap-3 border-b border-border/40 px-5 py-3.5 text-left transition-all',
        'last:border-b-0 hover:bg-gradient-to-r hover:from-muted/40 hover:to-transparent',
      )}
    >
      <div
        className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-full ring-2 ring-transparent transition-all',
          item.type === 'reminder_due' &&
            'bg-gradient-to-br from-teal-500/25 to-cyan-500/20 text-teal-600 shadow-[0_0_16px_-4px_rgba(45,212,191,0.5)] group-hover:ring-teal-400/30 dark:text-teal-300',
          item.type === 'stage_change' &&
            'bg-gradient-to-br from-violet-500/25 to-fuchsia-500/20 text-violet-600 group-hover:ring-violet-400/30 dark:text-violet-300',
          item.type === 'new_lead' &&
            'bg-gradient-to-br from-amber-500/25 to-orange-500/20 text-amber-600 group-hover:ring-amber-400/30 dark:text-amber-200',
          item.type !== 'reminder_due' &&
            item.type !== 'stage_change' &&
            item.type !== 'new_lead' &&
            'bg-primary/10 text-primary group-hover:bg-primary/15 group-hover:ring-primary/20',
        )}
      >
        <Icon className="size-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="mb-0.5 flex items-center gap-2">
          <Avatar className="size-5">
            <AvatarImage src={item.user_avatar} alt={item.user_name} />
            <AvatarFallback className="text-[10px]">{getInitials(item.user_name)}</AvatarFallback>
          </Avatar>
          <span className="truncate text-xs text-muted-foreground">{item.user_name}</span>
        </div>
        <p className="line-clamp-2 text-sm text-foreground">{getActivityMessage(item)}</p>
        <span className="text-xs text-muted-foreground">{formatRelativeTime(item.created_at)}</span>
      </div>
    </button>
  )
}

export function ActivityFeed({
  data = [],
  isLoading,
  isError,
  variant = 'default',
}: ActivityFeedProps) {
  const navigate = useNavigate()

  const handleActivityClick = (opportunityId: string) => {
    navigate({ to: '/opportunities', search: { selected: opportunityId } })
  }

  const reminders = data.filter((i) => i.type === 'reminder_due')
  const movement = data.filter((i) => i.type !== 'reminder_due')

  if (isLoading && variant === 'split') {
    return (
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {[1, 2].map((i) => (
          <Card key={i} className={cardShell}>
            <CardHeader className="border-b border-border/50 pb-4">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-64" />
            </CardHeader>
            <CardContent className="p-0">
              <div className="flex flex-col gap-4 px-6 py-4">
                {[1, 2, 3].map((j) => (
                  <div key={j} className="flex items-start gap-3">
                    <Skeleton className="size-9 shrink-0 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (isLoading) {
    return (
      <Card className={cardShell}>
        <CardHeader className="border-b border-border/50 pb-4">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400">
              <Activity className="size-4" />
            </span>
            Hoy en el CRM
          </CardTitle>
          <CardDescription>Leads, cambios de etapa y recordatorios del día.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="flex flex-col gap-4 px-6 py-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-start gap-3">
                <Skeleton className="size-8 shrink-0 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (isError) {
    return (
      <Card className={cardShell}>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400">
              <Activity className="size-4" />
            </span>
            Actividad de hoy
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive">
            No se pudo cargar la actividad. Intenta de nuevo más tarde.
          </p>
        </CardContent>
      </Card>
    )
  }

  if (variant === 'split') {
    return (
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-start">
        <Card
          className={cn(
            cardShell,
            'border-teal-400/40 bg-gradient-to-br from-teal-500/[0.14] via-cyan-500/[0.06] to-transparent shadow-[0_0_40px_-12px_rgba(45,212,191,0.35)] dark:from-teal-500/[0.12]',
          )}
        >
          <CardHeader className="border-b border-teal-500/25 pb-4">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-teal-400/40 to-cyan-500/30 text-teal-50 shadow-inner shadow-teal-500/20 ring-1 ring-white/15">
                <CalendarClock className="size-4" />
              </span>
              Citas y recordatorios
            </CardTitle>
            <CardDescription>
              {reminders.length === 0
                ? 'Nada pendiente para hoy — buen momento para prospectar.'
                : `${reminders.length} para revisar hoy`}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[min(320px,50vh)]">
              <div className="flex flex-col">
                {reminders.map((item) => (
                  <ActivityRow key={item.id} item={item} onNavigate={handleActivityClick} />
                ))}
                {reminders.length === 0 && (
                  <div className="flex flex-col items-center justify-center gap-3 px-6 py-12 text-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-teal-500/10 ring-1 ring-teal-500/20">
                      <Bell className="size-8 text-teal-600/70 dark:text-teal-400/80" />
                    </div>
                    <p className="text-sm font-medium text-foreground">Sin citas ni alarmas hoy</p>
                    <p className="max-w-xs text-xs text-muted-foreground">
                      Los recordatorios con fecha de hoy aparecerán aquí para que no se te escape
                      ningún seguimiento.
                    </p>
                    <Button variant="outline" size="sm" className="mt-1 gap-2" asChild>
                      <Link to="/reminders">
                        Ir a recordatorios
                        <ArrowRight className="size-3.5 opacity-70" />
                      </Link>
                    </Button>
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card
          className={cn(
            cardShell,
            'border-sky-400/40 bg-gradient-to-br from-sky-500/[0.14] via-indigo-500/[0.05] to-transparent shadow-[0_0_40px_-12px_rgba(56,189,248,0.35)] dark:from-sky-500/[0.12]',
          )}
        >
          <CardHeader className="border-b border-sky-500/25 pb-4">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400/45 to-indigo-500/35 text-sky-50 shadow-inner shadow-sky-500/25 ring-1 ring-white/15">
                <Activity className="size-4" />
              </span>
              Movimiento del día
            </CardTitle>
            <CardDescription>
              Leads nuevos y cambios de etapa registrados hoy.
              {movement.length > 0 ? ` ${movement.length} eventos` : ''}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[min(320px,50vh)]">
              <div className="flex flex-col">
                {movement.map((item) => (
                  <ActivityRow key={item.id} item={item} onNavigate={handleActivityClick} />
                ))}
                {movement.length === 0 && (
                  <div className="flex flex-col items-center justify-center gap-2 px-6 py-12 text-center">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/50">
                      <Target className="size-7 text-muted-foreground/60" />
                    </div>
                    <p className="text-sm font-medium text-foreground">Aún sin movimiento</p>
                    <p className="max-w-xs text-xs text-muted-foreground">
                      Cuando entren leads o muevas etapas, lo verás aquí al instante.
                    </p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <Card className={cardShell}>
      <CardHeader className="border-b border-border/50 pb-4">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400">
            <Activity className="size-4" />
          </span>
          Hoy en el CRM
        </CardTitle>
        <CardDescription>
          {data.length === 0
            ? 'Cuando haya movimiento, aparecerá aquí.'
            : `${data.length} ${data.length === 1 ? 'evento' : 'eventos'} recientes`}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[300px]">
          <div className="flex flex-col">
            {data.map((item) => (
              <ActivityRow key={item.id} item={item} onNavigate={handleActivityClick} />
            ))}

            {data.length === 0 && (
              <div className="flex flex-col items-center justify-center gap-2 px-6 py-12 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/50">
                  <Target className="size-7 text-muted-foreground/60" />
                </div>
                <p className="text-sm font-medium text-foreground">Todo tranquilo por ahora</p>
                <p className="max-w-xs text-xs text-muted-foreground">
                  No hay eventos hoy. Los recordatorios y movimientos de etapa se listarán aquí.
                </p>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
