import { Link, useNavigate } from '@tanstack/react-router'
import {
  AlertTriangle,
  Briefcase,
  CheckCircle2,
  Clock,
  Flame,
  Snowflake,
  TrendingUp,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { TemperatureBadge } from '@/components/opportunities/TemperatureBadge'
import type { DashboardBriefing } from '@/lib/dashboardApi'
import { cn, formatCurrency, formatRelativeTime, type TemperatureLevel } from '@/lib/utils'

interface DailyBriefingProps {
  data?: DashboardBriefing
  userName?: string | null
  currency: string
  isLoading?: boolean
  isError?: boolean
}

export function DailyBriefing({ data, currency, isLoading, isError }: DailyBriefingProps) {
  const navigate = useNavigate()

  if (isLoading) return <BriefingSkeleton />

  if (isError || !data) {
    return (
      <Card>
        <CardContent className="p-5 text-sm text-muted-foreground">
          No se pudo cargar el briefing de hoy. Recarga la página.
        </CardContent>
      </Card>
    )
  }

  const { kpis, hot_leads, overdue_reminders, stale_leads } = data
  const displayCurrency = kpis.currency || currency
  const hasItems = hot_leads.length > 0 || overdue_reminders.length > 0 || stale_leads.length > 0

  const openOpportunity = (id: string) =>
    navigate({ to: '/opportunities', search: { selected: id } })

  const kpiCards = [
    {
      title: 'Oportunidades abiertas',
      value: kpis.total_open,
      icon: Briefcase,
      color: 'text-blue-600',
      bg: 'bg-blue-50 dark:bg-blue-950/40',
    },
    {
      title: 'Leads calientes',
      value: kpis.hot_count,
      icon: Flame,
      color: 'text-red-600',
      bg: 'bg-red-50 dark:bg-red-950/40',
    },
    {
      title: 'Recordatorios vencidos',
      value: kpis.overdue_count,
      icon: Clock,
      color: 'text-amber-600',
      bg: 'bg-amber-50 dark:bg-amber-950/40',
    },
    {
      title: 'Nuevas esta semana',
      value: kpis.new_this_week,
      icon: TrendingUp,
      color: 'text-green-600',
      bg: 'bg-green-50 dark:bg-green-950/40',
    },
  ]

  return (
    <div className="space-y-4">

      {/* ── KPI Cards ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {kpiCards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.title}
              </CardTitle>
              <div className={cn('rounded-lg p-2', card.bg)}>
                <card.icon className={cn('size-4', card.color)} />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold tabular-nums">{card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Listas de prioridades ──────────────────────────────────────── */}
      {!hasItems ? (
        <Card>
          <CardContent className="flex items-center gap-3 p-5">
            <CheckCircle2 className="size-5 shrink-0 text-emerald-500" />
            <div>
              <p className="text-sm font-medium">
                {kpis.total_open === 0
                  ? 'Sin oportunidades abiertas. Buen momento para captar leads.'
                  : 'Todo al día — sin recordatorios vencidos ni leads sin seguimiento.'}
              </p>
              {kpis.total_open > 0 && (
                <p className="text-xs text-muted-foreground">
                  Tienes {kpis.total_open} oportunidad{kpis.total_open !== 1 ? 'es' : ''} activa{kpis.total_open !== 1 ? 's' : ''}.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="divide-y divide-border p-0">

            {/* Recordatorios vencidos */}
            {overdue_reminders.length > 0 && (
              <Section
                icon={AlertTriangle}
                title="Recordatorios vencidos"
                iconColor="text-amber-500"
                action={<Link to="/reminders" className="text-xs text-primary hover:underline">Ver todos</Link>}
              >
                {overdue_reminders.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => r.opportunity_id && openOpportunity(r.opportunity_id)}
                    className="flex w-full items-start gap-3 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-muted/60"
                  >
                    <div className="mt-0.5 rounded-full bg-amber-100 p-1.5 dark:bg-amber-950/60 shrink-0">
                      <Clock className="size-3 text-amber-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm">{r.subject}</p>
                      <p className="text-xs text-muted-foreground">
                        {r.opportunity_title && `${r.opportunity_title} · `}
                        Vencía {formatRelativeTime(r.remind_at)}
                      </p>
                    </div>
                  </button>
                ))}
              </Section>
            )}

            {/* Leads calientes */}
            {hot_leads.length > 0 && (
              <Section
                icon={Flame}
                title="Leads calientes"
                iconColor="text-red-500"
                action={
                  <Link
                    to="/opportunities"
                    search={{ temperature: 'hot', view: 'kanban' }}
                    className="text-xs text-primary hover:underline"
                  >
                    Ver kanban
                  </Link>
                }
              >
                {hot_leads.map((lead) => (
                  <button
                    key={lead.id}
                    type="button"
                    onClick={() => openOpportunity(lead.id)}
                    className="flex w-full items-start gap-3 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-muted/60"
                  >
                    <div className="mt-0.5 rounded-full bg-red-100 p-1.5 dark:bg-red-950/60 shrink-0">
                      <Flame className="size-3 text-red-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm">{lead.contact_name || lead.title}</p>
                      <p className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                        {lead.stage_name}
                        {lead.estimated_value > 0 &&
                          ` · ${formatCurrency(lead.estimated_value, lead.currency || displayCurrency)}`}
                        <TemperatureBadge temperature={lead.temperature as TemperatureLevel} className="scale-90" />
                      </p>
                    </div>
                    <span className="shrink-0 font-mono text-xs font-semibold text-red-600 dark:text-red-400">
                      BANT {lead.bant_score}
                    </span>
                  </button>
                ))}
              </Section>
            )}

            {/* Sin actividad reciente */}
            {stale_leads.length > 0 && (
              <Section icon={Snowflake} title="Sin actividad reciente" iconColor="text-slate-400">
                {stale_leads.map((lead) => (
                  <button
                    key={lead.id}
                    type="button"
                    onClick={() => openOpportunity(lead.id)}
                    className="flex w-full items-start gap-3 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-muted/60"
                  >
                    <div className="mt-0.5 rounded-full bg-muted p-1.5 shrink-0">
                      <Snowflake className="size-3 text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm">{lead.contact_name || lead.title}</p>
                      <p className="text-xs text-muted-foreground">
                        Última actividad:{' '}
                        {lead.last_activity_at ? formatRelativeTime(lead.last_activity_at) : '—'}
                      </p>
                    </div>
                  </button>
                ))}
              </Section>
            )}

          </CardContent>
        </Card>
      )}
    </div>
  )
}

/* ── Sub-componentes ─────────────────────────────────────────────────────── */

function Section({
  icon: Icon,
  title,
  iconColor,
  action,
  children,
}: {
  icon: typeof Flame
  title: string
  iconColor: string
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className={cn('size-4', iconColor)} aria-hidden />
          <h3 className="text-sm font-semibold">{title}</h3>
        </div>
        {action}
      </div>
      <div className="space-y-1">{children}</div>
    </div>
  )
}

function BriefingSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-8 w-8 rounded-lg" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-12" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardContent className="space-y-3 p-4">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-10 w-full rounded-md" />
          <Skeleton className="h-10 w-full rounded-md" />
        </CardContent>
      </Card>
    </div>
  )
}
