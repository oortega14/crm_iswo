import { useCallback, useMemo, useState } from 'react'
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  defaultDropAnimationSideEffects,
  useSensor,
  useSensors,
  type DragCancelEvent,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type DropAnimation,
} from '@dnd-kit/core'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  invalidateContactSegmentMetrics,
  invalidateNotificationsQueries,
  queryKeys,
} from '@/lib/queryClient'
import { moveOpportunityStage } from '@/lib/opportunityApi'
import { KanbanColumn } from './KanbanColumn'
import { OpportunityCard } from './OpportunityCard'
import { kanbanCollisionDetection } from './kanbanCollision'
import { useUser, useUserRole } from '@/stores/auth'
import type { Opportunity, Pipeline, PipelineStage } from '@/types'

interface KanbanBoardProps {
  opportunities: Opportunity[]
  pipeline?: Pipeline
  onSelectOpportunity: (id: string) => void
}

const dropAnimation: DropAnimation = {
  sideEffects: defaultDropAnimationSideEffects({
    styles: {
      active: {
        opacity: '0.4',
      },
    },
  }),
}

function resolveTargetStageId(
  overId: string,
  stages: PipelineStage[],
  opportunities: Opportunity[],
): string | null {
  const stageHit = stages.find((s) => s.id === overId)
  if (stageHit) return stageHit.id
  const overCard = opportunities.find((o) => o.id === overId)
  return overCard?.stage_id ?? null
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
  const [overStageId, setOverStageId] = useState<string | null>(null)

  const canDragOpportunity = useCallback(
    (opp: Opportunity) => {
      if (role === 'viewer') return false
      if (opp.network_read_only) return false
      if (role === 'admin' || role === 'manager') return true
      return String(opp.owner_id) === String(currentUser?.id ?? '')
    },
    [role, currentUser?.id],
  )

  const isReadOnlyOpportunity = useCallback(
    (opp: Opportunity) => opp.network_read_only === true,
    [],
  )

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 4 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 120, tolerance: 8 },
    }),
    useSensor(KeyboardSensor),
  )

  const firstStageId = pipeline?.stages?.[0]?.id

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

  const patchOpportunityStage = (
    opp: Opportunity,
    stageId: string,
    stages: PipelineStage[] | undefined,
  ): Opportunity => {
    const stage = stages?.find((s) => s.id === stageId)
    let status = opp.status
    if (stage?.is_closed_won) status = 'won'
    else if (stage?.is_closed_lost) status = 'lost'

    return {
      ...opp,
      stage_id: stageId,
      status,
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
    onSuccess: (_data, { stage_id }) => {
      const stageName =
        pipeline?.stages?.find((s) => s.id === stage_id)?.name ?? 'nueva etapa'
      toast.success(`Movida a ${stageName}`)
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      void invalidateContactSegmentMetrics(queryClient)
      void invalidateNotificationsQueries(queryClient)
    },
    onError: (_err, _vars, context) => {
      context?.snapshots.forEach(([key, data]) => {
        queryClient.setQueryData(key, data)
      })
      toast.error('Error al mover la oportunidad')
      queryClient.invalidateQueries({ queryKey: queryKeys.opportunities.all })
    },
  })

  const clearDragState = () => {
    setActiveId(null)
    setOverStageId(null)
  }

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
    setOverStageId(null)
  }

  const handleDragOver = (event: DragOverEvent) => {
    const { over } = event
    if (!over || !pipeline?.stages?.length) {
      setOverStageId(null)
      return
    }
    setOverStageId(resolveTargetStageId(String(over.id), pipeline.stages, opportunities))
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    const targetStageId = over
      ? resolveTargetStageId(String(over.id), pipeline?.stages ?? [], opportunities)
      : null

    clearDragState()

    if (!over || !targetStageId) return

    const activeOpp = opportunities.find((o) => o.id === active.id)
    if (!activeOpp || !pipeline?.stages?.length) return
    if (!canDragOpportunity(activeOpp)) return
    if (targetStageId === activeOpp.stage_id) return

    updateStageMutation.mutate({ id: activeOpp.id, stage_id: targetStageId })
  }

  const handleDragCancel = (_event: DragCancelEvent) => {
    clearDragState()
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
      collisionDetection={kanbanCollisionDetection}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="h-full w-full overflow-x-auto">
        <div className="flex gap-2 p-2 h-full min-w-full">
          {pipeline.stages.map((stage) => (
            <KanbanColumn
              key={stage.id}
              stage={stage}
              opportunities={opportunitiesByStage[stage.id] || []}
              onSelectOpportunity={onSelectOpportunity}
              canDragOpportunity={canDragOpportunity}
              isReadOnlyOpportunity={isReadOnlyOpportunity}
              isDropTarget={overStageId === stage.id}
              isDragging={Boolean(activeId)}
            />
          ))}
        </div>
      </div>

      <DragOverlay dropAnimation={dropAnimation}>
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
