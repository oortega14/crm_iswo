import { useDroppable } from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { OpportunityCard } from './OpportunityCard'
import type { Opportunity, PipelineStage } from '@/types'

interface KanbanColumnProps {
  stage: PipelineStage
  opportunities: Opportunity[]
  onSelectOpportunity: (id: string) => void
}

export function KanbanColumn({
  stage,
  opportunities,
  onSelectOpportunity,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: stage.id,
  })

  const opportunityIds = opportunities.map((o) => o.id)

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex flex-1 min-w-[140px] flex-col rounded-lg bg-muted/50 transition-colors',
        isOver && 'bg-muted ring-2 ring-primary/20'
      )}
    >
      {/* Column header */}
      <div className="flex items-center justify-between gap-1.5 px-2 py-2 border-b border-border/50">
        <div className="flex items-center gap-1.5 min-w-0">
          {stage.color && (
            <div
              className="size-2 rounded-full shrink-0"
              style={{ backgroundColor: stage.color }}
            />
          )}
          <span className="font-medium text-xs truncate">{stage.name}</span>
        </div>
        <Badge variant="secondary" className="text-xs font-mono shrink-0 px-1.5 py-0">
          {opportunities.length}
        </Badge>
      </div>

      {/* Cards — div nativo para no bloquear los eventos de puntero de dnd-kit */}
      <div className="flex-1 overflow-y-auto p-1.5">
        <SortableContext
          items={opportunityIds}
          strategy={verticalListSortingStrategy}
        >
          <div className="flex flex-col gap-1.5 min-h-[200px]">
            {opportunities.map((opportunity) => (
              <OpportunityCard
                key={opportunity.id}
                opportunity={opportunity}
                onClick={() => onSelectOpportunity(opportunity.id)}
              />
            ))}

            {opportunities.length === 0 && (
              <div className="flex items-center justify-center h-16 text-xs text-muted-foreground">
                Sin oportunidades
              </div>
            )}
          </div>
        </SortableContext>
      </div>
    </div>
  )
}
