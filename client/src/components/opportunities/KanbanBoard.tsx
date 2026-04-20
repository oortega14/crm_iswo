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
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useState } from 'react'
import api from '@/lib/api'
import { queryKeys } from '@/lib/queryClient'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { KanbanColumn } from './KanbanColumn'
import { OpportunityCard } from './OpportunityCard'
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
  const [activeId, setActiveId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor)
  )

  // Group opportunities by stage
  const opportunitiesByStage = useMemo(() => {
    const grouped: Record<string, Opportunity[]> = {}
    
    // Initialize all stages with empty arrays
    pipeline?.stages?.forEach((stage) => {
      grouped[stage.id] = []
    })
    
    // Group opportunities
    opportunities.forEach((opp) => {
      if (grouped[opp.stage_id]) {
        grouped[opp.stage_id].push(opp)
      }
    })
    
    return grouped
  }, [opportunities, pipeline?.stages])

  // Update stage mutation with optimistic updates
  const updateStageMutation = useMutation({
    mutationFn: async ({ id, stage_id }: { id: string; stage_id: string }) => {
      const response = await api.patch(`/opportunities/${id}`, {
        data: { stage_id },
      })
      return response.data.data
    },
    onMutate: async ({ id, stage_id }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.opportunities.all })
      
      // Snapshot previous value
      const previousOpportunities = queryClient.getQueryData(
        queryKeys.opportunities.list({})
      )
      
      // Optimistically update
      queryClient.setQueryData(
        queryKeys.opportunities.list({}),
        (old: Opportunity[] | undefined) =>
          old?.map((opp) =>
            opp.id === id ? { ...opp, stage_id } : opp
          )
      )
      
      return { previousOpportunities }
    },
    onError: (_err, _vars, context) => {
      // Rollback on error
      if (context?.previousOpportunities) {
        queryClient.setQueryData(
          queryKeys.opportunities.list({}),
          context.previousOpportunities
        )
      }
      toast.error('Error al mover la oportunidad')
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.opportunities.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.pipeline })
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
    if (!activeOpp) return

    // Check if dropped on a column
    const targetStage = pipeline?.stages?.find((s) => s.id === over.id)
    if (targetStage && activeOpp.stage_id !== targetStage.id) {
      updateStageMutation.mutate({
        id: activeOpp.id,
        stage_id: targetStage.id,
      })
    }
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
      <ScrollArea className="h-full">
        <div className="flex gap-4 p-4 lg:p-6 min-h-full">
          {pipeline.stages.map((stage) => (
            <KanbanColumn
              key={stage.id}
              stage={stage}
              opportunities={opportunitiesByStage[stage.id] || []}
              onSelectOpportunity={onSelectOpportunity}
            />
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

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
