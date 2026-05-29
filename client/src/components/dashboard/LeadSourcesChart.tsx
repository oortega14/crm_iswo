import { Radio } from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrency } from '@/lib/utils'
import type { DashboardLeadSourceRow } from '@/lib/dashboardApi'

interface LeadSourcesChartProps {
  currency?: string
  data?: DashboardLeadSourceRow[]
  isLoading?: boolean
  isError?: boolean
}

const KIND_COLORS: Record<string, string> = {
  meta:     '#3B82F6',
  google:   '#22C55E',
  whatsapp: '#10B981',
  web:      '#6366F1',
  referral: '#F59E0B',
  manual:   '#94A3B8',
}

function getColor(kind: string | null, index: number): string {
  if (kind && KIND_COLORS[kind]) return KIND_COLORS[kind]
  const fallbacks = ['#8B5CF6', '#EC4899', '#F97316', '#14B8A6']
  return fallbacks[index % fallbacks.length]
}

const shell =
  'overflow-hidden border-border/70 shadow-sm transition-shadow duration-300 hover:shadow-md'

export function LeadSourcesChart({
  currency = 'COP',
  data = [],
  isLoading,
  isError,
}: LeadSourcesChartProps) {
  if (isLoading) {
    return (
      <Card className={shell}>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <Radio className="size-4" />
            </span>
            Leads por origen
          </CardTitle>
          <CardDescription>Oportunidades activas agrupadas por fuente de lead.</CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[200px] w-full rounded-lg" />
        </CardContent>
      </Card>
    )
  }

  if (isError) {
    return (
      <Card className={shell}>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <Radio className="size-4" />
            </span>
            Leads por origen
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive">No se pudo cargar el desglose por origen.</p>
        </CardContent>
      </Card>
    )
  }

  const total = data.reduce((s, r) => s + r.count, 0)

  return (
    <Card className={shell}>
      <CardHeader className="border-b border-border/50 pb-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <Radio className="size-4" />
            </span>
            Leads por origen
          </CardTitle>
        </div>
        <CardDescription>
          {total === 0
            ? 'Asigna fuentes de lead a tus oportunidades para ver el desglose.'
            : `${total} oportunidades activas clasificadas por canal de entrada.`}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-4">
        {total === 0 ? (
          <div className="flex h-[200px] flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border/80 bg-muted/20 px-4 text-center">
            <p className="text-sm font-medium">Sin datos de origen</p>
            <p className="text-xs text-muted-foreground">
              El gráfico se llenará cuando las oportunidades tengan fuente asignada.
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(160, data.length * 40)}>
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 4, right: 48, left: 8, bottom: 4 }}
              barCategoryGap={10}
            >
              <XAxis type="number" hide domain={[0, 'dataMax']} />
              <YAxis
                dataKey="name"
                type="category"
                width={110}
                tick={{ fontSize: 12, fill: 'var(--foreground)' }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                cursor={{ fill: 'var(--muted)', opacity: 0.5, radius: 6 }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null
                  const row = payload[0].payload as DashboardLeadSourceRow
                  return (
                    <div
                      className="rounded-xl border border-border/80 px-3 py-2 text-xs shadow-xl"
                      style={{ background: 'var(--popover)' }}
                    >
                      <p className="font-semibold text-foreground">{row.name}</p>
                      <p className="mt-1 text-muted-foreground">
                        <span className="font-medium text-foreground">{row.count}</span> op. ·{' '}
                        <span className="text-primary">{formatCurrency(row.value, currency)}</span>
                      </p>
                    </div>
                  )
                }}
              />
              <Bar dataKey="count" radius={[0, 8, 8, 0]} maxBarSize={28} label={{ position: 'right', fontSize: 12, fill: 'var(--foreground)', fontWeight: 600 }}>
                {data.map((row, index) => (
                  <Cell key={row.id ?? 'none'} fill={getColor(row.kind, index)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}
