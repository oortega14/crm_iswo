import { createFileRoute, Outlet, Link, useLocation } from '@tanstack/react-router'
import { GitBranch, Users, Puzzle, FileText, ChevronRight, Radio, Target } from 'lucide-react'
import { cn } from '@/lib/utils'
import { AppPageShell } from '@/components/layout/AppPageShell'
import { PageHeader } from '@/components/layout/PageHeader'
import { useAuthStore } from '@/stores/auth'
import type { UserRole } from '@/types'

export const Route = createFileRoute('/_app/settings')({
  component: SettingsLayout,
})

const settingsNav: { title: string; href: string; icon: React.ComponentType<{ className?: string }>; description: string; roles: UserRole[] }[] = [
  {
    title: 'Pipelines',
    href: '/settings/pipelines',
    icon: GitBranch,
    description: 'Gestiona tus pipelines y etapas',
    roles: ['admin'],
  },
  {
    title: 'Fuentes de Lead',
    href: '/settings/lead-sources',
    icon: Radio,
    description: 'Canales de origen de tus leads',
    roles: ['admin'],
  },
  {
    title: 'Usuarios',
    href: '/settings/users',
    icon: Users,
    description: 'Administra usuarios y permisos',
    roles: ['admin', 'manager'],
  },
  {
    title: 'Integraciones',
    href: '/settings/integrations',
    icon: Puzzle,
    description: 'Conecta servicios externos',
    roles: ['admin', 'manager'],
  },
  {
    title: 'BANT',
    href: '/settings/bant',
    icon: Target,
    description: 'Pesos y umbral de calificación',
    roles: ['admin'],
  },
  {
    title: 'Auditoria',
    href: '/settings/audit',
    icon: FileText,
    description: 'Historial de actividad',
    roles: ['admin', 'manager'],
  },
]

function SettingsLayout() {
  const location = useLocation()
  const isSettingsRoot = location.pathname === '/settings'
  const userRole = useAuthStore((s) => s.user?.role)
  const visibleNav = settingsNav.filter((item) => userRole && item.roles.includes(userRole))

  return (
    <AppPageShell contentClassName="gap-8">
      <PageHeader
        title="Configuración"
        description="Administra la configuración de tu CRM"
      />

      {isSettingsRoot ? (
        // Settings Index - Show cards (filtered by role)
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {visibleNav.map((item) => (
            <Link
              key={item.href}
              to={item.href}
              className="group block"
            >
              <div className="flex items-center gap-4 p-4 rounded-lg border hover:border-primary/50 hover:bg-muted/50 transition-colors">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <item.icon className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium group-hover:text-primary transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {item.description}
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
            </Link>
          ))}
        </div>
      ) : (
        // Settings Subpage - Show sidebar + content
        <div className="flex gap-6">
          {/* Sidebar */}
          <nav className="w-48 shrink-0 space-y-1">
            {visibleNav.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                  location.pathname === item.href
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.title}
              </Link>
            ))}
          </nav>

          {/* Content */}
          <div className="flex-1">
            <Outlet />
          </div>
        </div>
      )}
    </AppPageShell>
  )
}
