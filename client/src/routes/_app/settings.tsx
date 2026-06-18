import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { AppPageShell } from '@/components/layout/AppPageShell'
import { PageHeader } from '@/components/layout/PageHeader'
import { useAuthStore } from '@/stores/auth'
import { filterSettingsNav } from '@/lib/settingsNav'
import { isPlatformTenant } from '@/lib/platformTenant'
import { currentAuth } from '@/lib/authGuards'

export const Route = createFileRoute('/_app/settings')({
  beforeLoad: ({ location }) => {
    const { user, tenant } = currentAuth()
    const visible = filterSettingsNav(user?.role, tenant)
    if (visible.length === 0) {
      throw redirect({ to: '/' })
    }
    if (location.pathname === '/settings') {
      throw redirect({ to: visible[0].href })
    }
  },
  component: SettingsLayout,
})

function SettingsLayout() {
  const tenant = useAuthStore((s) => s.tenant)
  const platform = isPlatformTenant(tenant)

  return (
    <AppPageShell contentClassName="gap-8">
      <PageHeader
        title={platform ? 'Plataforma ISWO' : 'Configuración'}
        description={
          platform
            ? 'Alta de tenants y administración del operador de plataforma (RFC F5)'
            : 'Administra la configuración de tu CRM'
        }
      />

      <Outlet />
    </AppPageShell>
  )
}
