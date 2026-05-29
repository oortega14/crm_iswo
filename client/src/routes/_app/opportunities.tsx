import { createFileRoute, useSearch } from '@tanstack/react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import {
  LayoutGrid,
  Table as TableIcon,
  Plus,
  Search,
  Flame,
  Sun,
  Snowflake,
  RefreshCw,
  Clock,
  Filter,
} from 'lucide-react'
import { z } from 'zod'
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
import { OpportunitiesExportMenu } from '@/components/opportunities/OpportunitiesExportMenu'
import { AppPageShell } from '@/components/layout/AppPageShell'
import { PageHeader } from '@/components/layout/PageHeader'
import { Skeleton } from '@/components/ui/skeleton'
import {
  fetchOpportunities,
  jsonApiPrimaryList,
  mapPipelineResource,
  opportunityListErrorMessage,
} from '@/lib/opportunityApi'
import api from '@/lib/api'
import { useAuthStore } from '@/stores/auth'
import { toast } from 'sonner'
import { formatStatusLabel } from '@/lib/utils'
import type { OpportunityStatus } from '@/types'

const opportunitiesSearchSchema = z.object({
  view: z.enum(['kanban', 'table']).optional().default('kanban'),
  pipeline: z.string().optional(),
  stage: z.string().optional(),
  selected: z.string().optional(),
  contact: z.string().optional(),
  temperature: z.enum(['cold', 'warm', 'hot']).optional(),
  owner: z.string().optional(),
  status: z.string().optional(),
  stale: z.coerce.boolean().optional(),
})

const STATUS_OPTIONS: OpportunityStatus[] = [
  'new_lead',
  'contacted',
  'qualified',
  'proposal',
  'won',
  'lost',
]

export const Route = createFileRoute('/_app/opportunities')({
  validateSearch: opportunitiesSearchSchema,
  component: OpportunitiesPage,
})

