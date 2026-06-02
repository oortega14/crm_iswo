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
import { leadSourceChartColor } from '@/lib/dashboardChartColors'
import type { DashboardLeadSourceRow } from '@/lib/dashboardApi'

interface LeadSourcesChartProps {
  currency?: string
  data?: DashboardLeadSourceRow[]
  isLoading?: boolean
  isError?: boolean
}

const iconShell =
  'flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-muted-foreground'

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
            <span className={iconShell}>
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
            <span className={iconShell}>
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
            <span className={iconShell}>
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
              <Bar
                dataKey="count"
                radius={[0, 8, 8, 0]}
                maxBarSize={26}
                label={{
                  position: 'right',
                  fontSize: 12,
                  fill: 'var(--muted-foreground)',
                  fontWeight: 500,
                }}
              >
                {data.map((row, index) => (
                  <Cell
                    key={row.id ?? 'none'}
                    fill={leadSourceChartColor(row.kind, index)}
                    fillOpacity={0.85}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}
