import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { useState } from 'react'
import { queryKeys } from '@/lib/queryClient'
import api from '@/lib/api'
import { Button } from '@/components/ui/button'
import { PipelineFunnel } from '@/components/dashboard/PipelineFunnel'
import { ActivityFeed } from '@/components/dashboard/ActivityFeed'
import { BantDistribution } from '@/components/dashboard/BantDistribution'
import { TopConsultants } from '@/components/dashboard/TopConsultants'
import { QuickAddOpportunity } from '@/components/opportunities/QuickAddOpportunity'
import { DashboardSkeleton } from '@/components/dashboard/DashboardSkeleton'

export const Route = createFileRoute('/_app/')({
  component: DashboardPage,
})

function DashboardPage() {
  const [quickAddOpen, setQuickAddOpen] = useState(false)

  // Fetch pipeline stats
  const { data: pipelineData, isLoading: pipelineLoading } = useQuery({
    queryKey: queryKeys.dashboard.pipeline,
    queryFn: async () => {
      const response = await api.get('/dashboard/pipeline')
      return response.data.data
    },
  })

  // Fetch activity feed (polling every 30s)
  const { data: activityData, isLoading: activityLoading } = useQuery({
    queryKey: queryKeys.dashboard.activity,
    queryFn: async () => {
      const response = await api.get('/dashboard/activity')
      return response.data.data
    },
    refetchInterval: 30000,
  })

  // Fetch BANT distribution
  const { data: bantData, isLoading: bantLoading } = useQuery({
    queryKey: queryKeys.dashboard.bantDistribution,
    queryFn: async () => {
      const response = await api.get('/dashboard/bant_distribution')
      return response.data.data
    },
  })

  // Fetch top consultants
  const { data: consultantsData, isLoading: consultantsLoading } = useQuery({
    queryKey: queryKeys.dashboard.topConsultants,
    queryFn: async () => {
      const response = await api.get('/dashboard/top_consultants')
      return response.data.data
    },
  })

  const isLoading = pipelineLoading || activityLoading || bantLoading || consultantsLoading

  if (isLoading) {
    return <DashboardSkeleton />
  }

  return (
    <div className="p-4 lg:p-6 pb-20 lg:pb-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Resumen de tu actividad y oportunidades
          </p>
        </div>
        <Button onClick={() => setQuickAddOpen(true)} className="gap-2">
          <Plus className="size-4" />
          <span className="hidden sm:inline">Nueva Oportunidad</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left column - 60% */}
        <div className="lg:col-span-3 flex flex-col gap-6">
          <PipelineFunnel data={pipelineData} />
          <ActivityFeed data={activityData} />
        </div>

        {/* Right column - 40% */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <BantDistribution data={bantData} />
          <TopConsultants data={consultantsData} />
        </div>
      </div>

      {/* Quick add slide-over */}
      <QuickAddOpportunity open={quickAddOpen} onOpenChange={setQuickAddOpen} />
    </div>
  )
}
