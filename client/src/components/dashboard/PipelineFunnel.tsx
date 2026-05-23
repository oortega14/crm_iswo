import { useNavigate } from '@tanstack/react-router'
import { ChevronDown, GitBranch, Sparkles } from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
} from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn, formatCurrency, formatStatusLabel } from '@/lib/utils'
import type { DashboardPipelineStage } from '@/lib/dashboardApi'

interface PipelineOption {
  id: string
  name: string
  is_default: boolean
}

interface PipelineFunnelProps {
  data?: DashboardPipelineStage[]
  isLoading?: boolean
  isError?: boolean
  pipelines?: PipelineOption[]
  selectedPipelineId?: string
  onPipelineChange?: (id: string) => void
}

/** Degradados por etapa — ISWO: azul primario + acentos (cian, índigo, ámbar) */
const GRADIENT_PAIRS: readonly [string, string][] = [
  ['#3B82F6', '#2563EB'],
  ['#38BDF8', '#0EA5E9'],
  ['#6366F1', '#8B5CF6'],
  ['#A855F7', '#EC4899'],
  ['#F59E0B', '#EA580C'],
  ['#22C55E', '#059669'],
]

function gradientId(index: number) {
  return `pipelineGrad${index % GRADIENT_PAIRS.length}`
}

/** Barras con ancho mínimo cuando count=0 (Recharts deja width 0 → invisible) */
function FunnelBarShape(props: {
  payload?: { count?: number }
  width?: number
  height?: number
  x?: number
  y?: number
  fill?: string
}) {
  const { payload, fill, x = 0, y = 0, width = 0, height = 0 } = props
  const count = payload?.count ?? 0
  const isZero = count === 0
  const minPx = 16
  const w = isZero ? Math.max(width, minPx) : Math.max(width, 8)
  const ry = Math.min(Number(height) / 2, 10)
  const opacity = isZero ? 0.5 : 1
  return (
    <rect
      x={x}
      y={y}
      width={w}
      height={height}
      fill={fill}
      rx={ry}
      ry={ry}
      opacity={opacity}
    />
  )
}

