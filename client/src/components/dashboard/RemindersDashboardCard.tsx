import { Link, useNavigate } from '@tanstack/react-router'
import { ArrowRight, Bell, CalendarClock, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import type { DashboardBriefing, DashboardBriefingReminder } from '@/lib/dashboardApi'
import { cn, formatRelativeTime } from '@/lib/utils'

interface RemindersDashboardCardProps {
  briefing?: DashboardBriefing
  isLoading?: boolean
}

function ReminderList({
  items,
  variant,
  onOpen,
}: {
  items: DashboardBriefingReminder[]
  variant: 'overdue' | 'upcoming'
  onOpen: (id: string) => void
}) {
  if (items.length === 0) return null

  return (
    <div className="space-y-2">
      <p className="px-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {variant === 'overdue' ? 'Vencidos' : 'Próximos'}
      </p>
      <ul className="space-y-1">
        {items.map((r) => (
          <li key={r.id}>
            <button
              type="button"
              onClick={() => r.opportunity_id && onOpen(r.opportunity_id)}
              className="flex w-full items-start gap-3 rounded-md px-2 py-2 text-left transition-colors hover:bg-muted/60"
            >
              {variant === 'overdue' ? (
                <Clock className="mt-0.5 size-4 shrink-0 text-amber-600" />
              ) : (
                <CalendarClock className="mt-0.5 size-4 shrink-0 text-teal-600" />
              )}
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{r.subject}</p>
                <p className="text-xs text-muted-foreground">
                  {r.opportunity_title && `${r.opportunity_title} · `}
                  {variant === 'overdue' ? 'Vencía' : 'Programado'}{' '}
                  {formatRelativeTime(r.remind_at)}
                </p>
              </div>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Única tarjeta de recordatorios en el dashboard (RFC §6.4). */
export function RemindersDashboardCard({ briefing, isLoading }: RemindersDashboardCardProps) {
  const navigate = useNavigate()

  if (isLoading) {
    return (
      <Card className="border-teal-400/40">
        <CardHeader>
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-12 w-full" />
        </CardContent>
      </Card>
    )
  }

  const kpis = briefing?.kpis
  const pending = kpis?.pending_count ?? 0
  const overdue = kpis?.overdue_count ?? 0
  const today = kpis?.today_count ?? 0
  const overdueItems = briefing?.overdue_reminders ?? []
  const upcomingItems = briefing?.pending_reminders ?? []

  const openOpportunity = (id: string) =>
    navigate({ to: '/opportunities', search: { selected: id } })

  return (
    <Card
      className={cn(
        'overflow-hidden border-teal-400/40 bg-gradient-to-br from-teal-500/[0.14] via-cyan-500/[0.06] to-transparent shadow-[0_0_40px_-12px_rgba(45,212,191,0.35)] dark:from-teal-500/[0.12]',
      )}
    >
      <CardHeader className="border-b border-teal-500/25 pb-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-teal-400/40 to-cyan-500/30 text-teal-50 shadow-inner shadow-teal-500/20 ring-1 ring-white/15">
              <Bell className="size-5" />
            </span>
            <div>
              <CardTitle className="text-base">Recordatorios</CardTitle>
              <CardDescription className="mt-1">
                {pending === 0
                  ? 'Sin pendientes — puedes crear uno desde la bandeja completa.'
                  : `${pending} pendiente${pending !== 1 ? 's' : ''}`}
                {overdue > 0 ? ` · ${overdue} vencido${overdue !== 1 ? 's' : ''}` : ''}
                {today > 0 ? ` · ${today} para hoy` : ''}
              </CardDescription>
            </div>
          </div>
          <Button variant="outline" size="sm" className="gap-2 shrink-0" asChild>
            <Link to="/reminders">
              Ver todos
              <ArrowRight className="size-3.5 opacity-70" />
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        <ReminderList items={overdueItems} variant="overdue" onOpen={openOpportunity} />
        <ReminderList items={upcomingItems} variant="upcoming" onOpen={openOpportunity} />
        {overdueItems.length === 0 && upcomingItems.length === 0 && (
          <p className="text-sm text-muted-foreground">Todo al día con tus recordatorios.</p>
        )}
        {pending > overdueItems.length + upcomingItems.length && (
          <p className="px-2 text-xs text-muted-foreground">
            +{pending - overdueItems.length - upcomingItems.length} más en la bandeja completa
          </p>
        )}
      </CardContent>
    </Card>
  )
}
