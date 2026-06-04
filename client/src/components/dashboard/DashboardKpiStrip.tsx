import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Briefcase, Gauge, Sparkles, Target, TrendingUp } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { cn, formatCurrency } from '@/lib/utils'

export function DashboardDateLine() {
  const now = new Date()
  const raw = format(now, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })
  const dateStr = raw.charAt(0).toUpperCase() + raw.slice(1)
  return (
    <p className="text-sm text-muted-foreground">
      {dateStr}
    </p>
  )
}

interface DashboardKpiStripProps {
  currency?: string
  totalInPipeline: number
  pipelineValue: number
  bantAverage: number | null
  monthClosedValue: number
  winRate: number | null
  wonCount: number
  lostCount: number
  loadingKpis?: boolean
}

function KpiTile({
  label,
  value,
  hint,
  icon: Icon,
  iconClassName,
  className,
  loading,
}: {
  label: string
  value: string
  hint?: string
  icon: typeof Briefcase
  /** Colores del icono por KPI (evita todo “azul igual”) */
  iconClassName: string
  className?: string
  loading?: boolean
}) {
  if (loading) {
    return (
      <div
        className={cn(
          'relative overflow-hidden rounded-2xl border border-border/60 bg-card/80 p-4 shadow-sm',
          className,
        )}
      >
        <Skeleton className="mb-3 h-8 w-8 rounded-lg" />
        <Skeleton className="mb-2 h-3 w-24" />
        <Skeleton className="h-7 w-32" />
      </div>
    )
  }

  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-2xl border border-border/60 bg-card/90 p-4 shadow-sm transition-all duration-300',
        'hover:border-primary/25 hover:shadow-md',
        className,
      )}
    >
      <div
        className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br opacity-40 blur-2xl transition-opacity group-hover:opacity-70"
        style={{
          background:
            'linear-gradient(135deg, hsl(var(--primary) / 0.35), hsl(var(--chart-2) / 0.25))',
        }}
      />
      <div className="relative flex items-start gap-3">
        <span
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 transition-transform duration-300 group-hover:scale-105',
            iconClassName,
          )}
        >
          <Icon className="size-5" strokeWidth={2} />
        </span>
        <div className="min-w-0 flex-1 space-y-0.5">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          <p className="truncate text-xl font-semibold tabular-nums tracking-tight text-foreground sm:text-2xl">
            {value}
          </p>
          {hint ? (
            <p className="text-[11px] leading-snug text-muted-foreground/90">{hint}</p>
          ) : null}
        </div>
      </div>
    </div>
  )
}

export function DashboardKpiStrip({
  currency = 'COP',
  totalInPipeline,
  pipelineValue,
  bantAverage,
  monthClosedValue,
  winRate,
  wonCount,
  lostCount,
  loadingKpis,
}: DashboardKpiStripProps) {
  const loading = loadingKpis ?? false

  const winRateDisplay = winRate != null ? `${winRate}%` : '—'
  const winRateHint =
    winRate != null
      ? `${wonCount} ganadas · ${lostCount} perdidas este mes`
      : 'Sin oportunidades cerradas este mes'

  return (
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
      <KpiTile
        label="Valor en pipeline"
        value={loading ? '—' : formatCurrency(pipelineValue, currency)}
        hint="Estimado en etapas abiertas"
        icon={Sparkles}
        iconClassName="bg-primary/20 text-sky-200 ring-primary/40 shadow-[0_0_20px_-4px_rgba(59,130,246,0.4)]"
        loading={loading}
        className="border-primary/30 bg-gradient-to-br from-primary/[0.12] via-transparent to-transparent dark:from-primary/[0.1]"
      />
      <KpiTile
        label="Oportunidades activas"
        value={loading ? '—' : String(totalInPipeline)}
        hint="En el embudo hoy"
        icon={Briefcase}
        iconClassName="bg-sky-500/20 text-sky-300 ring-sky-400/35 shadow-[0_0_20px_-4px_rgba(56,189,248,0.4)]"
        loading={loading}
        className="border-sky-500/25 bg-gradient-to-br from-sky-500/[0.12] via-transparent to-transparent dark:from-sky-500/[0.08]"
      />
      <KpiTile
        label="Cierre generado (mes)"
        value={loading ? '—' : formatCurrency(monthClosedValue, currency)}
        hint="Suma de oportunidades ganadas este mes"
        icon={TrendingUp}
        iconClassName="bg-amber-500/25 text-amber-200 ring-amber-400/40 shadow-[0_0_22px_-4px_rgba(251,191,36,0.45)]"
        loading={loading}
        className="border-amber-500/30 bg-gradient-to-br from-amber-500/[0.14] via-transparent to-transparent dark:from-amber-500/[0.1]"
      />
      <KpiTile
        label="Tasa de cierre"
        value={loading ? '—' : winRateDisplay}
        hint={loading ? undefined : winRateHint}
        icon={Target}
        iconClassName="bg-emerald-500/20 text-emerald-300 ring-emerald-400/35 shadow-[0_0_20px_-4px_rgba(52,211,153,0.4)]"
        loading={loading}
        className="border-emerald-500/25 bg-gradient-to-br from-emerald-500/[0.12] via-transparent to-transparent dark:from-emerald-500/[0.08]"
      />
      <KpiTile
        label="BANT promedio"
        value={loading ? '—' : bantAverage != null ? String(bantAverage) : '—'}
        hint="Calificación media del portafolio"
        icon={Gauge}
        iconClassName="bg-violet-500/20 text-violet-300 ring-violet-400/35 shadow-[0_0_20px_-4px_rgba(167,139,250,0.45)]"
        loading={loading}
        className="col-span-2 xl:col-span-1 border-violet-500/25 bg-gradient-to-br from-violet-500/[0.12] via-transparent to-transparent dark:from-violet-500/[0.08]"
      />
    </div>
  )
}
