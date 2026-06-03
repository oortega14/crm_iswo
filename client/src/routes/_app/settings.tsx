import { createFileRoute, Outlet, Link, useLocation, redirect } from '@tanstack/react-router'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { AppPageShell } from '@/components/layout/AppPageShell'
import { PageHeader } from '@/components/layout/PageHeader'
import { useAuthStore } from '@/stores/auth'
import { filterSettingsNav } from '@/lib/settingsNav'

export const Route = createFileRoute('/_app/settings')({
  beforeLoad: ({ context }) => {
    const visible = filterSettingsNav(context.auth.user?.role, context.auth.tenant)
    if (visible.length === 0) {
      throw redirect({ to: '/' })
    }
  },
  component: SettingsLayout,
})

function SettingsLayout() {
  const location = useLocation()
  const isSettingsRoot = location.pathname === '/settings'
  const userRole = useAuthStore((s) => s.user?.role)
  const tenant = useAuthStore((s) => s.tenant)
  const visibleNav = filterSettingsNav(userRole, tenant)

  return (
    <AppPageShell contentClassName="gap-8">
      <PageHeader
        title="Configuración"
        description="Administra la configuración de tu CRM"
      />

      {isSettingsRoot ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {visibleNav.map((item) => (
            <Link key={item.href} to={item.href} className="group block">
              <div className="flex items-center gap-4 p-4 rounded-lg border hover:border-primary/50 hover:bg-muted/50 transition-colors">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <item.icon className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium group-hover:text-primary transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="flex gap-6">
          <nav className="w-48 shrink-0 space-y-1 hidden md:block">
            {visibleNav.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                  location.pathname === item.href
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex-1 min-w-0">
            <Outlet />
          </div>
        </div>
      )}
    </AppPageShell>
  )
}