export function PipelineFunnel({
  data = [],
  isLoading,
  isError,
  pipelines = [],
  selectedPipelineId,
  onPipelineChange,
}: PipelineFunnelProps) {
  const navigate = useNavigate()

  const shell = cn(
    'overflow-hidden border-primary/35 shadow-lg transition-all duration-300',
    'bg-gradient-to-br from-primary/20 via-card to-[#0b1f4a]/35',
    'dark:from-primary/25 dark:via-card dark:to-[#0b1f4a]/45',
    'hover:border-primary/40 hover:shadow-[0_12px_40px_-12px_rgba(59,130,246,0.25)]',
  )

  const chartData = data.map((item, index) => ({
    ...item,
    name: formatStatusLabel(item.stage),
    fill: `url(#${gradientId(index)})`,
    gradIndex: index % GRADIENT_PAIRS.length,
  }))

  const totalCount = chartData.reduce((s, d) => s + (d.count ?? 0), 0)
  const totalValue = chartData.reduce((s, d) => s + (Number(d.value) || 0), 0)
  const maxStageCount = Math.max(...chartData.map((d) => d.count ?? 0), 0)
  /** Evita escala 0→0: las barras “fantasma” necesitan espacio en el eje X */
  const xDomainMax = Math.max(maxStageCount, 4)

  const handleBarClick = (stageId: string) => {
    navigate({ to: '/opportunities', search: { stage: stageId } })
  }

  if (isLoading) {
    return (
      <Card className={shell}>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary/35 to-indigo-600/30 text-primary-foreground ring-1 ring-primary/35">
              <GitBranch className="size-4" />
            </span>
            Embudo del pipeline
          </CardTitle>
          <CardDescription>Oportunidades por etapa del pipeline por defecto.</CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[280px] w-full rounded-xl bg-muted/50" />
        </CardContent>
      </Card>
    )
  }

  if (isError) {
    return (
      <Card className={shell}>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary/35 to-indigo-600/30 text-primary-foreground">
              <GitBranch className="size-4" />
            </span>
            Embudo del pipeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive">
            No se pudo cargar el pipeline. Intenta de nuevo más tarde.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={shell}>
      <CardHeader className="border-b border-primary/15 pb-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary/40 via-[#2563EB]/30 to-indigo-600/35 text-primary-foreground shadow-inner shadow-primary/25 ring-1 ring-white/10">
                <GitBranch className="size-4" />
              </span>
              Embudo del pipeline
            </CardTitle>
            <CardDescription className="text-foreground/85">
              Cada color es una etapa del ciclo comercial (Nueva → Contactada → Calificada →
              Propuesta → Cerrada/Perdida). Clic en una barra para filtrar en el tablero.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            {pipelines.length > 1 && onPipelineChange && (
              <div className="relative">
                <select
                  value={selectedPipelineId ?? ''}
                  onChange={(e) => onPipelineChange(e.target.value)}
                  className="appearance-none rounded-lg border border-border/70 bg-background/80 py-1 pl-2.5 pr-7 text-xs font-medium text-foreground shadow-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
                >
                  {pipelines.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}{p.is_default ? ' (defecto)' : ''}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 top-1/2 size-3 -translate-y-1/2 text-muted-foreground" />
              </div>
            )}
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/20 px-3 py-1 text-xs font-semibold text-foreground">
              <Sparkles className="size-3.5 opacity-90" />
              {totalCount} op. · {formatCurrency(totalValue, 'COP')}
            </span>
          </div>
        </div>

        {chartData.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-2">
            {chartData.map((row, i) => (
              <span
                key={row.stage_id}
                className="inline-flex items-center gap-2 rounded-lg border border-border/80 bg-muted/40 px-2.5 py-1 text-[11px] text-foreground backdrop-blur-sm"
              >
                <span
                  className="h-2 w-2 shrink-0 rounded-full shadow-[0_0_8px_currentColor]"
                  style={{
                    background: `linear-gradient(135deg, ${GRADIENT_PAIRS[row.gradIndex][0]}, ${GRADIENT_PAIRS[row.gradIndex][1]})`,
                    color: GRADIENT_PAIRS[row.gradIndex][0],
                  }}
                />
                <span className="max-w-[140px] truncate font-medium">{row.name}</span>
                <span className="tabular-nums text-muted-foreground">{row.count}</span>
              </span>
            ))}
          </div>
        )}
      </CardHeader>

      <CardContent className="pt-4">
        {chartData.length === 0 ? (
          <div className="relative flex min-h-[260px] flex-col items-center justify-center overflow-hidden rounded-2xl border border-dashed border-primary/25 bg-gradient-to-b from-primary/[0.08] via-indigo-500/[0.05] to-transparent px-4 py-10 text-center">
            <div
              className="pointer-events-none absolute inset-0 opacity-40"
              style={{
                background:
                  'radial-gradient(ellipse 80% 60% at 50% 100%, rgba(6,182,212,0.35), transparent 55%), radial-gradient(ellipse 60% 40% at 80% 20%, rgba(168,85,247,0.25), transparent 50%)',
              }}
            />
            <div className="relative mb-4 flex h-20 w-48 items-end justify-center gap-2">
              {[72, 88, 100].map((w, i) => (
                <div
                  key={i}
                  className="rounded-t-lg bg-gradient-to-t from-primary/60 to-indigo-500/45 opacity-50"
                  style={{
                    width: `${w}%`,
                    height: `${40 + i * 22}px`,
                    maxWidth: '120px',
                  }}
                />
              ))}
            </div>
            <p className="relative text-sm font-semibold text-foreground">
              Tu embudo aparecerá aquí con color
            </p>
            <p className="relative mt-1 max-w-sm text-xs leading-relaxed text-muted-foreground">
              Crea oportunidades en el tablero: verás barras por etapa y su avance dentro del ciclo
              comercial definido en el RFC.
            </p>
          </div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{ top: 8, right: 36, left: 8, bottom: 8 }}
                barCategoryGap={14}
              >
                <defs>
                  {chartData.map((_, index) => {
                    const [a, b] = GRADIENT_PAIRS[index % GRADIENT_PAIRS.length]
                    return (
                      <linearGradient
                        key={gradientId(index)}
                        id={gradientId(index)}
                        x1="0"
                        y1="0"
                        x2="1"
                        y2="0"
                      >
                        <stop offset="0%" stopColor={a} stopOpacity={1} />
                        <stop offset="100%" stopColor={b} stopOpacity={1} />
                      </linearGradient>
                    )
                  })}
                </defs>
                <XAxis type="number" hide domain={[0, xDomainMax]} />
                <YAxis
                  dataKey="name"
                  type="category"
                  width={118}
                  tick={{ fontSize: 12, fill: 'var(--foreground)' }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  cursor={{ fill: 'var(--muted)', opacity: 0.55, radius: 8 }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null
                    const row = payload[0].payload as DashboardPipelineStage & {
                      name: string
                      count: number
                    }
                    const money = formatCurrency(Number(row.value) || 0, 'COP')
                    return (
                      <div
                        className="rounded-xl border border-border/80 px-3 py-2 text-xs shadow-xl"
                        style={{
                          background: 'var(--popover)',
                          boxShadow: '0 16px 48px rgba(0,0,0,0.4)',
                        }}
                      >
                        <p className="font-semibold text-foreground">{row.name}</p>
                        <p className="mt-1 text-muted-foreground">
                          <span className="font-medium text-foreground">{row.count}</span> op. ·{' '}
                          <span className="text-primary">{money}</span>
                        </p>
                      </div>
                    )
                  }}
                />
                <Bar
                  dataKey="count"
                  radius={[0, 10, 10, 0]}
                  cursor="pointer"
                  shape={FunnelBarShape}
                  onClick={(state: { payload?: DashboardPipelineStage }) => {
                    const id = state?.payload?.stage_id
                    if (id != null) handleBarClick(String(id))
                  }}
                  maxBarSize={36}
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${entry.stage_id}`} fill={entry.fill} />
                  ))}
                  <LabelList
                    dataKey="count"
                    position="right"
                    style={{
                      fontSize: '12px',
                      fill: 'var(--foreground)',
                      fontWeight: 600,
                    }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>

            {chartData.length > 1 && (
              <div className="mt-5 flex flex-wrap items-center justify-center gap-2 border-t border-border/40 pt-4 text-xs">
                {chartData.slice(0, -1).map((item, index) => (
                  <div key={item.stage} className="flex items-center gap-1.5">
                    <span
                      className={cn(
                        'inline-flex items-center rounded-full border border-white/10 px-2.5 py-0.5 font-mono text-[11px]',
                        'bg-gradient-to-r from-violet-500/20 to-cyan-500/15 text-foreground shadow-sm',
                      )}
                    >
                      {item.conversion_rate}%
                    </span>
                    {index < chartData.length - 2 && (
                      <span className="text-primary/50">→</span>
                    )}
                  </div>
                ))}
                <span className="w-full text-center text-[11px] text-muted-foreground sm:w-auto sm:pl-2">
                  Conversión entre etapas consecutivas
                </span>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
