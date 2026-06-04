import { useCallback, useMemo } from 'react'
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  pointerWithin,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useState } from 'react'
import {
  invalidateContactSegmentMetrics,
  invalidateNotificationsQueries,
  queryKeys,
} from '@/lib/queryClient'
import { moveOpportunityStage } from '@/lib/opportunityApi'
import { KanbanColumn } from './KanbanColumn'
import { OpportunityCard } from './OpportunityCard'
import { useUser, useUserRole } from '@/stores/auth'
import type { Opportunity, Pipeline, PipelineStage } from '@/types'

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
  const currentUser = useUser()
  const role = useUserRole()
  const [activeId, setActiveId] = useState<string | null>(null)

  const canDragOpportunity = useCallback(
    (opp: Opportunity) => {
      if (role === 'viewer') return false
      if (role === 'admin' || role === 'manager') return true
      return String(opp.owner_id) === String(currentUser?.id ?? '')
    },
    [role, currentUser?.id],
  )

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 180, tolerance: 6 },
    }),
    useSensor(KeyboardSensor),
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
  const patchOpportunityStage = (
    opp: Opportunity,
    stageId: string,
    stages: PipelineStage[] | undefined,
  ): Opportunity => {
    const stage = stages?.find((s) => s.id === stageId)
    return {
      ...opp,
      stage_id: stageId,
      stage: stage
        ? {
            id: stage.id,
            pipeline_id: stage.pipeline_id,
            name: stage.name,
            position: stage.position,
            probability: stage.probability,
            is_closed_won: stage.is_closed_won,
            is_closed_lost: stage.is_closed_lost,
            color: stage.color,
          }
        : opp.stage,
    }
  }

  const updateStageMutation = useMutation({
    mutationFn: async ({ id, stage_id }: { id: string; stage_id: string }) => {
      await moveOpportunityStage(id, stage_id)
    },
    onMutate: async ({ id, stage_id }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.opportunities.all })
      const snapshots = queryClient.getQueriesData<Opportunity[]>({
        queryKey: queryKeys.opportunities.all,
      })
      queryClient.setQueriesData<Opportunity[]>(
        {
          queryKey: queryKeys.opportunities.all,
          predicate: (q) => q.queryKey[1] === 'list',
        },
        (old) =>
          old?.map((o) =>
            o.id === id ? patchOpportunityStage(o, stage_id, pipeline?.stages) : o,
          ),
      )
      return { snapshots }
    },
    onError: (_err, _vars, context) => {
      context?.snapshots.forEach(([key, data]) => {
        queryClient.setQueryData(key, data)
      })
      toast.error('Error al mover la oportunidad')
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.opportunities.all })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      void invalidateContactSegmentMetrics(queryClient)
      void invalidateNotificationsQueries(queryClient)
    },
  })

  const handleMoveStage = useCallback(
    (opportunityId: string, stageId: string) => {
      const opp = opportunities.find((o) => o.id === opportunityId)
      if (!opp || !canDragOpportunity(opp)) return
      if (stageId === opp.stage_id) return
      updateStageMutation.mutate({ id: opportunityId, stage_id: stageId })
    },
    [opportunities, canDragOpportunity, updateStageMutation],
  )

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)

    if (!over) return

    const activeOpp = opportunities.find((o) => o.id === active.id)
    if (!activeOpp || !pipeline?.stages?.length) return
    if (!canDragOpportunity(activeOpp)) return

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
      collisionDetection={pointerWithin}
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
              canDragOpportunity={canDragOpportunity}
              stages={pipeline.stages}
              onMoveStage={handleMoveStage}
              moveStagePending={updateStageMutation.isPending}
            />
          ))}
        </div>
      </div>

      <DragOverlay>
        {activeOpportunity && (
          <OpportunityCard
            opportunity={activeOpportunity}
            dragDisabled={!canDragOpportunity(activeOpportunity)}
            onClick={() => {}}
            isDragging
          />
        )}
      </DragOverlay>
    </DndContext>
  )
}
