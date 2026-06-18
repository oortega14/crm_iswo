import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { Bell, Clock, GripVertical } from 'lucide-react'
import { OpportunityLeadRow } from '@/components/opportunities/OpportunityLeadRow'
import { cn, formatCurrency, formatRelativeTime, getBantScoreColor } from '@/lib/utils'
import { TemperatureBadge } from './TemperatureBadge'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useTenant } from '@/stores/auth'
import type { Opportunity } from '@/types'

interface OpportunityCardProps {
  opportunity: Opportunity
  onClick: () => void
  isDragging?: boolean
  dragDisabled?: boolean
  readOnly?: boolean
}

export function OpportunityCard({
  opportunity,
  onClick,
  isDragging = false,
  dragDisabled = false,
  readOnly = false,
}: OpportunityCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging: isDraggableActive,
  } = useDraggable({
    id: opportunity.id,
    disabled: dragDisabled || isDragging,
  })

  const style = transform
    ? { transform: CSS.Translate.toString(transform) }
    : undefined

  const tenant = useTenant()

  const hasReminder =
    opportunity.reminder_due_at &&
    new Date(opportunity.reminder_due_at) <= new Date(Date.now() + 24 * 60 * 60 * 1000)

  const staleDays = tenant?.settings?.stale_days ?? 7
  const isStale =
    opportunity.last_activity_at != null &&
    new Date(opportunity.last_activity_at) <
      new Date(Date.now() - staleDays * 24 * 60 * 60 * 1000)

  const showDragHandle = !dragDisabled && !isDragging

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={cn(
        'p-2 hover:shadow-md transition-shadow select-none cursor-pointer',
        (isDragging || isDraggableActive) && 'opacity-40 shadow-lg',
        opportunity.status === 'lost' && 'opacity-50 grayscale-[40%] border-destructive/30',
        opportunity.status === 'won' && 'border-green-500/40 bg-green-50/30 dark:bg-green-950/20',
        opportunity.from_network && 'border-indigo-500/35 ring-1 ring-indigo-500/20',
        readOnly && 'opacity-95',
        isDragging && 'rotate-1 scale-[1.02] shadow-xl ring-2 ring-primary/30',
      )}
      onClick={onClick}
    >
      <div className="flex gap-1.5 min-w-0">
        {showDragHandle && (
          <button
            type="button"
            data-no-drag
            className={cn(
              'mt-0.5 shrink-0 rounded p-0.5 text-muted-foreground/50',
              'cursor-grab touch-none active:cursor-grabbing',
              'hover:bg-muted hover:text-muted-foreground',
              'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
            )}
            aria-label="Arrastrar oportunidad"
            onClick={(e) => e.stopPropagation()}
            {...attributes}
            {...listeners}
          >
            <GripVertical className="size-3.5" />
          </button>
        )}

        <div className="flex flex-col gap-1 min-w-0 flex-1">
          <div className="flex items-start justify-between gap-1">
            <OpportunityLeadRow
              className="flex-1 min-w-0"
              contactName={opportunity.contact_name}
              stageName={opportunity.stage?.name}
              stageReferenceAt={opportunity.updated_at}
              customFields={opportunity.custom_fields}
              propertyTitle={opportunity.title}
            />
            <div className="flex items-center gap-0.5 shrink-0">
              {hasReminder && (
                <Bell className="size-3 text-amber-500 animate-pulse" />
              )}
            </div>
          </div>

          {opportunity.company_name && (
            <p className="text-[10px] text-muted-foreground truncate">
              {opportunity.company_name}
            </p>
          )}

          <div className="flex items-center justify-between gap-1">
            <span className="text-xs font-mono font-medium">
              {formatCurrency(
                Number.isFinite(Number(opportunity.estimated_value))
                  ? Number(opportunity.estimated_value)
                  : 0,
                opportunity.currency,
              )}
            </span>
            <div className="flex items-center gap-1">
              <TemperatureBadge temperature={opportunity.temperature ?? 'cold'} showLabel={false} />
              <Badge
                className={cn(
                  'text-[10px] font-mono px-1 py-0 h-4',
                  getBantScoreColor(
                    Number.isFinite(Number(opportunity.bant_score))
                      ? Number(opportunity.bant_score)
                      : 0,
                  ),
                )}
              >
                {Number.isFinite(Number(opportunity.bant_score))
                  ? Number(opportunity.bant_score)
                  : 0}
              </Badge>
            </div>
          </div>

          <div className="flex items-center justify-between gap-1">
            {opportunity.owner?.name && (
              <span className="text-[10px] text-muted-foreground truncate max-w-[80px]">
                {opportunity.owner.name.split(' ')[0]}
              </span>
            )}

            {opportunity.last_activity_at && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span
                    className={cn(
                      'flex items-center gap-0.5 text-[10px] shrink-0',
                      isStale ? 'text-amber-500' : 'text-muted-foreground',
                    )}
                  >
                    {isStale && <Clock className="size-2.5 shrink-0" />}
                    {formatRelativeTime(opportunity.last_activity_at)}
                  </span>
                </TooltipTrigger>
                {isStale && (
                  <TooltipContent side="top" className="text-xs">
                    Sin actividad hace más de {staleDays} días
                  </TooltipContent>
                )}
              </Tooltip>
            )}
          </div>
        </div>
      </div>
    </Card>
  )
}
