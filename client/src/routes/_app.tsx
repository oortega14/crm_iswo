import { createFileRoute, Outlet } from '@tanstack/react-router'
import { AppLayout } from '@/components/layout/AppLayout'
import { enforcePlatformRouteAccess } from '@/lib/platformRouteGuard'
import { requireAuth } from '@/lib/authGuards'
import { waitForAuthBootstrap } from '@/lib/authSession'
import { queryClient, queryKeys } from '@/lib/queryClient'
import { jsonApiPrimaryList, mapPipelineResource } from '@/lib/opportunityApi'
import api from '@/lib/api'

export const Route = createFileRoute('/_app')({
  beforeLoad: async ({ location }) => {
    await waitForAuthBootstrap()
    requireAuth()
    enforcePlatformRouteAccess(location.pathname)
    // Precarga pipelines para que el dashboard no dispare queries dos veces:
    // sin esto, activePipelineId arranca como undefined y todas las queries
    // del dashboard se re-disparan cuando llega el ID real del pipeline.
    void queryClient.prefetchQuery({
      queryKey: queryKeys.pipelines.all,
      queryFn: async () => {
        const res = await api.get('/pipelines')
        return jsonApiPrimaryList(res.data).filter((r: { id?: string }) => r.id).map(mapPipelineResource)
      },
      staleTime: 60_000,
    })
  },
  component: AppLayoutRoute,
})

function AppLayoutRoute() {
  return (
    <AppLayout>
      <Outlet />
    </AppLayout>
  )
}
