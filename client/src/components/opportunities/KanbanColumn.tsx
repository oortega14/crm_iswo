import { useDroppable } from '@dnd-kit/core'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { OpportunityCard } from './OpportunityCard'
import type { Opportunity, PipelineStage } from '@/types'

interface KanbanColumnProps {
  stage: PipelineStage
  opportunities: Opportunity[]
  onSelectOpportunity: (id: string) => void
  canDragOpportunity?: (opportunity: Opportunity) => boolean
  stages?: PipelineStage[]
  onMoveStage?: (opportunityId: string, stageId: string) => void
  moveStagePending?: boolean
}

export function KanbanColumn({
  stage,
  opportunities,
  onSelectOpportunity,
  canDragOpportunity,
  stages,
  onMoveStage,
  moveStagePending,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: stage.id,
  })

  return (
    <div
      className={cn(
        'flex flex-1 min-w-[160px] flex-col rounded-lg bg-muted/50 transition-colors',
        isOver && 'bg-primary/5 ring-2 ring-primary/30',
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

      {/* Zona de soltar: toda la columna acepta el drop */}
      <div ref={setNodeRef} className="flex-1 overflow-y-auto p-1.5 min-h-[200px]">
        <div className="flex flex-col gap-1.5">
          {opportunities.map((opportunity) => {
            const dragDisabled = canDragOpportunity
              ? !canDragOpportunity(opportunity)
              : false
            return (
              <OpportunityCard
                key={opportunity.id}
                opportunity={opportunity}
                dragDisabled={dragDisabled}
                stages={stages}
                onMoveStage={
                  onMoveStage
                    ? (stageId) => onMoveStage(opportunity.id, stageId)
                    : undefined
                }
                moveStagePending={moveStagePending}
                onClick={() => onSelectOpportunity(opportunity.id)}
              />
            )
          })}

          {opportunities.length === 0 && (
            <div
              className={cn(
                'flex items-center justify-center h-24 rounded-md border border-dashed border-border/60 text-xs text-muted-foreground',
                isOver && 'border-primary/50 bg-primary/5 text-primary',
              )}
            >
              {isOver ? 'Soltar aquí' : 'Sin oportunidades'}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
