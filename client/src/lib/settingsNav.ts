import type { LucideIcon } from 'lucide-react'
import {
  LayoutDashboard,
  Target,
  Users,
  Bell,
  Share2,
  Copy,
  Download,
  Globe,
  Settings,
  GitBranch,
  Megaphone,
  UserCog,
  Plug,
  Gauge,
  ListChecks,
  FileSearch,
  Building2,
} from 'lucide-react'
import type { Tenant, UserRole } from '@/types'
import { isPlatformTenant } from '@/lib/platformTenant'
import { tenantHasModule, tenantShowBant, type TenantModule } from '@/lib/tenantModules'

export type MainNavItem = {
  href: string
  label: string
  icon: LucideIcon
  roles: UserRole[]
  module?: TenantModule
}

export type SettingsNavItem = {
  href: string
  label: string
  title: string
  description: string
  icon: LucideIcon
  roles: UserRole[]
  visible?: (tenant: Tenant | null | undefined) => boolean
}

export const MAIN_NAV_ITEMS: MainNavItem[] = [
  {
    href: '/',
    label: 'Dashboard',
    icon: LayoutDashboard,
    roles: ['admin', 'manager', 'consultant', 'viewer'],
  },
  {
    href: '/opportunities',
    label: 'Oportunidades',
    icon: Target,
    roles: ['admin', 'manager', 'consultant', 'viewer'],
    module: 'opportunities',
  },
  {
    href: '/contacts',
    label: 'Contactos',
    icon: Users,
    roles: ['admin', 'manager', 'consultant', 'viewer'],
    module: 'contacts',
  },
  {
    href: '/reminders',
    label: 'Recordatorios',
    icon: Bell,
    roles: ['admin', 'manager', 'consultant', 'viewer'],
    module: 'reminders',
  },
  {
    href: '/network',
    label: 'Red de referidos',
    icon: Share2,
    roles: ['admin', 'manager', 'consultant'],
    module: 'network',
  },
  {
    href: '/duplicates',
    label: 'Duplicados',
    icon: Copy,
    roles: ['admin', 'manager', 'consultant'],
    module: 'opportunities',
  },
  {
    href: '/exports',
    label: 'Exportaciones',
    icon: Download,
    roles: ['admin', 'manager', 'consultant'],
    module: 'exports',
  },
  {
    href: '/landings',
    label: 'Landing pages',
    icon: Globe,
    roles: ['admin', 'manager', 'consultant', 'viewer'],
    module: 'landings',
  },
]

export const SETTINGS_NAV_ITEMS: SettingsNavItem[] = [
  {
    href: '/settings/general',
    label: 'General',
    title: 'General',
    description: 'Días sin actividad y profundidad de la red de referidos',
    icon: Settings,
    roles: ['admin'],
  },
  {
    href: '/settings/pipelines',
    label: 'Pipelines',
    title: 'Pipelines y etapas',
    description: 'Embudos comerciales y etapas del Kanban',
    icon: GitBranch,
    roles: ['admin'],
    visible: (tenant) => tenantHasModule(tenant, 'pipeline'),
  },
  {
    href: '/settings/lead-sources',
    label: 'Fuentes de lead',
    title: 'Fuentes de lead',
    description: 'Orígenes de oportunidades y landings',
    icon: Megaphone,
    roles: ['admin', 'manager'],
    visible: (tenant) => tenantHasModule(tenant, 'opportunities'),
  },
  {
    href: '/settings/users',
    label: 'Usuarios',
    title: 'Usuarios',
    description: 'Invitaciones, roles y acceso al CRM',
    icon: UserCog,
    roles: ['admin'],
  },
  {
    href: '/settings/integrations',
    label: 'Integraciones',
    title: 'Integraciones',
    description: 'Meta, Google Ads y WhatsApp Business',
    icon: Plug,
    roles: ['admin', 'manager'],
  },
  {
    href: '/settings/bant',
    label: 'BANT',
    title: 'Calificación BANT',
    description: 'Pesos, umbral de calificación y días sin actividad',
    icon: Gauge,
    roles: ['admin'],
    visible: (tenant) => tenantShowBant(tenant),
  },
  {
    href: '/settings/fields',
    label: 'Campos',
    title: 'Campos personalizados',
    description: 'Definiciones por contacto y oportunidad',
    icon: ListChecks,
    roles: ['admin'],
  },
  {
    href: '/settings/audit',
    label: 'Auditoría',
    title: 'Registro de auditoría',
    description: 'Bitácora inmutable de acciones en el tenant',
    icon: FileSearch,
    roles: ['admin', 'manager'],
  },
  {
    href: '/settings/tenant-onboarding',
    label: 'Onboarding tenants',
    title: 'Onboarding de tenants',
    description: 'Alta de nuevos tenants (solo tenant plataforma ISWO + token super-admin)',
    icon: Building2,
    roles: ['admin'],
    visible: (tenant) => isPlatformTenant(tenant),
  },
]

function roleAllowed(role: UserRole | undefined, allowed: UserRole[]): boolean {
  return Boolean(role && allowed.includes(role))
}

export function filterMainNav(
  items: MainNavItem[],
  role: UserRole | undefined,
  tenant: Tenant | null | undefined,
): MainNavItem[] {
  return items.filter((item) => {
    if (!roleAllowed(role, item.roles)) return false
    if (item.module && !tenantHasModule(tenant, item.module)) return false
    return true
  })
}

export function filterSettingsNav(
  role: UserRole | undefined,
  tenant: Tenant | null | undefined,
): SettingsNavItem[] {
  return SETTINGS_NAV_ITEMS.filter((item) => {
    if (!roleAllowed(role, item.roles)) return false
    if (item.visible && !item.visible(tenant)) return false
    return true
  })
}
