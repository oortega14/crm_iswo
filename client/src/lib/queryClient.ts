import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes (formerly cacheTime)
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
})

// Query keys factory
export const queryKeys = {
  // Auth
  tenant: ['tenant'] as const,
  currentUser: ['currentUser'] as const,
  
  // Opportunities
  opportunities: {
    all: ['opportunities'] as const,
    list: (filters: Record<string, unknown>) => ['opportunities', 'list', filters] as const,
    detail: (id: string) => ['opportunities', 'detail', id] as const,
    logs: (id: string) => ['opportunities', 'logs', id] as const,
    messages: (id: string) => ['opportunities', 'messages', id] as const,
    duplicateCheck: (phone?: string, email?: string) => 
      ['opportunities', 'duplicateCheck', { phone, email }] as const,
  },
  
  // Contacts
  contacts: {
    all: ['contacts'] as const,
    list: (filters: Record<string, unknown>) => ['contacts', 'list', filters] as const,
    detail: (id: string) => ['contacts', 'detail', id] as const,
  },
  
  // Reminders
  reminders: {
    all: ['reminders'] as const,
    list: (filters: Record<string, unknown>) => ['reminders', 'list', filters] as const,
    stats: ['reminders', 'stats'] as const,
    overdue: ['reminders', 'overdue'] as const,
    pending: ['reminders', 'pending'] as const,
    byOpportunity: (opportunityId: string) => ['reminders', 'opportunity', opportunityId] as const,
  },
  
  // Pipelines
  pipelines: {
    all: ['pipelines'] as const,
    detail: (id: string) => ['pipelines', 'detail', id] as const,
  },
  
  // Users
  users: {
    all: ['users'] as const,
    list: (filters: Record<string, unknown>) => ['users', 'list', filters] as const,
    detail: (id: string) => ['users', 'detail', id] as const,
  },
  
  // Duplicate Flags
  duplicateFlags: {
    all: ['duplicateFlags'] as const,
    list: (filters: Record<string, unknown>) => ['duplicateFlags', 'list', filters] as const,
    pending: ['duplicateFlags', 'pending'] as const,
  },
  
  // Exports
  exports: {
    all: ['exports'] as const,
    list: (filters: Record<string, unknown>) => ['exports', 'list', filters] as const,
  },
  
  // Integrations
  integrations: {
    all: ['integrations'] as const,
    detail: (id: string) => ['integrations', 'detail', id] as const,
  },
  
  // Lead Sources
  leadSources: {
    all: ['leadSources'] as const,
  },
  
  // Landing Pages
  landingPages: {
    all: ['landingPages'] as const,
    detail: (id: string) => ['landingPages', 'detail', id] as const,
  },
  
  // Audit Logs
  auditLogs: {
    list: (filters: Record<string, unknown>) => ['auditLogs', 'list', filters] as const,
  },
  
  referralNetworks: {
    tree: (rootUserId: string | null, depth: number) =>
      ['referralNetworks', 'tree', rootUserId ?? 'me', depth] as const,
    myNetwork: ['referralNetworks', 'myNetwork'] as const,
    list: ['referralNetworks', 'list'] as const,
  },
  
  // Dashboard (pipelineId opcional: filtra KPIs/actividad al embudo seleccionado)
  dashboard: {
    briefing: (pipelineId?: string) => ['dashboard', 'briefing', pipelineId ?? 'all'] as const,
    kpis: (pipelineId?: string) => ['dashboard', 'kpis', pipelineId ?? 'all'] as const,
    pipeline: (pipelineId?: string) => ['dashboard', 'pipeline', pipelineId ?? 'default'] as const,
    activity: (pipelineId?: string) => ['dashboard', 'activity', pipelineId ?? 'all'] as const,
    bantDistribution: (pipelineId?: string) =>
      ['dashboard', 'bantDistribution', pipelineId ?? 'all'] as const,
    topConsultants: (pipelineId?: string) =>
      ['dashboard', 'topConsultants', pipelineId ?? 'all'] as const,
    leadSources: (pipelineId?: string) => ['dashboard', 'leadSources', pipelineId ?? 'all'] as const,
  },
  
  // Search
  search: (query: string) => ['search', query] as const,
  
  // Notifications
  notifications: ['notifications'] as const,

  ai: {
    capabilities: ['ai', 'capabilities'] as const,
  },
}
