import { useState, useEffect } from 'react'
import { Link, useLocation } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import {
  LayoutDashboard,
  Target,
  Users,
  Bell,
  Settings,
  Network,
  Flag,
  Download,
  FileText,
  Menu,
  X,
  Search,
  Moon,
  Sun,
  LogOut,
  ChevronDown,
} from 'lucide-react'
import { useAuthStore, useTenant, useUser } from '@/stores/auth'
import { useTheme } from '@/components/common/ThemeProvider'
import { queryKeys } from '@/lib/queryClient'
import api from '@/lib/api'
import { cn, getInitials } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { CommandPalette } from '@/components/common/CommandPalette'
import { NotificationDropdown } from '@/components/common/NotificationDropdown'
import type { UserRole } from '@/types'

interface NavItem {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  roles: UserRole[]
  badge?: number
}

const mainNavItems: NavItem[] = [
  { label: 'Dashboard', href: '/', icon: LayoutDashboard, roles: ['admin', 'manager', 'consultant', 'viewer'] },
  { label: 'Oportunidades', href: '/opportunities', icon: Target, roles: ['admin', 'manager', 'consultant', 'viewer'] },
  { label: 'Contactos', href: '/contacts', icon: Users, roles: ['admin', 'manager', 'consultant', 'viewer'] },
  { label: 'Recordatorios', href: '/reminders', icon: Bell, roles: ['admin', 'manager', 'consultant', 'viewer'] },
  { label: 'Red de Referidos', href: '/network', icon: Network, roles: ['admin', 'manager', 'consultant'] },
  { label: 'Duplicados', href: '/duplicates', icon: Flag, roles: ['admin', 'manager'] },
  { label: 'Exportaciones', href: '/exports', icon: Download, roles: ['admin', 'manager'] },
  { label: 'Landing Pages', href: '/landing-pages', icon: FileText, roles: ['admin'] },
]

const settingsNavItems: NavItem[] = [
  { label: 'Pipelines', href: '/settings/pipelines', icon: Target, roles: ['admin'] },
  { label: 'Usuarios', href: '/settings/users', icon: Users, roles: ['admin'] },
  { label: 'Integraciones', href: '/settings/integrations', icon: Settings, roles: ['admin'] },
  { label: 'Fuentes de Lead', href: '/settings/lead-sources', icon: Target, roles: ['admin'] },
  { label: 'Registro de Auditoría', href: '/settings/audit-log', icon: FileText, roles: ['admin'] },
]

interface AppLayoutProps {
  children: React.ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [commandOpen, setCommandOpen] = useState(false)
  const location = useLocation()
  const { theme, setTheme, resolvedTheme } = useTheme()
  const user = useUser()
  const tenant = useTenant()
  const logout = useAuthStore((s) => s.logout)

  // Fetch overdue reminders count
  const { data: overdueCount } = useQuery({
    queryKey: queryKeys.reminders.overdue,
    queryFn: async () => {
      const response = await api.get<{ meta: { total: number } }>(
        '/reminders?status=pending&overdue=true'
      )
      return response.data.meta?.total || 0
    },
    refetchInterval: 60000, // Poll every 60s
  })

  // Fetch pending duplicate flags count
  const { data: duplicateCount } = useQuery({
    queryKey: queryKeys.duplicateFlags.pending,
    queryFn: async () => {
      const response = await api.get<{ meta: { total: number } }>(
        '/duplicate_flags?resolution=pending'
      )
      return response.data.meta?.total || 0
    },
    enabled: user?.role === 'admin' || user?.role === 'manager',
  })

  // Update nav items with badges
  const navItemsWithBadges = mainNavItems.map((item) => ({
    ...item,
    badge:
      item.href === '/reminders'
        ? overdueCount
        : item.href === '/duplicates'
        ? duplicateCount
        : undefined,
  }))

  // Filter nav items by role
  const filteredMainNav = navItemsWithBadges.filter((item) =>
    user ? item.roles.includes(user.role) : false
  )
  const filteredSettingsNav = settingsNavItems.filter((item) =>
    user ? item.roles.includes(user.role) : false
  )

