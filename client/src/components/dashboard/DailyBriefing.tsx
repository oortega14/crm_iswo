import { Link, useNavigate } from '@tanstack/react-router'
import {
  AlertTriangle,
  Flame,
  Snowflake,
  Sparkles,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { TemperatureBadge } from '@/components/opportunities/TemperatureBadge'
import type { DashboardBriefing } from '@/lib/dashboardApi'
import {
  cn,
  formatCurrency,
  formatDate,
  formatRelativeTime,
  type TemperatureLevel,
} from '@/lib/utils'

interface DailyBriefingProps {
  data?: DashboardBriefing
  userName?: string | null
  currency: string
  isLoading?: boolean
  isError?: boolean
}

function BriefingSkeleton() {
  return (
    <Card className="overflow-hidden border-violet-400/25 bg-gradient-to-br from-violet-500/[0.08] via-background to-background">
      <CardContent className="space-y-4 p-5 sm:p-6">
        <Skeleton className="h-6 w-48" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-24 w-full rounded-xl" />
      </CardContent>
    </Card>
  )
}

export function DailyBriefing({
  data,
  userName,
  currency,
  isLoading,
  isError,
}: DailyBriefingProps) {
  const navigate = useNavigate()

  if (isLoading) return <BriefingSkeleton />

  if (isError || !data) {
    return (
      <Card className="border-destructive/30 bg-destructive/5">
        <CardContent className="p-5 text-sm text-muted-foreground">
          No se pudo cargar el briefing de hoy. Recarga la página.
        </CardContent>
      </Card>
    )
  }

  const { kpis, hot_leads, overdue_reminders, stale_leads, generated_at } = data
  const displayCurrency = kpis.currency || currency
  const greeting = userName?.trim() || 'equipo'
  const hasLists =
    hot_leads.length > 0 || overdue_reminders.length > 0 || stale_leads.length > 0

  const openOpportunity = (id: string) => {
    navigate({ to: '/opportunities', search: { selected: id } })
  }

  const kpiTiles = [
    { label: 'Abiertas', value: kpis.total_open, className: 'bg-muted/50' },
    { label: 'Calientes', value: kpis.hot_count, className: 'bg-red-500/10 text-red-700 dark:text-red-300' },
    { label: 'Vencidos', value: kpis.overdue_count, className: 'bg-amber-500/10 text-amber-800 dark:text-amber-300' },
    { label: 'Nuevas (7d)', value: kpis.new_this_week, className: 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-300' },
  ]

  return (
    <Card
      className={cn(
        'overflow-hidden border-violet-400/25 shadow-sm',
        'bg-gradient-to-br from-violet-500/[0.1] via-background to-background',
      )}
    >
      <CardContent className="space-y-5 p-5 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-600/15 text-violet-600 ring-2 ring-violet-500/25">
              <Sparkles className="size-5" aria-hidden />
            </span>
            <div>
              <h2 className="text-lg font-semibold tracking-tight">
                Buenos días, {greeting}
              </h2>
              <p className="text-sm text-muted-foreground">
                Tu briefing del día
                {generated_at ? ` · ${formatDate(generated_at)}` : ''}
              </p>
            </div>
          </div>
          {kpis.pipeline_value > 0 ? (
            <p className="text-sm text-muted-foreground sm:text-right">
              Pipeline:{' '}
              <span className="font-semibold font-mono text-foreground">
                {formatCurrency(kpis.pipeline_value, displayCurrency)}
              </span>
            </p>
          ) : null}
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {kpiTiles.map((tile) => (
            <div
              key={tile.label}
              className={cn('rounded-xl border border-border/60 px-3 py-2.5 text-center', tile.className)}
            >
              <p className="text-xl font-semibold tabular-nums">{tile.value}</p>
              <p className="text-[10px] font-medium uppercase tracking-wide opacity-80">
                {tile.label}
              </p>
            </div>
          ))}
        </div>

        {!hasLists && kpis.total_open === 0 ? (
          <p className="rounded-xl border border-dashed p-4 text-center text-sm text-muted-foreground">
            Sin oportunidades abiertas ni tareas vencidas. Buen momento para captar leads.
          </p>
        ) : null}

        <div className="grid gap-4 lg:grid-cols-3">
          {overdue_reminders.length > 0 ? (
            <BriefingList
              title="Recordatorios vencidos"
              icon={AlertTriangle}
              accent="amber"
              count={kpis.overdue_count}
              footer={
                <Button variant="outline" size="sm" className="w-full" asChild>
                  <Link to="/reminders">Ver recordatorios</Link>
                </Button>
              }
            >
              {overdue_reminders.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => r.opportunity_id && openOpportunity(r.opportunity_id)}
                  className="w-full rounded-lg border border-amber-200/80 bg-amber-50/80 px-3 py-2 text-left text-sm transition-colors hover:bg-amber-100/80 dark:border-amber-800/50 dark:bg-amber-950/30 dark:hover:bg-amber-950/50"
                >
                  <p className="font-medium">{r.subject}</p>
                  <p className="text-[11px] text-muted-foreground">
                    Vencía {formatRelativeTime(r.remind_at)}
                    {r.opportunity_title ? ` · ${r.opportunity_title}` : ''}
                  </p>
                </button>
              ))}
            </BriefingList>
          ) : null}

          {hot_leads.length > 0 ? (
            <BriefingList
              title="Leads calientes"
              icon={Flame}
              accent="red"
              count={kpis.hot_count}
              footer={
                <Button variant="outline" size="sm" className="w-full" asChild>
                  <Link to="/opportunities" search={{ temperature: 'hot', view: 'kanban' }}>
                    Ver calientes
                  </Link>
                </Button>
              }
            >
              {hot_leads.map((lead) => (
                <button
                  key={lead.id}
                  type="button"
                  onClick={() => openOpportunity(lead.id)}
                  className="w-full rounded-lg border border-red-200/80 bg-red-50/80 px-3 py-2 text-left text-sm transition-colors hover:bg-red-100/80 dark:border-red-900/50 dark:bg-red-950/30 dark:hover:bg-red-950/50"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium truncate">
                      {lead.contact_name || lead.title}
                    </p>
                    <span className="shrink-0 font-mono text-xs font-semibold text-red-600 dark:text-red-400">
                      BANT {lead.bant_score}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground flex flex-wrap items-center gap-1.5 mt-0.5">
                    {lead.stage_name}
                    {lead.estimated_value > 0
                      ? ` · ${formatCurrency(lead.estimated_value, lead.currency || displayCurrency)}`
                      : null}
                    <TemperatureBadge
                      temperature={lead.temperature as TemperatureLevel}
                      className="scale-90"
                    />
                  </p>
                </button>
              ))}
            </BriefingList>
          ) : null}

          {stale_leads.length > 0 ? (
            <BriefingList
              title="Sin actividad reciente"
              icon={Snowflake}
              accent="muted"
              count={stale_leads.length}
            >
              {stale_leads.map((lead) => (
                <button
                  key={lead.id}
                  type="button"
                  onClick={() => openOpportunity(lead.id)}
                  className="w-full rounded-lg border bg-muted/40 px-3 py-2 text-left text-sm transition-colors hover:bg-muted/70"
                >
                  <p className="font-medium truncate">{lead.contact_name || lead.title}</p>
                  <p className="text-[11px] text-muted-foreground">
                    Última actividad:{' '}
                    {lead.last_activity_at
                      ? formatRelativeTime(lead.last_activity_at)
                      : '—'}
                  </p>
                </button>
              ))}
            </BriefingList>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}

function BriefingList({
  title,
  icon: Icon,
  accent,
  count,
  children,
  footer,
}: {
  title: string
  icon: typeof Flame
  accent: 'amber' | 'red' | 'muted'
  count?: number
  children: React.ReactNode
  footer?: React.ReactNode
}) {
  const titleColor =
    accent === 'amber'
      ? 'text-amber-700 dark:text-amber-400'
      : accent === 'red'
        ? 'text-red-700 dark:text-red-400'
        : 'text-muted-foreground'

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Icon className={cn('size-4', titleColor)} aria-hidden />
        <h3 className={cn('text-xs font-semibold uppercase tracking-wide', titleColor)}>
          {title}
          {count != null && count > 0 ? ` (${count})` : ''}
        </h3>
      </div>
      <div className="space-y-2">{children}</div>
      {footer}
    </div>
  )
}
