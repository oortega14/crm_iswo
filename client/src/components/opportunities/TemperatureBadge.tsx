import { cn, getTemperatureColor, getTemperatureIcon, formatTemperatureLabel } from '@/lib/utils'
import type { TemperatureLevel } from '@/lib/utils'

interface TemperatureBadgeProps {
  temperature: TemperatureLevel
  className?: string
  showLabel?: boolean
}

export function TemperatureBadge({ temperature, className, showLabel = true }: TemperatureBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium',
        getTemperatureColor(temperature),
        className,
      )}
    >
      <span aria-hidden="true">{getTemperatureIcon(temperature)}</span>
      {showLabel && formatTemperatureLabel(temperature)}
    </span>
  )
}
