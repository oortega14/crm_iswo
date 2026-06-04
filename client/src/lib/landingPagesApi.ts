import api, { formatRailsError } from '@/lib/api'
import { jsonApiPrimaryList, jsonApiPrimaryOne, type JsonApiResource } from '@/lib/opportunityApi'

export type LandingPageStatus = 'draft' | 'published'

export interface LandingPageSummary {
  id: string
  title: string
  slug: string
  description: string
  publicUrl: string
  status: LandingPageStatus
  views: number
  leads: number
  conversionRate: number
  createdAt: string
  updatedAt: string
}

export interface LandingPageIndexItem {
  id: string
  title: string
  slug: string
}

export interface LandingMetrics {
  view_count: number
  lead_count: number
  conversion_rate: number
  period_days: number
  daily_leads: { date: string; count: number }[]
  top_utm_sources: { source: string; count: number }[]
}

export type CreateLandingInput = {
  title: string
  slug: string
  description?: string
}

export function mapLandingPageResource(resource: JsonApiResource): LandingPageSummary | null {
  if (!resource.id) return null
  const a = resource.attributes ?? {}

  const title = String(a.title ?? '').trim()
  const slug = String(a.slug ?? '').trim()
  if (!title || !slug) return null

  const views = Number(a.view_count ?? 0)
  const leads = Number(a.lead_count ?? 0)
  const conversionRate = views > 0 ? Number(((leads / views) * 100).toFixed(1)) : 0

  return {
    id: String(resource.id),
    title,
    slug,
    description: String(a.seo_description ?? ''),
    publicUrl: String(a.public_url ?? ''),
    status: a.published ? 'published' : 'draft',
    views: Number.isFinite(views) ? views : 0,
    leads: Number.isFinite(leads) ? leads : 0,
    conversionRate,
    createdAt: String(a.created_at ?? new Date().toISOString()),
    updatedAt: String(a.updated_at ?? new Date().toISOString()),
  }
}

export function mapLandingIndexItem(resource: JsonApiResource): LandingPageIndexItem | null {
  if (!resource.id) return null
  return {
    id: String(resource.id),
    title: String(resource.attributes?.title ?? 'Landing'),
    slug: String(resource.attributes?.slug ?? ''),
  }
}

function dedupeLandingsById(items: LandingPageSummary[]): LandingPageSummary[] {
  const seen = new Set<string>()
  return items.filter((row) => {
    if (seen.has(row.id)) return false
    seen.add(row.id)
    return true
  })
}

export async function fetchLandingPagesList(): Promise<LandingPageSummary[]> {
  const response = await api.get('/landing_pages', { params: { page: 1, items: 100 } })
  const rows = jsonApiPrimaryList(response.data)
    .map(mapLandingPageResource)
    .filter((x): x is LandingPageSummary => x !== null)
  return dedupeLandingsById(rows)
}

export async function fetchLandingPagesIndex(): Promise<LandingPageIndexItem[]> {
  const response = await api.get('/landing_pages', { params: { page: 1, items: 100 } })
  return jsonApiPrimaryList(response.data)
    .map(mapLandingIndexItem)
    .filter((x): x is LandingPageIndexItem => x !== null)
}

export async function fetchLandingPageDetail(id: string): Promise<JsonApiResource | null> {
  const response = await api.get(`/landing_pages/${id}`)
  return jsonApiPrimaryOne(response.data)
}

export async function createLandingPage(input: CreateLandingInput): Promise<void> {
  await api.post('/landing_pages', {
    landing_page: {
      title: input.title.trim(),
      slug: input.slug.trim(),
      seo_description: input.description?.trim() || undefined,
      published: false,
      content: {},
      styles: {},
    },
  })
}

export async function updateLandingPage(
  id: string,
  payload: {
    content: Record<string, unknown>
    styles: Record<string, unknown>
  },
): Promise<void> {
  await api.patch(`/landing_pages/${id}`, { landing_page: payload })
}

export async function publishLandingPage(id: string): Promise<void> {
  await api.post(`/landing_pages/${id}/publish`)
}

export async function unpublishLandingPage(id: string): Promise<void> {
  await api.post(`/landing_pages/${id}/unpublish`)
}

export async function duplicateLandingPage(id: string): Promise<void> {
  await api.post(`/landing_pages/${id}/duplicate`)
}

export async function deleteLandingPage(id: string): Promise<void> {
  await api.delete(`/landing_pages/${id}`)
}

export async function fetchLandingPageMetrics(
  id: string,
  days = 30,
): Promise<LandingMetrics> {
  const response = await api.get<{ data: LandingMetrics }>(`/landing_pages/${id}/metrics`, {
    params: { days },
  })
  return response.data.data
}

export function landingPagesErrorMessage(err: unknown): string {
  return formatRailsError(err, 'Error al cargar landing pages')
}
