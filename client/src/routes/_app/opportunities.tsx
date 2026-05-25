import { createFileRoute, useSearch } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { LayoutGrid, Table as TableIcon, Plus, Search, Flame, Sun, Snowflake } from 'lucide-react'
import { z } from 'zod'
import api from '@/lib/api'
import { queryKeys } from '@/lib/queryClient'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { KanbanBoard } from '@/components/opportunities/KanbanBoard'
import { OpportunitiesTable } from '@/components/opportunities/OpportunitiesTable'
import { OpportunitySlideOver } from '@/components/opportunities/OpportunitySlideOver'
import { QuickAddOpportunity } from '@/components/opportunities/QuickAddOpportunity'
import { AppPageShell } from '@/components/layout/AppPageShell'
import { PageHeader } from '@/components/layout/PageHeader'
import { Skeleton } from '@/components/ui/skeleton'
import {
  jsonApiIncluded,
  jsonApiPrimaryList,
  mapOpportunityResource,
  mapPipelineResource,
} from '@/lib/opportunityApi'

const opportunitiesSearchSchema = z.object({
  view: z.enum(['kanban', 'table']).optional().default('kanban'),
  pipeline: z.string().optional(),
  stage: z.string().optional(),
  selected: z.string().optional(),
  contact: z.string().optional(),
  temperature: z.enum(['cold', 'warm', 'hot']).optional(),
})

export const Route = createFileRoute('/_app/opportunities')({
  validateSearch: opportunitiesSearchSchema,
  component: OpportunitiesPage,
})

