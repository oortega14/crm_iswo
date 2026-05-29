import { Link } from '@tanstack/react-router'
import { Flame, Snowflake, Sun } from 'lucide-react'
import { cn, formatTemperatureLabel, getTemperatureColor } from '@/lib/utils'
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
}[] = [
  { key: 'hot', icon: Flame, countKey: 'hotCount' },
  { key: 'warm', icon: Sun, countKey: 'warmCount' },
  { key: 'cold', icon: Snowflake, countKey: 'coldCount' },
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
      {ITEMS.map(({ key, icon: Icon, countKey }) => (
        <Link
          key={key}
          to="/opportunities"
          search={{ temperature: key, view: 'kanban' }}
          className={cn(
            'group flex items-center gap-3 rounded-2xl border p-4 shadow-sm transition-all',
            'hover:shadow-md hover:border-primary/30',
            getTemperatureColor(key),
          )}
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-background/60 ring-1 ring-border/50">
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
