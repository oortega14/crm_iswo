import { useDroppable } from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
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
        'flex w-72 shrink-0 flex-col rounded-lg bg-muted/50 transition-colors',
        isOver && 'bg-muted ring-2 ring-primary/20'
      )}
    >
      {/* Column header */}
      <div className="flex items-center justify-between gap-2 px-3 py-2.5 border-b border-border/50">
        <div className="flex items-center gap-2 min-w-0">
          {stage.color && (
            <div
              className="size-2.5 rounded-full shrink-0"
              style={{ backgroundColor: stage.color }}
            />
          )}
          <span className="font-medium text-sm truncate">{stage.name}</span>
        </div>
        <Badge variant="secondary" className="text-xs font-mono shrink-0">
          {opportunities.length}
        </Badge>
      </div>

      {/* Cards */}
      <ScrollArea className="flex-1 p-2">
        <SortableContext
          items={opportunityIds}
          strategy={verticalListSortingStrategy}
        >
          <div className="flex flex-col gap-2 min-h-[200px]">
            {opportunities.map((opportunity) => (
              <OpportunityCard
                key={opportunity.id}
                opportunity={opportunity}
                onClick={() => onSelectOpportunity(opportunity.id)}
              />
            ))}

            {opportunities.length === 0 && (
              <div className="flex items-center justify-center h-24 text-sm text-muted-foreground">
                Sin oportunidades
              </div>
            )}
          </div>
        </SortableContext>
      </ScrollArea>
    </div>
  )
}
