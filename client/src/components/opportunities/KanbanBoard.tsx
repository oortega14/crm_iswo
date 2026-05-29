import { useMemo } from 'react'
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useState } from 'react'
import { queryKeys } from '@/lib/queryClient'
import { moveOpportunityStage } from '@/lib/opportunityApi'
import { KanbanColumn } from './KanbanColumn'
import { OpportunityCard } from './OpportunityCard'
import type { Opportunity, Pipeline } from '@/types'

interface KanbanBoardProps {
  opportunities: Opportunity[]
  pipeline?: Pipeline
  onSelectOpportunity: (id: string) => void
}

export function KanbanBoard({
  opportunities,
  pipeline,
  onSelectOpportunity,
}: KanbanBoardProps) {
  const queryClient = useQueryClient()
  const [activeId, setActiveId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor)
  )

  const firstStageId = pipeline?.stages?.[0]?.id

  // Group opportunities by stage (si la etapa no coincide con el embudo, cae en la 1.ª columna)
  const opportunitiesByStage = useMemo(() => {
    const grouped: Record<string, Opportunity[]> = {}
    pipeline?.stages?.forEach((stage) => {
      grouped[stage.id] = []
    })
    if (!pipeline?.stages?.length) return grouped

    opportunities.forEach((opp) => {
      const sid = opp.stage_id
      if (sid && grouped[sid]) {
        grouped[sid].push(opp)
      } else if (firstStageId && grouped[firstStageId]) {
        grouped[firstStageId].push(opp)
      }
    })
    return grouped
  }, [opportunities, pipeline?.stages, firstStageId])

  // Usa move_stage para que el backend actualice status (won/lost) y registre el log
  const updateStageMutation = useMutation({
    mutationFn: async ({ id, stage_id }: { id: string; stage_id: string }) => {
      await moveOpportunityStage(id, stage_id)
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: queryKeys.opportunities.all })
    },
    onError: () => {
      toast.error('Error al mover la oportunidad')
      queryClient.invalidateQueries({ queryKey: queryKeys.opportunities.all })
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.opportunities.all })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)

    if (!over) return

    const activeOpp = opportunities.find((o) => o.id === active.id)
    if (!activeOpp || !pipeline?.stages?.length) return

    const overId = String(over.id)
    const stageHit = pipeline.stages.find((s) => s.id === overId)
    const overCard = opportunities.find((o) => o.id === overId)
    const targetStageId = stageHit?.id ?? overCard?.stage_id
    if (!targetStageId || targetStageId === activeOpp.stage_id) return

    updateStageMutation.mutate({ id: activeOpp.id, stage_id: targetStageId })
  }

  const activeOpportunity = activeId
    ? opportunities.find((o) => o.id === activeId)
    : null

  if (!pipeline?.stages?.length) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <p className="text-muted-foreground">No hay etapas configuradas en el pipeline</p>
      </div>
    )
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      {/* Scrollable sólo si hay overflow; columnas se reparten el espacio disponible */}
      <div className="h-full w-full overflow-x-auto">
        <div className="flex gap-2 p-2 h-full min-w-full">
          {pipeline.stages.map((stage) => (
            <KanbanColumn
              key={stage.id}
              stage={stage}
              opportunities={opportunitiesByStage[stage.id] || []}
              onSelectOpportunity={onSelectOpportunity}
            />
          ))}
        </div>
      </div>

      <DragOverlay>
        {activeOpportunity && (
          <OpportunityCard
            opportunity={activeOpportunity}
            onClick={() => {}}
            isDragging
          />
        )}
      </DragOverlay>
    </DndContext>
  )
}
