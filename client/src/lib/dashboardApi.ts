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

/** GET /api/v1/dashboard/kpis */
export interface DashboardKpis {
  total_in_pipeline: number
  pipeline_value: number
  month_closed_value: number
  bant_average: number
}

export async function fetchDashboardKpis(): Promise<DashboardKpis> {
  const res = await api.get<{ data: DashboardKpis }>('/dashboard/kpis')
  return res.data.data
}

export async function fetchDashboardPipeline(): Promise<DashboardPipelineStage[]> {
  const res = await api.get<{ data: DashboardPipelineStage[] }>('/dashboard/pipeline')
  return Array.isArray(res.data.data) ? res.data.data : []
}

export async function fetchDashboardActivity(): Promise<DashboardActivityItem[]> {
  const res = await api.get<{ data: DashboardActivityItem[] }>('/dashboard/activity')
  return Array.isArray(res.data.data) ? res.data.data : []
}

export async function fetchDashboardBantDistribution(): Promise<DashboardBantDistribution> {
  const res = await api.get<{ data: DashboardBantDistribution }>('/dashboard/bant_distribution')
  const d = res.data.data
  if (d == null || typeof d !== 'object') {
    throw new Error('Respuesta BANT inválida')
  }
  return d
}

export async function fetchDashboardTopConsultants(): Promise<DashboardTopConsultant[]> {
  const res = await api.get<{ data: DashboardTopConsultant[] }>('/dashboard/top_consultants')
  return Array.isArray(res.data.data) ? res.data.data : []
}
