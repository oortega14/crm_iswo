import { createFileRoute, useSearch } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { LayoutGrid, Table as TableIcon, Plus } from 'lucide-react'
import { z } from 'zod'
import api from '@/lib/api'
import { queryKeys } from '@/lib/queryClient'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { KanbanBoard } from '@/components/opportunities/KanbanBoard'
import { OpportunitiesTable } from '@/components/opportunities/OpportunitiesTable'
import { OpportunitySlideOver } from '@/components/opportunities/OpportunitySlideOver'
import { QuickAddOpportunity } from '@/components/opportunities/QuickAddOpportunity'
import { Skeleton } from '@/components/ui/skeleton'
import type { Opportunity, Pipeline } from '@/types'

const opportunitiesSearchSchema = z.object({
  view: z.enum(['kanban', 'table']).optional().default('kanban'),
  stage: z.string().optional(),
  selected: z.string().optional(),
})

export const Route = createFileRoute('/_app/opportunities')({
  validateSearch: opportunitiesSearchSchema,
  component: OpportunitiesPage,
})

function OpportunitiesPage() {
  const search = useSearch({ from: '/_app/opportunities' })
  const navigate = Route.useNavigate()
  const [quickAddOpen, setQuickAddOpen] = useState(false)

  const view = search.view || 'kanban'
  const selectedId = search.selected

  // Fetch pipelines
  const { data: pipelines, isLoading: pipelinesLoading } = useQuery({
    queryKey: queryKeys.pipelines.all,
    queryFn: async () => {
      const response = await api.get<{ data: Pipeline[] }>('/pipelines')
      return response.data.data
    },
  })

  // Fetch opportunities
  const { data: opportunities, isLoading: opportunitiesLoading } = useQuery({
    queryKey: queryKeys.opportunities.list({ stage: search.stage }),
    queryFn: async () => {
      const params = new URLSearchParams()
      if (search.stage) params.append('stage_id', search.stage)
      const response = await api.get<{ data: Opportunity[] }>(
        `/opportunities?${params.toString()}`
      )
      return response.data.data
    },
  })

  const selectedOpportunity = opportunities?.find((o) => o.id === selectedId)
  const defaultPipeline = pipelines?.find((p) => p.is_default) || pipelines?.[0]

  const handleViewChange = (newView: string) => {
    navigate({ search: (prev) => ({ ...prev, view: newView as 'kanban' | 'table' }) })
  }

  const handleSelectOpportunity = (id: string | null) => {
    navigate({ search: (prev) => ({ ...prev, selected: id || undefined }) })
  }

  const isLoading = pipelinesLoading || opportunitiesLoading

  return (
    <div className="flex h-full flex-col pb-16 lg:pb-0">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 border-b px-4 py-3 lg:px-6">
        <div>
          <h1 className="text-xl font-semibold">Oportunidades</h1>
          <p className="text-sm text-muted-foreground hidden sm:block">
            {opportunities?.length || 0} oportunidades en el pipeline
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View toggle */}
          <Tabs value={view} onValueChange={handleViewChange}>
            <TabsList>
              <TabsTrigger value="kanban" className="gap-1.5">
                <LayoutGrid className="size-4" />
                <span className="hidden sm:inline">Kanban</span>
              </TabsTrigger>
              <TabsTrigger value="table" className="gap-1.5">
                <TableIcon className="size-4" />
                <span className="hidden sm:inline">Tabla</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <Button onClick={() => setQuickAddOpen(true)} className="gap-2">
            <Plus className="size-4" />
            <span className="hidden sm:inline">Nueva</span>
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {isLoading ? (
          <div className="p-4 lg:p-6">
            <div className="flex gap-4 overflow-x-auto pb-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="w-72 shrink-0">
                  <Skeleton className="h-8 w-32 mb-4" />
                  <div className="flex flex-col gap-3">
                    {[1, 2, 3].map((j) => (
                      <Skeleton key={j} className="h-32 w-full rounded-lg" />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : view === 'kanban' ? (
          <KanbanBoard
            opportunities={opportunities || []}
            pipeline={defaultPipeline}
            onSelectOpportunity={handleSelectOpportunity}
          />
        ) : (
          <OpportunitiesTable
            opportunities={opportunities || []}
            onSelectOpportunity={handleSelectOpportunity}
          />
        )}
      </div>

      {/* Opportunity detail slide-over */}
      <OpportunitySlideOver
        opportunity={selectedOpportunity}
        open={!!selectedId}
        onOpenChange={(open) => {
          if (!open) handleSelectOpportunity(null)
        }}
      />

      {/* Quick add */}
      <QuickAddOpportunity open={quickAddOpen} onOpenChange={setQuickAddOpen} />
    </div>
  )
}
