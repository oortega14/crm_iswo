import { Link } from '@tanstack/react-router'
import { Flame, Snowflake, Sun } from 'lucide-react'
import { cn, formatTemperatureLabel } from '@/lib/utils'
import type { TemperatureLevel } from '@/lib/utils'

interface LeadTemperatureStripProps {
  hotCount: number
  warmCount: number
  coldCount: number
  loading?: boolean
}

const ITEMS: {
  key: TemperatureLevel
  icon: typeof Flame
  countKey: keyof Pick<LeadTemperatureStripProps, 'hotCount' | 'warmCount' | 'coldCount'>
  card: string
  icon_bg: string
}[] = [
  {
    key: 'hot',
    icon: Flame,
    countKey: 'hotCount',
    card: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-950/60 dark:text-red-400 dark:border-red-800/60',
    icon_bg: 'bg-red-200/70 text-red-600 dark:bg-red-800/50 dark:text-red-300',
  },
  {
    key: 'warm',
    icon: Sun,
    countKey: 'warmCount',
    card: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-400 dark:border-amber-800/60',
    icon_bg: 'bg-amber-200/70 text-amber-600 dark:bg-amber-800/50 dark:text-amber-300',
  },
  {
    key: 'cold',
    icon: Snowflake,
    countKey: 'coldCount',
    card: 'bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-950/60 dark:text-sky-400 dark:border-sky-800/60',
    icon_bg: 'bg-sky-200/70 text-sky-600 dark:bg-sky-800/50 dark:text-sky-300',
  },
]

export function LeadTemperatureStrip({
  hotCount,
  warmCount,
  coldCount,
  loading,
}: LeadTemperatureStripProps) {
  const counts = { hotCount, warmCount, coldCount }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {ITEMS.map(({ key, icon: Icon, countKey, card, icon_bg }) => (
        <Link
          key={key}
          to="/opportunities"
          search={{ temperature: key, view: 'kanban' }}
          className={cn(
            'group flex items-center gap-3 rounded-2xl border p-4 shadow-sm transition-all',
            'hover:shadow-md hover:scale-[1.01]',
            card,
          )}
        >
          <span className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
            icon_bg,
          )}>
            <Icon className="size-5" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-medium uppercase tracking-wide opacity-80">
              {formatTemperatureLabel(key)}
            </p>
            <p className="text-2xl font-semibold tabular-nums">
              {loading ? '—' : counts[countKey]}
            </p>
            <p className="text-[11px] opacity-70">oportunidades abiertas</p>
          </div>
        </Link>
      ))}
    </div>
  )
}
