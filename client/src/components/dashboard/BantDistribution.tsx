import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'
import { Gauge } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type { DashboardBantDistribution } from '@/lib/dashboardApi'

interface BantDistributionProps {
  data?: DashboardBantDistribution
  isLoading?: boolean
  isError?: boolean
}

const COLORS = {
  low: 'var(--score-low)',
  medium: 'var(--score-medium)',
  high: 'var(--score-high)',
}

const shell =
  'overflow-hidden border-border/70 shadow-sm transition-shadow duration-300 hover:shadow-md'

export function BantDistribution({ data, isLoading, isError }: BantDistributionProps) {
  if (isLoading) {
    return (
      <Card className={shell}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400">
                <Gauge className="size-4" />
              </span>
              Distribución BANT
            </CardTitle>
            <Skeleton className="h-5 w-24 rounded-md" />
          </div>
          <CardDescription>Distribución de oportunidades por rango de puntuación.</CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[200px] w-full rounded-lg" />
        </CardContent>
      </Card>
    )
  }

  if (isError || data == null) {
    return (
      <Card className={shell}>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400">
              <Gauge className="size-4" />
            </span>
            Distribución BANT
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive">
            No se pudo cargar la distribución BANT. Intenta de nuevo más tarde.
          </p>
        </CardContent>
      </Card>
    )
  }

  const distribution = data
  const chartData = [
    { name: 'Bajo (0-39)', value: distribution.low, color: COLORS.low },
    { name: 'Medio (40-69)', value: distribution.medium, color: COLORS.medium },
    { name: 'Alto (70-100)', value: distribution.high, color: COLORS.high },
  ]

  const total = distribution.low + distribution.medium + distribution.high

  return (
    <Card className={shell}>
      <CardHeader className="border-b border-border/50 pb-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400">
              <Gauge className="size-4" />
            </span>
            Distribución BANT
          </CardTitle>
          <Badge variant="secondary" className="font-mono text-xs">
            Prom. {distribution.average}
          </Badge>
        </div>
        <CardDescription>
          {total === 0
            ? 'Añade puntuaciones BANT a tus oportunidades para ver el reparto.'
            : `${total} oportunidades clasificadas por rango.`}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-2">
        {total === 0 ? (
          <div className="flex h-[200px] flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border/80 bg-muted/20 px-4 text-center">
            <p className="text-sm font-medium">Sin datos de puntuación</p>
            <p className="text-xs text-muted-foreground">El gráfico se llenará al calificar oportunidades.</p>
          </div>
        ) : (
          <div className="relative h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={52}
                  outerRadius={78}
                  paddingAngle={3}
                  dataKey="value"
                  stroke="hsl(var(--background))"
                  strokeWidth={2}
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} className="transition-opacity" />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => [`${value} oportunidades`, '']}
                  contentStyle={{
                    backgroundColor: 'var(--popover)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Legend
                  verticalAlign="bottom"
                  height={40}
                  formatter={(value: string) => (
                    <span className="text-xs text-foreground">{value}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
            <div
              className="pointer-events-none absolute inset-0 flex items-center justify-center pb-8"
              aria-hidden
            >
              <div className="text-center">
                <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  Media
                </p>
                <p className="text-2xl font-bold tabular-nums text-foreground">{distribution.average}</p>
              </div>
            </div>
          </div>
        )}

        {total > 0 && (
          <div className="mt-1 grid grid-cols-3 gap-2">
            {/* Bajo — naranja (#f97316) */}
            <div className={cn(
              'flex flex-col items-center rounded-lg border p-2.5',
              'bg-orange-50/80 border-orange-200/60 text-orange-700',
              'dark:bg-orange-950/50 dark:border-orange-800/50 dark:text-orange-400',
            )}>
              <span className="text-lg font-semibold tabular-nums">
                {distribution.low}
              </span>
              <span className="text-[10px] text-muted-foreground">
                {Math.round((distribution.low / total) * 100)}% bajo
              </span>
            </div>
            {/* Medio — amarillo (#eab308) */}
            <div className={cn(
              'flex flex-col items-center rounded-lg border p-2.5',
              'bg-yellow-50/80 border-yellow-200/60 text-yellow-700',
              'dark:bg-yellow-950/50 dark:border-yellow-800/50 dark:text-yellow-400',
            )}>
              <span className="text-lg font-semibold tabular-nums">
                {distribution.medium}
              </span>
              <span className="text-[10px] text-muted-foreground">
                {Math.round((distribution.medium / total) * 100)}% medio
              </span>
            </div>
            {/* Alto — esmeralda (#10b981) */}
            <div className={cn(
              'flex flex-col items-center rounded-lg border p-2.5',
              'bg-emerald-50/80 border-emerald-200/60 text-emerald-700',
              'dark:bg-emerald-950/50 dark:border-emerald-800/50 dark:text-emerald-400',
            )}>
              <span className="text-lg font-semibold tabular-nums">
                {distribution.high}
              </span>
              <span className="text-[10px] text-muted-foreground">
                {Math.round((distribution.high / total) * 100)}% alto
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
