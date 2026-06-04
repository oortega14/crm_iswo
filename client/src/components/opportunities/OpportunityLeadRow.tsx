import { cn } from '@/lib/utils'
import {
  formatStageTimePain,
  getPropertyLabel,
  getStageEmoji,
} from '@/lib/opportunityVisuals'

export type OpportunityLeadRowProps = {
  contactName: string
  stageName?: string | null
  stageReferenceAt?: string | null
  customFields?: Record<string, unknown>
  propertyTitle?: string | null
  /** sm = tarjeta kanban; md = lista briefing */
  size?: 'sm' | 'md'
  className?: string
}

export function OpportunityLeadRow({
  contactName,
  stageName,
  stageReferenceAt,
  customFields,
  propertyTitle,
  size = 'sm',
  className,
}: OpportunityLeadRowProps) {
  const propertyLabel = getPropertyLabel(customFields, propertyTitle)
  const stageEmoji = getStageEmoji(stageName)
  const stageTime = formatStageTimePain(stageReferenceAt)
  const nameClass = size === 'md' ? 'text-sm' : 'text-xs'

  return (
    <div className={cn('min-w-0 space-y-0.5', className)}>
      <p className={cn('font-medium truncate leading-tight', nameClass)}>{contactName}</p>

      {propertyLabel && propertyLabel !== contactName && (
        <p className="truncate text-[10px] text-muted-foreground">{propertyLabel}</p>
      )}

      {stageName && (
        <p
          className={cn(
            'flex items-center gap-1 text-[10px] tabular-nums',
            stageTime.urgent ? 'font-semibold text-amber-600 dark:text-amber-400' : 'text-muted-foreground',
          )}
          title={stageName}
        >
          <span aria-hidden>{stageEmoji}</span>
          <span className={cn(stageTime.urgent && 'animate-pulse')}>{stageTime.label}</span>
        </p>
      )}
    </div>
  )
}
