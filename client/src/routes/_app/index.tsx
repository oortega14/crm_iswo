import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowRight,
  CalendarDays,
  LayoutGrid,
  Plus,
  Sparkles,
  TrendingUp,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { queryKeys } from '@/lib/queryClient'
import {
  fetchDashboardActivity,
  fetchDashboardBriefing,
  fetchDashboardBantDistribution,
  fetchDashboardKpis,
  fetchDashboardLeadSources,
  fetchDashboardPipeline,
  fetchDashboardTopConsultants,
} from '@/lib/dashboardApi'
import {
  jsonApiPrimaryList,
  mapPipelineResource,
} from '@/lib/opportunityApi'
import api from '@/lib/api'
import { Button } from '@/components/ui/button'
import { PipelineFunnel } from '@/components/dashboard/PipelineFunnel'
import { ActivityFeed } from '@/components/dashboard/ActivityFeed'
import { BantDistribution } from '@/components/dashboard/BantDistribution'
import { TopConsultants } from '@/components/dashboard/TopConsultants'
import { LeadSourcesChart } from '@/components/dashboard/LeadSourcesChart'
import { DailyBriefing } from '@/components/dashboard/DailyBriefing'
import { LeadTemperatureStrip } from '@/components/dashboard/LeadTemperatureStrip'
import { QuickAddOpportunity } from '@/components/opportunities/QuickAddOpportunity'
import { DashboardSkeleton } from '@/components/dashboard/DashboardSkeleton'
import { DashboardDateLine, DashboardKpiStrip } from '@/components/dashboard/DashboardKpiStrip'
import { DashboardSection } from '@/components/dashboard/DashboardSection'
import { AppPageShell } from '@/components/layout/AppPageShell'
import { PageHeader } from '@/components/layout/PageHeader'
import { useAuthStore } from '@/stores/auth'

export const Route = createFileRoute('/_app/')({
  component: DashboardPage,
})

