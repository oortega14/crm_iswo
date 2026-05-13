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
import { AppPageShell } from '@/components/layout/AppPageShell'
import { PageHeader } from '@/components/layout/PageHeader'
import { Skeleton } from '@/components/ui/skeleton'
import type { Opportunity, Pipeline } from '@/types'
import {
  jsonApiIncluded,
  jsonApiPrimaryList,
  mapOpportunityResource,
  mapPipelineResource,
} from '@/lib/opportunityApi'

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

  // Fetch pipelines (kanban/tablas usan el pipeline por defecto para columnas coherentes)
  const { data: pipelines, isLoading: pipelinesLoading } = useQuery({
    queryKey: queryKeys.pipelines.all,
    queryFn: async () => {
      const response = await api.get('/pipelines')
      const rows = jsonApiPrimaryList(response.data)
      return rows.filter((r) => r.id).map(mapPipelineResource)
    },
  })

  const defaultPipeline = pipelines?.find((p) => p.is_default) || pipelines?.[0]

  // Listado alineado al mismo pipeline que el tablero (evita tarjetas sin columna)
  const { data: opportunities, isLoading: opportunitiesLoading } = useQuery({
    queryKey: queryKeys.opportunities.list({
      stage: search.stage,
    }),
    queryFn: async () => {
      const params = new URLSearchParams()
      if (search.stage) params.append('stage_id', search.stage)
      const response = await api.get(`/opportunities?${params.toString()}`)
      const rows = jsonApiPrimaryList(response.data)
      const included = jsonApiIncluded(response.data)
      return rows
        .filter((r) => r.id)
        .map((r) => mapOpportunityResource(r, included))
        .filter((o) => o.id.length > 0)
    },
    enabled: !pipelinesLoading && !!defaultPipeline?.id,
  })

  const selectedOpportunity = opportunities?.find((o) => o.id === selectedId)

  const handleViewChange = (newView: string) => {
    navigate({ search: (prev) => ({ ...prev, view: newView as 'kanban' | 'table' }) })
  }

  const handleSelectOpportunity = (id: string | null) => {
    navigate({ search: (prev) => ({ ...prev, selected: id || undefined }) })
  }

  const isLoading = pipelinesLoading || (!!defaultPipeline?.id && opportunitiesLoading)

  const oppCount = opportunities?.length ?? 0
  const subtitle =
    oppCount === 1 ? '1 oportunidad en tu tenant' : `${oppCount} oportunidades en tu tenant`

  return (
    <AppPageShell
      className="h-full min-h-0"
      contentClassName="flex h-full min-h-0 flex-col gap-6 p-4 lg:p-6"
    >
      <PageHeader
        title="Oportunidades"
        description={subtitle}
      >
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

        <Button size="sm" className="gap-2 shadow-sm" onClick={() => setQuickAddOpen(true)}>
          <Plus className="size-4" />
          <span className="hidden sm:inline">Nueva</span>
        </Button>
      </PageHeader>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border/50 bg-card/40 shadow-sm dark:bg-card/20">
        {isLoading ? (
          <div className="p-4">
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
        ) : !defaultPipeline ? (
          <div className="flex h-full items-center justify-center p-8 text-sm text-muted-foreground">
            {pipelines && pipelines.length === 0
              ? 'No hay embudos. Crea un pipeline y etapas en Ajustes → Pipelines.'
              : 'No se pudo determinar el embudo por defecto.'}
          </div>
        ) : view === 'kanban' ? (
          <div className="flex min-h-[280px] flex-1 flex-col">
            <KanbanBoard
              opportunities={opportunities || []}
              pipeline={defaultPipeline}
              onSelectOpportunity={handleSelectOpportunity}
            />
          </div>
        ) : (
          <div className="min-h-0 flex-1 overflow-auto p-4 lg:p-6">
            <OpportunitiesTable
              opportunities={opportunities || []}
              onSelectOpportunity={handleSelectOpportunity}
            />
          </div>
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
    </AppPageShell>
  )
}
