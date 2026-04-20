import { useState } from 'react'
import { cn } from '@/lib/utils'

interface BantSlidersProps {
  budget: number
  authority: number
  need: number
  timeline: number
  onUpdate: (field: string, value: number) => void
  disabled?: boolean
}

const sliders = [
  { key: 'bant_budget', label: 'Budget', color: 'bg-blue-500' },
  { key: 'bant_authority', label: 'Authority', color: 'bg-purple-500' },
  { key: 'bant_need', label: 'Need', color: 'bg-green-500' },
  { key: 'bant_timeline', label: 'Timeline', color: 'bg-orange-500' },
]

export function BantSliders({
  budget,
  authority,
  need,
  timeline,
  onUpdate,
  disabled = false,
}: BantSlidersProps) {
  const values = {
    bant_budget: budget,
    bant_authority: authority,
    bant_need: need,
    bant_timeline: timeline,
  }

  const [localValues, setLocalValues] = useState(values)

  const handleChange = (key: string, value: number) => {
    setLocalValues((prev) => ({ ...prev, [key]: value }))
  }

  const handleChangeEnd = (key: string) => {
    const value = localValues[key as keyof typeof localValues]
    if (value !== values[key as keyof typeof values]) {
      onUpdate(key, value)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {sliders.map((slider) => {
        const value = localValues[slider.key as keyof typeof localValues]
        return (
          <div key={slider.key} className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">{slider.label}</label>
              <span className="text-sm font-mono text-muted-foreground">
                {value}/25
              </span>
            </div>
            <div className="relative">
              <div className="h-2 rounded-full bg-muted">
                <div
                  className={cn('h-full rounded-full transition-all', slider.color)}
                  style={{ width: `${(value / 25) * 100}%` }}
                />
              </div>
              <input
                type="range"
                min="0"
                max="25"
                step="1"
                value={value}
                onChange={(e) => handleChange(slider.key, parseInt(e.target.value))}
                onMouseUp={() => handleChangeEnd(slider.key)}
                onTouchEnd={() => handleChangeEnd(slider.key)}
                disabled={disabled}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