function DashboardPage() {
  const [quickAddOpen, setQuickAddOpen] = useState(false)
  const tenant = useAuthStore((s) => s.tenant)
  const user = useAuthStore((s) => s.user)
  const userRole = user?.role
  const currency = tenant?.currency ?? 'COP'
  const showTeamRanking = userRole === 'admin' || userRole === 'manager'

  const { data: pipelines = [], isPending: pipelinesLoading } = useQuery({
    queryKey: queryKeys.pipelines.all,
    queryFn: async () => {
      const response = await api.get('/pipelines')
      return jsonApiPrimaryList(response.data).filter((r) => r.id).map(mapPipelineResource)
    },
    staleTime: 60 * 1000,
  })

  const defaultPipeline = pipelines.find((p) => p.is_default) ?? pipelines[0]
  const [selectedPipelineId, setSelectedPipelineId] = useState<string | undefined>(undefined)

  useEffect(() => {
    if (!selectedPipelineId && defaultPipeline?.id) {
      setSelectedPipelineId(defaultPipeline.id)
    }
  }, [defaultPipeline?.id, selectedPipelineId])

  const activePipelineId = selectedPipelineId ?? defaultPipeline?.id
  const pipelineFilterKey = activePipelineId ?? 'all'

  const { data: briefing, isPending: briefingPending, isError: briefingError } = useQuery({
    queryKey: queryKeys.dashboard.briefing(pipelineFilterKey),
    queryFn: () => fetchDashboardBriefing(activePipelineId),
    staleTime: 2 * 60 * 1000,
  })

  // KPIs en su propio useQuery para preservar el tipo DashboardKpis exacto.
  // useQueries infiere una unión de todos los queryFn returns, perdiendo el tipo específico.
  const kpisQ = useQuery({
    queryKey: queryKeys.dashboard.kpis(pipelineFilterKey),
    queryFn: () => fetchDashboardKpis(activePipelineId),
  })

  const pipelineQ = useQuery({
    queryKey: queryKeys.dashboard.pipeline(activePipelineId),
    queryFn: () => fetchDashboardPipeline(activePipelineId),
  })

  const activityQ = useQuery({
    queryKey: queryKeys.dashboard.activity(pipelineFilterKey),
    queryFn: () => fetchDashboardActivity(activePipelineId),
    refetchInterval: 30_000,
  })

  const bantQ = useQuery({
    queryKey: queryKeys.dashboard.bantDistribution(pipelineFilterKey),
    queryFn: () => fetchDashboardBantDistribution(activePipelineId),
  })

  const consultantsQ = useQuery({
    queryKey: queryKeys.dashboard.topConsultants(pipelineFilterKey),
    queryFn: () => fetchDashboardTopConsultants(activePipelineId),
    enabled: showTeamRanking,
  })

  const leadSourcesQ = useQuery({
    queryKey: queryKeys.dashboard.leadSources(pipelineFilterKey),
    queryFn: () => fetchDashboardLeadSources(activePipelineId),
  })

  const initialLoading =
    pipelinesLoading || (kpisQ.isPending && !kpisQ.data) || (pipelineQ.isPending && !pipelineQ.data)

  if (initialLoading) {
    return <DashboardSkeleton />
  }

  const totalInPipeline = kpisQ.data?.total_in_pipeline ?? 0
  const pipelineValue = kpisQ.data?.pipeline_value ?? 0
  const monthClosedValue = kpisQ.data?.month_closed_value ?? 0
  const bantAverage = kpisQ.data?.bant_average ?? null
  const winRate = kpisQ.data?.win_rate ?? null
  const wonCount = kpisQ.data?.won_count ?? 0
  const lostCount = kpisQ.data?.lost_count ?? 0

  const pipelineOptions = pipelines.map((p) => ({
    id: p.id,
    name: p.name,
    is_default: p.is_default,
  }))

  const activePipelineName =
    pipelineOptions.find((p) => p.id === activePipelineId)?.name ?? 'Pipeline'

  return (
    <AppPageShell contentClassName="space-y-10">
      <PageHeader
        title="Panel principal"
        belowTitle={<DashboardDateLine />}
      >
        <Button variant="outline" size="sm" className="gap-2" asChild>
          <Link to="/opportunities" search={{ view: 'kanban' }}>
            <LayoutGrid className="size-4" />
            Ver oportunidades
            <ArrowRight className="size-3.5 opacity-70" />
          </Link>
        </Button>
        <Button size="sm" className="gap-2 shadow-sm" onClick={() => setQuickAddOpen(true)}>
          <Plus className="size-4" />
          <span className="hidden sm:inline">Nueva oportunidad</span>
          <span className="sm:hidden">Nueva</span>
        </Button>
      </PageHeader>

      <DashboardSection
        title="Briefing del día"
        icon={Sparkles}
        accent="brand"
      >
        <DailyBriefing
          data={briefing}
          userName={user?.name}
          currency={currency}
          isLoading={briefingPending}
          isError={briefingError}
        />
      </DashboardSection>

      <DashboardSection
        title="Pipeline y cierres"
        subtitle={pipelines.length > 1 ? activePipelineName : undefined}
        icon={TrendingUp}
        accent="brand"
      >
        <DashboardKpiStrip
          currency={currency}
          totalInPipeline={totalInPipeline}
          pipelineValue={pipelineValue}
          bantAverage={bantAverage}
          monthClosedValue={monthClosedValue}
          winRate={winRate}
          wonCount={wonCount}
          lostCount={lostCount}
          loadingKpis={kpisQ.isPending || kpisQ.isFetching}
        />

        <LeadTemperatureStrip
          hotCount={kpisQ.data?.hot_count ?? 0}
          warmCount={kpisQ.data?.warm_count ?? 0}
          coldCount={kpisQ.data?.cold_count ?? 0}
          loading={kpisQ.isPending}
        />

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-12 xl:gap-8 xl:items-start">
          <div className="flex flex-col gap-6 xl:col-span-7 2xl:col-span-8">
            <PipelineFunnel
              currency={currency}
              data={pipelineQ.data}
              isLoading={pipelineQ.isPending}
              isError={pipelineQ.isError}
              pipelines={pipelineOptions}
              selectedPipelineId={activePipelineId}
              onPipelineChange={setSelectedPipelineId}
            />
            <LeadSourcesChart
              currency={currency}
              data={leadSourcesQ.data}
              isLoading={leadSourcesQ.isPending}
              isError={leadSourcesQ.isError}
            />
          </div>

          <div className="flex flex-col gap-6 xl:col-span-5 2xl:col-span-4">
            <BantDistribution
              data={bantQ.data}
              isLoading={bantQ.isPending}
              isError={bantQ.isError}
            />
            {showTeamRanking ? (
              <TopConsultants
                currency={currency}
                data={consultantsQ.data}
                isLoading={consultantsQ.isPending}
                isError={consultantsQ.isError}
              />
            ) : null}
          </div>
        </div>
      </DashboardSection>

      <DashboardSection
        title="Seguimiento comercial"
        icon={CalendarDays}
        accent="sky"
        action={
          <Button variant="outline" size="sm" className="gap-2 shadow-sm" asChild>
            <Link to="/reminders">
              <CalendarDays className="size-4" />
              Recordatorios
            </Link>
          </Button>
        }
      >
        <ActivityFeed
          data={activityQ.data}
          isLoading={activityQ.isPending}
          isError={activityQ.isError}
          variant="split"
        />
      </DashboardSection>

      <QuickAddOpportunity open={quickAddOpen} onOpenChange={setQuickAddOpen} />
    </AppPageShell>
  )
}