function OpportunitiesPage() {
  const search = useSearch({ from: '/_app/opportunities' })
  const navigate = Route.useNavigate()
  const queryClient = useQueryClient()
  const userRole = useAuthStore((s) => s.user?.role)
  const tenant = useAuthStore((s) => s.tenant)
  const [quickAddOpen, setQuickAddOpen] = useState(false)
  const [searchInput, setSearchInput] = useState('')
  const [debouncedQ, setDebouncedQ] = useState('')
  const [refreshing, setRefreshing] = useState(false)

  const view = search.view || 'kanban'
  const selectedId = search.selected
  const showOwnerFilter = userRole === 'admin' || userRole === 'manager'
  const staleDays = tenant?.settings?.stale_days ?? 7

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedQ(searchInput.trim()), 350)
    return () => window.clearTimeout(t)
  }, [searchInput])

  const { data: pipelines, isLoading: pipelinesLoading } = useQuery({
    queryKey: queryKeys.pipelines.all,
    queryFn: async () => {
      const response = await api.get('/pipelines')
      const rows = jsonApiPrimaryList(response.data)
      return rows.filter((r) => r.id).map(mapPipelineResource)
    },
  })

  const { data: users = [] } = useQuery({
    queryKey: queryKeys.users.all,
    queryFn: async () => {
      const response = await api.get('/users')
      return jsonApiPrimaryList(response.data)
        .filter((r) => r.id)
        .map((r) => ({
          id: String(r.id),
          name: String(r.attributes?.name ?? r.attributes?.email ?? 'Usuario'),
        }))
    },
    enabled: showOwnerFilter,
    staleTime: 60_000,
  })

  const defaultPipeline = pipelines?.find((p) => p.is_default) || pipelines?.[0]
  const activePipelineId = search.pipeline || defaultPipeline?.id
  const activePipeline = pipelines?.find((p) => p.id === activePipelineId) || defaultPipeline

  const listFilters = useMemo(
    () => ({
      pipeline_id: search.contact ? undefined : activePipelineId,
      stage_id: search.stage,
      contact_id: search.contact,
      owner_id: search.owner,
      status: search.status,
      temperature: search.temperature,
      q: debouncedQ.length >= 2 ? debouncedQ : undefined,
      stale_days: search.stale ? staleDays : undefined,
    }),
    [
      activePipelineId,
      search.contact,
      search.stage,
      search.owner,
      search.status,
      search.temperature,
      search.stale,
      debouncedQ,
      staleDays,
    ],
  )

  const listQueryKey = queryKeys.opportunities.list(listFilters)

  const {
    data: opportunities,
    isLoading: opportunitiesLoading,
    isError: opportunitiesError,
    error: opportunitiesErr,
  } = useQuery({
    queryKey: listQueryKey,
    queryFn: () => fetchOpportunities(listFilters),
    enabled: !pipelinesLoading && (!!activePipelineId || !!search.contact),
    refetchInterval: 15_000,
  })

  useEffect(() => {
    if (opportunitiesError) {
      toast.error(opportunityListErrorMessage(opportunitiesErr))
    }
  }, [opportunitiesError, opportunitiesErr])

  const filteredOpportunities = useMemo(() => {
    let all = opportunities ?? []
    const q = searchInput.trim().toLowerCase()
    if (q.length > 0 && q.length < 2) {
      return all.filter(
        (o) =>
          o.contact_name?.toLowerCase().includes(q) ||
          o.company_name?.toLowerCase().includes(q) ||
          o.contact_email?.toLowerCase().includes(q) ||
          o.contact_phone?.includes(q),
      )
    }
    return all
  }, [opportunities, searchInput])

  const selectedPreview = opportunities?.find((o) => o.id === selectedId)

  const handleViewChange = (newView: string) => {
    navigate({ search: (prev) => ({ ...prev, view: newView as 'kanban' | 'table' }) })
  }

  const handlePipelineChange = (pipelineId: string) => {
    navigate({ search: (prev) => ({ ...prev, pipeline: pipelineId, stage: undefined }) })
  }

  const handleSelectOpportunity = (id: string | null) => {
    navigate({ search: (prev) => ({ ...prev, selected: id || undefined }) })
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await queryClient.invalidateQueries({ queryKey: queryKeys.opportunities.all })
    setRefreshing(false)
  }

  const isLoading = pipelinesLoading || (!!activePipelineId && opportunitiesLoading)
  const oppCount = filteredOpportunities.length
  const subtitle =
    oppCount === 1 ? '1 oportunidad' : `${oppCount} oportunidades`

  const activeFiltersCount = [
    search.temperature,
    search.owner,
    search.status,
    search.stage,
    search.stale,
    debouncedQ.length >= 2 ? debouncedQ : null,
  ].filter(Boolean).length

  return (
    <AppPageShell
      className="h-full min-h-0"
      contentClassName="flex h-full min-h-0 flex-col gap-6 p-4 lg:p-6"
    >
      <PageHeader title="Oportunidades" description={subtitle}>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Buscar contacto (mín. 2 letras)..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="h-8 pl-8 w-[200px] text-sm"
          />
        </div>

        <div className="flex items-center gap-1">
          {(
            [
              { value: 'hot', icon: Flame, cls: 'text-red-600 hover:bg-red-50 data-[active=true]:bg-red-100 data-[active=true]:text-red-700' },
              { value: 'warm', icon: Sun, cls: 'text-amber-600 hover:bg-amber-50 data-[active=true]:bg-amber-100 data-[active=true]:text-amber-700' },
              { value: 'cold', icon: Snowflake, cls: 'text-sky-600 hover:bg-sky-50 data-[active=true]:bg-sky-100 data-[active=true]:text-sky-700' },
            ] as const
          ).map(({ value, icon: Icon, cls }) => (
            <button
              key={value}
              type="button"
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

        <Button
          type="button"
          size="sm"
          variant={search.stale ? 'secondary' : 'outline'}
          className="h-8 gap-1 px-2"
          title={`Sin actividad hace más de ${staleDays} días`}
          onClick={() =>
            navigate({ search: (prev) => ({ ...prev, stale: !prev.stale || undefined }) })
          }
        >
          <Clock className="size-3.5" />
          <span className="hidden md:inline">Inactivas</span>
        </Button>

        {showOwnerFilter && (
          <Select
            value={search.owner ?? '__all__'}
            onValueChange={(v) =>
              navigate({ search: (prev) => ({ ...prev, owner: v === '__all__' ? undefined : v }) })
            }
          >
            <SelectTrigger className="h-8 w-[150px] text-sm">
              <SelectValue placeholder="Consultor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todos</SelectItem>
              {users.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Select
          value={search.status ?? '__all__'}
          onValueChange={(v) =>
            navigate({ search: (prev) => ({ ...prev, status: v === '__all__' ? undefined : v }) })
          }
        >
          <SelectTrigger className="h-8 w-[130px] text-sm">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Todos los estados</SelectItem>
            {STATUS_OPTIONS.map((s) => (
              <SelectItem key={s} value={s}>
                {formatStatusLabel(s)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {activePipeline && activePipeline.stages.length > 0 && (
          <Select
            value={search.stage ?? '__all__'}
            onValueChange={(v) =>
              navigate({ search: (prev) => ({ ...prev, stage: v === '__all__' ? undefined : v }) })
            }
          >
            <SelectTrigger className="h-8 w-[150px] text-sm">
              <SelectValue placeholder="Etapa" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todas las etapas</SelectItem>
              {activePipeline.stages.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

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

        {activeFiltersCount > 0 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 text-xs gap-1"
            onClick={() =>
              navigate({
                search: (prev) => ({
                  ...prev,
                  temperature: undefined,
                  owner: undefined,
                  status: undefined,
                  stage: undefined,
                  stale: undefined,
                }),
              })
            }
          >
            <Filter className="size-3" />
            Limpiar ({activeFiltersCount})
          </Button>
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

        <OpportunitiesExportMenu
          pipelineId={activePipelineId}
          stageId={search.stage}
          ownerId={search.owner}
          temperature={search.temperature}
          disabled={!activePipelineId}
        />

        <Button
          size="sm"
          variant="outline"
          className="gap-1.5"
          onClick={handleRefresh}
          disabled={refreshing}
          title="Actualizar leads"
        >
          <RefreshCw className={`size-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Actualizar</span>
        </Button>

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
        ) : opportunitiesError ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
            <p className="text-sm text-muted-foreground">
              {opportunityListErrorMessage(opportunitiesErr)}
            </p>
            <Button variant="outline" size="sm" onClick={handleRefresh}>
              Reintentar
            </Button>
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
        opportunityId={selectedId}
        opportunityPreview={selectedPreview}
        pipeline={activePipeline}
        open={!!selectedId}
        onOpenChange={(open) => {
          if (!open) handleSelectOpportunity(null)
        }}
      />

      <QuickAddOpportunity open={quickAddOpen} onOpenChange={setQuickAddOpen} />
    </AppPageShell>
  )
}