function OpportunitiesPage() {
  const search = useSearch({ from: '/_app/opportunities' })
  const navigate = Route.useNavigate()
  const [quickAddOpen, setQuickAddOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  const view = search.view || 'kanban'
  const selectedId = search.selected

  const { data: pipelines, isLoading: pipelinesLoading } = useQuery({
    queryKey: queryKeys.pipelines.all,
    queryFn: async () => {
      const response = await api.get('/pipelines')
      const rows = jsonApiPrimaryList(response.data)
      return rows.filter((r) => r.id).map(mapPipelineResource)
    },
  })

  const defaultPipeline = pipelines?.find((p) => p.is_default) || pipelines?.[0]

  // Usa el pipeline del search param, o cae al por defecto
  const activePipelineId = search.pipeline || defaultPipeline?.id
  const activePipeline = pipelines?.find((p) => p.id === activePipelineId) || defaultPipeline

  const { data: opportunities, isLoading: opportunitiesLoading } = useQuery({
    queryKey: queryKeys.opportunities.list({
      pipeline_id: search.contact ? undefined : activePipelineId,
      stage: search.stage,
      contact_id: search.contact,
    }),
    queryFn: async () => {
      const params = new URLSearchParams()
      if (search.contact) {
        params.append('contact_id', search.contact)
      } else {
        if (activePipelineId) params.append('pipeline_id', activePipelineId)
        if (search.stage) params.append('stage_id', search.stage)
      }
      const response = await api.get(`/opportunities?${params.toString()}`)
      const rows = jsonApiPrimaryList(response.data)
      const included = jsonApiIncluded(response.data)
      return rows
        .filter((r) => r.id)
        .map((r) => mapOpportunityResource(r, included))
        .filter((o) => o.id.length > 0)
    },
    enabled: !pipelinesLoading && (!!activePipelineId || !!search.contact),
    refetchInterval: 15000,
  })

  const filteredOpportunities = useMemo(() => {
    let all = opportunities ?? []
    if (search.temperature) {
      all = all.filter((o) => o.temperature === search.temperature)
    }
    if (!searchTerm.trim()) return all
    const q = searchTerm.trim().toLowerCase()
    return all.filter(
      (o) =>
        o.contact_name?.toLowerCase().includes(q) ||
        o.company_name?.toLowerCase().includes(q) ||
        o.contact_email?.toLowerCase().includes(q) ||
        o.contact_phone?.includes(q)
    )
  }, [opportunities, searchTerm, search.temperature])

  const selectedOpportunity = opportunities?.find((o) => o.id === selectedId)

  const handleViewChange = (newView: string) => {
    navigate({ search: (prev) => ({ ...prev, view: newView as 'kanban' | 'table' }) })
  }

  const handlePipelineChange = (pipelineId: string) => {
    navigate({ search: (prev) => ({ ...prev, pipeline: pipelineId, stage: undefined }) })
  }

  const handleSelectOpportunity = (id: string | null) => {
    navigate({ search: (prev) => ({ ...prev, selected: id || undefined }) })
  }

  const isLoading = pipelinesLoading || (!!activePipelineId && opportunitiesLoading)

  const oppCount = opportunities?.length ?? 0
  const subtitle =
    oppCount === 1 ? '1 oportunidad' : `${oppCount} oportunidades`

  return (
    <AppPageShell
      className="h-full min-h-0"
      contentClassName="flex h-full min-h-0 flex-col gap-6 p-4 lg:p-6"
    >
      <PageHeader
        title="Oportunidades"
        description={subtitle}
      >
        {/* Buscador por nombre de contacto */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Buscar contacto..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-8 pl-8 w-[180px] text-sm"
          />
        </div>

        {/* Filtro de temperatura */}
        <div className="flex items-center gap-1">
          {(
            [
              { value: 'hot',  icon: Flame,     cls: 'text-red-600 hover:bg-red-50 data-[active=true]:bg-red-100 data-[active=true]:text-red-700' },
              { value: 'warm', icon: Sun,       cls: 'text-amber-600 hover:bg-amber-50 data-[active=true]:bg-amber-100 data-[active=true]:text-amber-700' },
              { value: 'cold', icon: Snowflake, cls: 'text-sky-600 hover:bg-sky-50 data-[active=true]:bg-sky-100 data-[active=true]:text-sky-700' },
            ] as const
          ).map(({ value, icon: Icon, cls }) => (
            <button
              key={value}
              data-active={search.temperature === value}
              onClick={() =>
                navigate({
                  search: (prev) => ({
                    ...prev,
                    temperature: prev.temperature === value ? undefined : value,
                  }),
                })
              }
              className={`h-8 w-8 flex items-center justify-center rounded-md border border-transparent transition-colors ${cls}`}
              title={value === 'hot' ? 'Caliente' : value === 'warm' ? 'Tibio' : 'Frío'}
            >
              <Icon className="size-4" />
            </button>
          ))}
        </div>

        {/* Selector de pipeline */}
        {pipelines && pipelines.length > 1 && (
          <Select
            value={activePipelineId}
            onValueChange={handlePipelineChange}
            disabled={pipelinesLoading}
          >
            <SelectTrigger className="h-8 w-[180px] text-sm">
              <SelectValue placeholder="Selecciona pipeline" />
            </SelectTrigger>
            <SelectContent>
              {pipelines.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                  {p.is_default ? ' ★' : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

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
        ) : !activePipeline ? (
          <div className="flex h-full items-center justify-center p-8 text-sm text-muted-foreground">
            {pipelines && pipelines.length === 0
              ? 'No hay embudos. Crea un pipeline y etapas en Ajustes → Pipelines.'
              : 'No se pudo determinar el embudo activo.'}
          </div>
        ) : view === 'kanban' ? (
          <div className="flex min-h-[280px] flex-1 flex-col">
            <KanbanBoard
              opportunities={filteredOpportunities}
              pipeline={activePipeline}
              onSelectOpportunity={handleSelectOpportunity}
            />
          </div>
        ) : (
          <div className="min-h-0 flex-1 overflow-auto p-4 lg:p-6">
            <OpportunitiesTable
              opportunities={filteredOpportunities}
              onSelectOpportunity={handleSelectOpportunity}
            />
          </div>
        )}
      </div>

      <OpportunitySlideOver
        opportunity={selectedOpportunity}
        open={!!selectedId}
        onOpenChange={(open) => {
          if (!open) handleSelectOpportunity(null)
        }}
      />

      <QuickAddOpportunity open={quickAddOpen} onOpenChange={setQuickAddOpen} />
    </AppPageShell>
  )
}
