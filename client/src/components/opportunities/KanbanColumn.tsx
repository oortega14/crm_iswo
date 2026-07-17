import { useDroppable } from '@dnd-kit/core'
import { cn, formatCurrency } from '@/lib/utils'
import { formatCompactCurrency, getStageEmoji } from '@/lib/opportunityVisuals'
import { Badge } from '@/components/ui/badge'
import { OpportunityCard } from './OpportunityCard'
import type { Opportunity, PipelineStage } from '@/types'

interface KanbanColumnProps {
  stage: PipelineStage
  opportunities: Opportunity[]
  onSelectOpportunity: (id: string) => void
  canDragOpportunity?: (opportunity: Opportunity) => boolean
  isReadOnlyOpportunity?: (opportunity: Opportunity) => boolean
  isDropTarget?: boolean
  isDragging?: boolean
}

export function KanbanColumn({
  stage,
  opportunities,
  onSelectOpportunity,
  canDragOpportunity,
  isReadOnlyOpportunity,
  isDropTarget = false,
  isDragging = false,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: stage.id,
  })

  const highlight = isOver || isDropTarget

  const stageEmoji = getStageEmoji(stage.name)
  const totalValue = opportunities.reduce(
    (sum, o) => sum + (Number.isFinite(o.estimated_value) ? o.estimated_value : 0),
    0,
  )
  const currency = opportunities[0]?.currency ?? 'COP'

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex flex-1 min-w-[160px] flex-col rounded-lg bg-muted/50 transition-colors duration-150',
        highlight && 'bg-primary/5 ring-2 ring-primary/40 shadow-sm',
        isDragging && !highlight && 'ring-1 ring-border/40',
      )}
    >
      <div
        className={cn(
          'space-y-1.5 border-b border-border/50 px-2 py-2 transition-colors',
          highlight && 'bg-primary/5',
        )}
      >
        <div className="flex items-start justify-between gap-1.5">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1 min-w-0" title={stage.name}>
              <span className="text-sm leading-none" aria-hidden>
                {stageEmoji}
              </span>
              {stage.color && (
                <div
                  className="size-2 rounded-full shrink-0"
                  style={{ backgroundColor: stage.color }}
                />
              )}
              <span className="truncate text-[11px] font-medium text-muted-foreground">
                {stage.name}
              </span>
            </div>
            <p className="mt-0.5 text-[10px] tabular-nums text-foreground">
              <span className="font-semibold">{opportunities.length}</span>
              <span className="text-muted-foreground">
                {' '}
                {opportunities.length === 1 ? 'oportunidad' : 'oportunidades'}
              </span>
              {totalValue > 0 && (
                <span className="text-muted-foreground">
                  {' '}
                  · {formatCompactCurrency(totalValue, currency)}
                  <span className="hidden sm:inline">
                    {' '}
                    ({formatCurrency(totalValue, currency)})
                  </span>
                </span>
              )}
            </p>
          </div>
          <Badge variant="secondary" className="shrink-0 px-1.5 py-0 font-mono text-xs">
            {opportunities.length}
          </Badge>
        </div>
        {highlight && (
          <p className="text-[10px] font-medium text-primary animate-in fade-in duration-150">
            Soltar aquí
          </p>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-1.5 min-h-[200px]">
        <div className="flex flex-col gap-1.5">
          {opportunities.map((opportunity) => {
            const dragDisabled = canDragOpportunity
              ? !canDragOpportunity(opportunity)
              : false
            const readOnly = isReadOnlyOpportunity?.(opportunity) ?? false
            return (
              <OpportunityCard
                key={opportunity.id}
                opportunity={opportunity}
                dragDisabled={dragDisabled}
                readOnly={readOnly}
                onClick={() => onSelectOpportunity(opportunity.id)}
              />
            )
          })}

          {opportunities.length === 0 && (
            <div
              className={cn(
                'flex items-center justify-center h-24 rounded-md border border-dashed border-border/60 text-xs text-muted-foreground transition-colors',
                highlight && 'border-primary/50 bg-primary/5 text-primary font-medium',
              )}
            >
              {highlight ? 'Soltar aquí' : 'Sin oportunidades'}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
