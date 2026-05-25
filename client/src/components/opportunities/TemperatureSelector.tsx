import { cn, getTemperatureColor, getTemperatureIcon, formatTemperatureLabel } from '@/lib/utils'
import type { TemperatureLevel } from '@/lib/utils'

const TEMPERATURES: TemperatureLevel[] = ['cold', 'warm', 'hot']

interface TemperatureSelectorProps {
  value: TemperatureLevel
  onChange: (value: TemperatureLevel) => void
  disabled?: boolean
}

export function TemperatureSelector({ value, onChange, disabled }: TemperatureSelectorProps) {
  return (
    <div className="flex gap-1.5">
      {TEMPERATURES.map((temp) => (
        <button
          key={temp}
          type="button"
          disabled={disabled}
          onClick={() => onChange(temp)}
          className={cn(
            'flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-all',
            value === temp
              ? getTemperatureColor(temp) + ' ring-1 ring-offset-1 ring-current'
              : 'border-border text-muted-foreground hover:border-muted-foreground/50',
            disabled && 'pointer-events-none opacity-50',
          )}
        >
          <span>{getTemperatureIcon(temp)}</span>
          {formatTemperatureLabel(temp)}
        </button>
      ))}
    </div>
  )
}
