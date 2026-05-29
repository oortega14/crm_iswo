import { Crown, Medal, Trophy } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrency, cn, getInitials } from '@/lib/utils'
import type { DashboardTopConsultant } from '@/lib/dashboardApi'

interface TopConsultantsProps {
  currency?: string
  data?: DashboardTopConsultant[]
  isLoading?: boolean
  isError?: boolean
}

const shell =
  'overflow-hidden border-border/70 shadow-sm transition-shadow duration-300 hover:shadow-md'

function rankAccent(index: number) {
  if (index === 0) {
    return 'ring-2 ring-amber-400/60 bg-gradient-to-r from-amber-500/10 to-transparent'
  }
  if (index === 1) {
    return 'ring-1 ring-slate-300/80 bg-slate-500/5 dark:ring-slate-600'
  }
  if (index === 2) {
    return 'ring-1 ring-amber-800/20 bg-amber-900/5'
  }
  return 'bg-muted/20'
}

function RankIcon({ index }: { index: number }) {
  if (index === 0) {
    return <Crown className="size-3.5 text-amber-500" aria-hidden />
  }
  if (index === 1) {
    return <Medal className="size-3.5 text-slate-500" aria-hidden />
  }
  if (index === 2) {
    return <Medal className="size-3.5 text-amber-800/70" aria-hidden />
  }
  return <span className="w-3.5 text-center text-[10px] font-bold text-muted-foreground">{index + 1}</span>
}

export function TopConsultants({
  currency = 'COP',
  data = [],
  isLoading,
  isError,
}: TopConsultantsProps) {
  if (isLoading) {
    return (
      <Card className={shell}>
        <CardHeader className="border-b border-border/50 pb-4">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Trophy className="size-4" />
            </span>
            Mejores del mes
          </CardTitle>
          <CardDescription>Oportunidades ganadas en el mes en curso.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 pt-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="size-8 shrink-0 rounded-full" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-4 w-10" />
            </div>
          ))}
        </CardContent>
      </Card>
    )
  }

  if (isError) {
    return (
      <Card className={shell}>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Trophy className="size-4" />
            </span>
            Mejores del mes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive">
            No se pudo cargar el ranking de consultores. Intenta de nuevo más tarde.
          </p>
        </CardContent>
      </Card>
    )
  }

  const maxValue = Math.max(...data.map((d) => d.won_count), 0)

  const rows = data.map((item) => ({
    ...item,
    barPct: maxValue > 0 ? (item.won_count / maxValue) * 100 : 0,
  }))

  return (
    <Card className={shell}>
      <CardHeader className="border-b border-border/50 pb-4">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <Trophy className="size-4" />
          </span>
          Mejores del mes
        </CardTitle>
        <CardDescription>Ranking por oportunidades ganadas (mes actual). Valor facturado estimado.</CardDescription>
      </CardHeader>
      <CardContent className="pt-4">
        {data.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/50">
              <Trophy className="size-7 text-muted-foreground/50" />
            </div>
            <p className="text-sm font-medium text-foreground">Aún no hay cierres este mes</p>
            <p className="text-xs text-muted-foreground max-w-xs">
              Cuando se marquen oportunidades como ganadas, el podio se llenará solo.
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-2.5">
            {rows.map((consultant, index) => (
              <li
                key={consultant.id}
                className={cn(
                  'flex items-center gap-3 rounded-xl p-2.5 transition-colors',
                  rankAccent(index),
                )}
              >
                <div
                  className="flex w-6 shrink-0 items-center justify-center"
                  title={`Puesto ${index + 1}`}
                >
                  <RankIcon index={index} />
                </div>
                <Avatar className="size-9 border border-border/50 shadow-sm">
                  <AvatarImage src={consultant.avatar_url} alt={consultant.name} />
                  <AvatarFallback className="text-xs font-medium">
                    {getInitials(consultant.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium leading-tight text-foreground">
                    {consultant.name}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {formatCurrency(consultant.total_value, currency)} · {consultant.won_count} ganada
                    {consultant.won_count === 1 ? '' : 's'}
                  </p>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted/80">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-amber-500 to-primary transition-all duration-500"
                      style={{ width: `${consultant.barPct}%` }}
                    />
                  </div>
                </div>
                <span className="shrink-0 text-lg font-semibold tabular-nums text-foreground">
                  {consultant.won_count}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