  // Keyboard shortcut for command palette
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setCommandOpen((open) => !open)
      }
    }
    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [])

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false)
  }, [location.pathname])

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-60 flex-col border-r bg-sidebar transition-transform duration-200 lg:static lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Logo */}
        <div className="flex h-14 items-center gap-2 border-b px-4">
          {tenant?.logo_url ? (
            <img
              src={tenant.logo_url}
              alt={tenant.name}
              className="h-8 w-auto object-contain"
            />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground font-bold text-sm">
              IS
            </div>
          )}
          <span className="font-semibold text-sidebar-foreground truncate">
            {tenant?.name || 'CRM ISWO'}
          </span>
          <Button
            variant="ghost"
            size="icon-sm"
            className="ml-auto lg:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="size-4" />
          </Button>
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1 px-3 py-4">
          <nav className="flex flex-col gap-1">
            {filteredMainNav.map((item) => {
              const isActive = location.pathname === item.href
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                      : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                  )}
                >
                  <item.icon className="size-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                  {item.badge !== undefined && item.badge > 0 && (
                    <Badge
                      variant="destructive"
                      className="ml-auto h-5 min-w-5 px-1.5 text-xs"
                    >
                      {item.badge}
                    </Badge>
                  )}
                </Link>
              )
            })}

            {filteredSettingsNav.length > 0 && (
              <>
                <Separator className="my-3" />
                <span className="px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Configuración
                </span>
                {filteredSettingsNav.map((item) => {
                  const isActive = location.pathname === item.href
                  return (
                    <Link
                      key={item.href}
                      to={item.href}
                      className={cn(
                        'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                          : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                      )}
                    >
                      <item.icon className="size-4 shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  )
                })}
              </>
            )}
          </nav>
        </ScrollArea>

        {/* User menu */}
        <div className="border-t p-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex w-full items-center gap-3 rounded-md px-2 py-1.5 text-sm hover:bg-sidebar-accent transition-colors">
                <Avatar className="size-8">
                  <AvatarImage src={user?.avatar_url} alt={user?.name} />
                  <AvatarFallback>{user?.name ? getInitials(user.name) : 'U'}</AvatarFallback>
                </Avatar>
                <div className="flex-1 text-left truncate">
                  <p className="font-medium text-sidebar-foreground truncate">{user?.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                </div>
                <ChevronDown className="size-4 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}>
                {resolvedTheme === 'dark' ? (
                  <>
                    <Sun className="size-4 mr-2" />
                    Modo claro
                  </>
                ) : (
                  <>
                    <Moon className="size-4 mr-2" />
                    Modo oscuro
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout} className="text-destructive focus:text-destructive">
                <LogOut className="size-4 mr-2" />
                Cerrar sesión
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex h-14 items-center gap-4 border-b bg-background px-4">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="size-5" />
          </Button>

          {/* Search */}
          <button
            onClick={() => setCommandOpen(true)}
            className="flex flex-1 items-center gap-2 rounded-md border bg-muted/50 px-3 py-1.5 text-sm text-muted-foreground max-w-md hover:bg-muted transition-colors"
          >
            <Search className="size-4" />
            <span className="hidden sm:inline">Buscar...</span>
            <kbd className="ml-auto hidden rounded border bg-background px-1.5 py-0.5 text-xs font-mono sm:inline">
              ⌘K
            </kbd>
          </button>

          <div className="flex items-center gap-2">
            <NotificationDropdown />
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>

      {/* Command palette */}
      <CommandPalette open={commandOpen} onOpenChange={setCommandOpen} />

      {/* Mobile bottom navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 flex h-16 items-center justify-around border-t bg-background lg:hidden">
        {filteredMainNav.slice(0, 4).map((item) => {
          const isActive = location.pathname === item.href
          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                'flex flex-col items-center gap-1 px-3 py-2',
                isActive ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              <div className="relative">
                <item.icon className="size-5" />
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] text-white">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px]">{item.label}</span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
