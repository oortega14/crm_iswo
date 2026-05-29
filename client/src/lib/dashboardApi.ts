import api from '@/lib/api'

/** Respuesta de GET /api/v1/dashboard/pipeline */
export interface DashboardPipelineStage {
  stage: string
  stage_id: string
  count: number
  value: number
  conversion_rate: number
}

/** Ítem de GET /api/v1/dashboard/activity */
export interface DashboardActivityItem {
  id: string
  type: 'reminder_due' | 'stage_change' | 'new_lead'
  user_name: string
  user_avatar?: string
  opportunity_id: string
  opportunity_name: string
  created_at: string
  old_value?: string
  new_value?: string
  source?: string
}

/** GET /api/v1/dashboard/bant_distribution */
export interface DashboardBantDistribution {
  low: number
  medium: number
  high: number
  average: number
}

/** Ítem de GET /api/v1/dashboard/top_consultants */
export interface DashboardTopConsultant {
  id: string
  name: string
  avatar_url?: string
  won_count: number
  total_value: number
}

/** GET /api/v1/dashboard/briefing */
export interface DashboardBriefingKpis {
  total_open: number
  pipeline_value: number
  currency: string
  hot_count: number
  warm_count: number
  cold_count: number
  overdue_count: number
  new_this_week: number
}

export interface DashboardBriefingHotLead {
  id: string
  title: string
  contact_name: string | null
  bant_score: number
  temperature: string
  stage_name: string | null
  estimated_value: number
  currency: string
}

export interface DashboardBriefingReminder {
  id: string
  subject: string
  remind_at: string
  opportunity_id: string | null
  opportunity_title: string | null
}

export interface DashboardBriefingStaleLead {
  id: string
  title: string
  contact_name: string | null
  last_activity_at: string | null
}

export interface DashboardBriefing {
  generated_at: string
  kpis: DashboardBriefingKpis
  hot_leads: DashboardBriefingHotLead[]
  overdue_reminders: DashboardBriefingReminder[]
  stale_leads: DashboardBriefingStaleLead[]
}

/** GET /api/v1/dashboard/kpis */
export interface DashboardKpis {
  total_in_pipeline: number
  pipeline_value: number
  month_closed_value: number
  bant_average: number
  win_rate: number | null
  won_count: number
  lost_count: number
  hot_count: number
  warm_count: number
  cold_count: number
}

/** Ítem de GET /api/v1/dashboard/lead_sources_breakdown */
export interface DashboardLeadSourceRow {
  id: string | null
  name: string
  kind: string | null
  count: number
  value: number
}

function pipelineQueryConfig(pipelineId?: string) {
  return pipelineId ? { params: { pipeline_id: pipelineId } } : {}
}

export async function fetchDashboardBriefing(pipelineId?: string): Promise<DashboardBriefing> {
  const res = await api.get<{ data: DashboardBriefing }>(
    '/dashboard/briefing',
    pipelineQueryConfig(pipelineId),
  )
  return res.data.data
}

export async function fetchDashboardKpis(pipelineId?: string): Promise<DashboardKpis> {
  const res = await api.get<{ data: DashboardKpis }>('/dashboard/kpis', pipelineQueryConfig(pipelineId))
  return res.data.data
}

export async function fetchDashboardPipeline(pipelineId?: string): Promise<DashboardPipelineStage[]> {
  const res = await api.get<{ data: DashboardPipelineStage[] }>(
    '/dashboard/pipeline',
    pipelineQueryConfig(pipelineId),
  )
  return Array.isArray(res.data.data) ? res.data.data : []
}

export async function fetchDashboardActivity(pipelineId?: string): Promise<DashboardActivityItem[]> {
  const res = await api.get<{ data: DashboardActivityItem[] }>(
    '/dashboard/activity',
    pipelineQueryConfig(pipelineId),
  )
  return Array.isArray(res.data.data) ? res.data.data : []
}

export async function fetchDashboardBantDistribution(
  pipelineId?: string,
): Promise<DashboardBantDistribution> {
  const res = await api.get<{ data: DashboardBantDistribution }>(
    '/dashboard/bant_distribution',
    pipelineQueryConfig(pipelineId),
  )
  const d = res.data.data
  if (d == null || typeof d !== 'object') {
    throw new Error('Respuesta BANT inválida')
  }
  return d
}

export async function fetchDashboardTopConsultants(
  pipelineId?: string,
): Promise<DashboardTopConsultant[]> {
  const res = await api.get<{ data: DashboardTopConsultant[] }>(
    '/dashboard/top_consultants',
    pipelineQueryConfig(pipelineId),
  )
  return Array.isArray(res.data.data) ? res.data.data : []
}

export async function fetchDashboardLeadSources(
  pipelineId?: string,
): Promise<DashboardLeadSourceRow[]> {
  const res = await api.get<{ data: DashboardLeadSourceRow[] }>(
    '/dashboard/lead_sources_breakdown',
    pipelineQueryConfig(pipelineId),
  )
  return Array.isArray(res.data.data) ? res.data.data : []
}

/** @deprecated Usa fetchDashboardPipeline(pipelineId) */
export async function fetchDashboardPipelineForId(
  pipelineId: string,
): Promise<DashboardPipelineStage[]> {
  return fetchDashboardPipeline(pipelineId)
}
