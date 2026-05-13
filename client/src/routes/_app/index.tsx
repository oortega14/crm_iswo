import { createFileRoute, Link } from '@tanstack/react-router'
import { useQueries } from '@tanstack/react-query'
import {
  ArrowRight,
  CalendarDays,
  LayoutGrid,
  Plus,
  TrendingUp,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { queryKeys } from '@/lib/queryClient'
import {
  fetchDashboardActivity,
  fetchDashboardBantDistribution,
  fetchDashboardPipeline,
  fetchDashboardTopConsultants,
} from '@/lib/dashboardApi'
import { Button } from '@/components/ui/button'
import { PipelineFunnel } from '@/components/dashboard/PipelineFunnel'
import { ActivityFeed } from '@/components/dashboard/ActivityFeed'
import { BantDistribution } from '@/components/dashboard/BantDistribution'
import { TopConsultants } from '@/components/dashboard/TopConsultants'
import { QuickAddOpportunity } from '@/components/opportunities/QuickAddOpportunity'
import { DashboardSkeleton } from '@/components/dashboard/DashboardSkeleton'
import { DashboardDateLine, DashboardKpiStrip } from '@/components/dashboard/DashboardKpiStrip'
import { DashboardSection } from '@/components/dashboard/DashboardSection'
import { AppPageShell } from '@/components/layout/AppPageShell'
import { PageHeader } from '@/components/layout/PageHeader'

export const Route = createFileRoute('/_app/')({
  component: DashboardPage,
})

function DashboardPage() {
  const [quickAddOpen, setQuickAddOpen] = useState(false)

  const [pipelineQ, activityQ, bantQ, consultantsQ] = useQueries({
    queries: [
      {
        queryKey: queryKeys.dashboard.pipeline,
        queryFn: fetchDashboardPipeline,
      },
      {
        queryKey: queryKeys.dashboard.activity,
        queryFn: fetchDashboardActivity,
        refetchInterval: 30_000,
      },
      {
        queryKey: queryKeys.dashboard.bantDistribution,
        queryFn: fetchDashboardBantDistribution,
      },
      {
        queryKey: queryKeys.dashboard.topConsultants,
        queryFn: fetchDashboardTopConsultants,
      },
    ],
  })

  const allPending = [pipelineQ, activityQ, bantQ, consultantsQ].every((q) => q.isPending)

  const pipelineRows = pipelineQ.data ?? []
  const kpis = useMemo(() => {
    const totalInPipeline = pipelineRows.reduce((sum, s) => sum + (s.count ?? 0), 0)
    const pipelineValue = pipelineRows.reduce((sum, s) => sum + (Number(s.value) || 0), 0)
    return { totalInPipeline, pipelineValue }
  }, [pipelineRows])

  const monthClosedValue = useMemo(() => {
    const rows = consultantsQ.data ?? []
    return rows.reduce((sum, c) => sum + (Number(c.total_value) || 0), 0)
  }, [consultantsQ.data])

  const bantAverage = bantQ.isSuccess && bantQ.data ? bantQ.data.average : null

  if (allPending) {
    return <DashboardSkeleton />
  }

  return (
    <AppPageShell contentClassName="space-y-10">
      <PageHeader
        title="Panel principal"
        belowTitle={<DashboardDateLine />}
        description="Dos vistas claras: cuánto estás moviendo en ventas y qué tienes agendado para hoy."
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
          title="Pipeline y cierres"
          subtitle="Valor en pipeline, cierres del mes, embudo y ranking — todo lo que cuenta para ingresos."
          icon={TrendingUp}
          accent="brand"
        >
        <DashboardKpiStrip
          totalInPipeline={kpis.totalInPipeline}
          pipelineValue={kpis.pipelineValue}
          bantAverage={bantAverage}
          monthClosedValue={monthClosedValue}
          loadingPipeline={pipelineQ.isPending}
          loadingBant={bantQ.isPending}
          loadingConsultants={consultantsQ.isPending}
        />

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-12 xl:gap-8 xl:items-start">
          <div className="flex flex-col gap-6 xl:col-span-7 2xl:col-span-8">
            <PipelineFunnel
              data={pipelineQ.data}
              isLoading={pipelineQ.isPending}
              isError={pipelineQ.isError}
            />
          </div>

          <div className="flex flex-col gap-6 xl:col-span-5 2xl:col-span-4">
            <BantDistribution
              data={bantQ.data}
              isLoading={bantQ.isPending}
              isError={bantQ.isError}
            />
            <TopConsultants
              data={consultantsQ.data}
              isLoading={consultantsQ.isPending}
              isError={consultantsQ.isError}
            />
          </div>
        </div>
      </DashboardSection>

      <DashboardSection
        title="Seguimiento comercial"
        subtitle="Recordatorios para hoy y movimiento en oportunidades. Prioriza el seguimiento."
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
