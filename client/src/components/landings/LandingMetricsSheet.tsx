import { useQuery } from '@tanstack/react-query'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { formatRailsError } from '@/lib/api'
import { fetchLandingPageMetrics } from '@/lib/landingPagesApi'
import { getAuthQueryScope, queryKeys } from '@/lib/queryClient'
import { cn } from '@/lib/utils'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  landingId: string | null
  landingTitle?: string
}

export function LandingMetricsSheet({ open, onOpenChange, landingId, landingTitle }: Props) {
  const authScope = getAuthQueryScope()
  const metricsDays = 30

  const { data, isLoading, isError, error } = useQuery({
    queryKey: queryKeys.landingPages.metrics(authScope, landingId ?? '', metricsDays),
    queryFn: () => fetchLandingPageMetrics(landingId!, metricsDays),
    enabled: open && Boolean(authScope) && !!landingId,
    staleTime: 0,
  })

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle>Estadísticas</SheetTitle>
          <SheetDescription>{landingTitle ?? 'Landing page'} — últimos 30 días</SheetDescription>
        </SheetHeader>

        {isError && (
          <p className="text-sm text-destructive">
            {formatRailsError(error, 'No se pudieron cargar las estadísticas')}
          </p>
        )}

        {isLoading ? (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-20 rounded-lg" />
              ))}
            </div>
            <Skeleton className="h-48 rounded-lg" />
          </div>
        ) : data ? (
          <div className="space-y-6">
            {/* KPI strip */}
            <div className="grid grid-cols-3 gap-3">
              <KpiCard label="Visitas" value={data.view_count.toLocaleString()} />
              <KpiCard label="Leads" value={String(data.lead_count)} />
              <KpiCard
                label="Conversión"
                value={`${data.conversion_rate}%`}
                highlight={
                  data.conversion_rate > 10
                    ? 'good'
                    : data.conversion_rate > 5
                      ? 'warn'
                      : undefined
                }
              />
            </div>

            {/* Daily leads chart */}
            <div>
              <p className="text-sm font-medium mb-3">Leads por día</p>
              {data.daily_leads.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin submissions en este período.</p>
              ) : (
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={data.daily_leads} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 10 }}
                      tickFormatter={(d: string) => {
                        const [, m, day] = d.split('-')
                        return `${day}/${m}`
                      }}
                      interval="preserveStartEnd"
                    />
                    <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                    <Tooltip
                      labelFormatter={(d: string) => `Fecha: ${d}`}
                      formatter={(v: number) => [v, 'Leads']}
                    />
                    <Bar dataKey="count" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* UTM sources */}
            {data.top_utm_sources.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-3">Fuentes de tráfico</p>
                <div className="space-y-2">
                  {data.top_utm_sources.map(({ source, count }) => {
                    const pct = data.lead_count > 0 ? Math.round((count / data.lead_count) * 100) : 0
                    return (
                      <div key={source} className="flex items-center gap-3 text-sm">
                        <Badge variant="secondary" className="w-28 justify-center shrink-0 capitalize">
                          {source}
                        </Badge>
                        <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="w-12 text-right text-muted-foreground">
                          {count} ({pct}%)
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}

function KpiCard({
  label,
  value,
  highlight,
}: {
  label: string
  value: string
  highlight?: 'good' | 'warn'
}) {
  return (
    <div className="rounded-lg border bg-card p-3 text-center">
      <p
        className={cn(
          'text-2xl font-semibold',
          highlight === 'good' && 'text-primary',
          highlight === 'warn' && 'text-amber-600',
        )}
      >
        {value}
      </p>
      <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
    </div>
  )
}
