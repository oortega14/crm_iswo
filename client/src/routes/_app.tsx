import { createFileRoute, Outlet } from '@tanstack/react-router'
import { AppLayout } from '@/components/layout/AppLayout'
import { enforcePlatformRouteAccess } from '@/lib/platformRouteGuard'
import { requireAuth } from '@/lib/authGuards'
import { waitForAuthBootstrap } from '@/lib/authSession'

export const Route = createFileRoute('/_app')({
  beforeLoad: async ({ location }) => {
    await waitForAuthBootstrap()
    requireAuth()
    enforcePlatformRouteAccess(location.pathname)
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
