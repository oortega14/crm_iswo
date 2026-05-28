import type {
  Opportunity,
  OpportunityStatus,
  LeadSource,
  LeadSourceKind,
  Pipeline,
  PipelineStage,
  User,
  UserRole,
} from '@/types'

/** JSON:API recurso genérico del backend */
export type JsonApiResource = {
  id: string
  type?: string
  attributes?: Record<string, unknown>
  relationships?: Record<string, { data: { id: string; type?: string } | null }>
}

/** Normaliza `response.data` de Axios (lista o un solo recurso). */
export function jsonApiPrimaryList(body: unknown): JsonApiResource[] {
  if (!body || typeof body !== 'object') return []
  const data = (body as { data?: unknown }).data
  if (data == null) return []
  if (Array.isArray(data)) return data as JsonApiResource[]
  return [data as JsonApiResource]
}

export function jsonApiPrimaryOne(body: unknown): JsonApiResource | null {
  const list = jsonApiPrimaryList(body)
  return list[0] ?? null
}

/** Recursos JSON:API en `included` (p. ej. usuarios al incluir `owner_user`). */
export function jsonApiIncluded(body: unknown): JsonApiResource[] {
  if (!body || typeof body !== 'object') return []
  const inc = (body as { included?: unknown }).included
  if (!Array.isArray(inc)) return []
  return inc as JsonApiResource[]
}

/** Mapea un recurso JSON:API `user` a nuestro tipo de dominio. */
export function mapUserResource(resource: JsonApiResource): User {
  const a = resource.attributes ?? {}
  const fromParts = [a.first_name, a.last_name]
    .filter((x): x is string => typeof x === 'string' && x.length > 0)
    .join(' ')
  const fullName =
    (typeof a.full_name === 'string' && a.full_name.trim()) ||
    (typeof a.name === 'string' && a.name.trim()) ||
    fromParts ||
    String(a.email ?? '')
  const rawRole = typeof a.role === 'string' ? a.role : ''
  const role: UserRole =
    rawRole === 'admin' || rawRole === 'manager' || rawRole === 'consultant' || rawRole === 'viewer'
      ? rawRole
      : 'consultant'
  return {
    id: String(resource.id ?? ''),
    email: String(a.email ?? ''),
    name: fullName || String(a.email ?? ''),
    role,
    avatar_url: a.avatar_url != null && a.avatar_url !== '' ? String(a.avatar_url) : undefined,
    active: Boolean(a.active ?? true),
    last_sign_in_at: a.last_sign_in_at != null ? String(a.last_sign_in_at) : undefined,
    created_at: String(a.created_at ?? ''),
    updated_at: String(a.updated_at ?? ''),
  }
}

function normalizeEmbeddedStage(s: Record<string, unknown>, index: number): PipelineStage {
  const pos = Number(s.position)
  const prob = Number(s.probability)
  return {
    id: String(s.id ?? ''),
    pipeline_id: String(s.pipeline_id ?? ''),
    name: String(s.name ?? ''),
    position: Number.isFinite(pos) ? Math.floor(pos) : index,
    probability: Number.isFinite(prob) ? Math.min(100, Math.max(0, Math.floor(prob))) : 0,
    is_closed_won: Boolean(s.is_closed_won ?? s.closed_won),
    is_closed_lost: Boolean(s.is_closed_lost ?? s.closed_lost),
    color: s.color != null ? String(s.color) : undefined,
  }
}

export function mapPipelineResource(resource: JsonApiResource): Pipeline {
  const a = resource.attributes ?? {}
  const raw = (a.stages as Record<string, unknown>[] | undefined) ?? []
  const stages = raw.map((row, i) => normalizeEmbeddedStage(row, i))
  return {
    id: String(resource.id ?? ''),
    name: String(a.name ?? ''),
    description: a.description != null ? String(a.description) : undefined,
    is_default: Boolean(a.is_default),
    active: a.active !== false,
    stages,
    created_at: String(a.created_at ?? ''),
    updated_at: String(a.updated_at ?? ''),
  }
}

/** Convierte score BANT 0–100 del API a pasos 0–25 del slider del SPA. */
function bantDimScore01ToSlider(score01: unknown): number {
  const n = typeof score01 === 'number' ? score01 : Number(score01)
  if (!Number.isFinite(n)) return 0
  return Math.min(25, Math.max(0, Math.round((n * 25) / 100)))
}

function mapBantSlidersFromApi(a: Record<string, unknown>): {
  bant_budget: number
  bant_authority: number
  bant_need: number
  bant_timeline: number
} {
  const raw = a.bant_data
  const bd =
    raw != null && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {}
  const pick = (key: string) => {
    const block = bd[key]
    if (block != null && typeof block === 'object' && !Array.isArray(block)) {
      return bantDimScore01ToSlider((block as Record<string, unknown>).score)
    }
    return 0
  }
  return {
    bant_budget: pick('budget'),
    bant_authority: pick('authority'),
    bant_need: pick('need'),
    bant_timeline: pick('timeline'),
  }
}

function resolveOpportunityOwner(
  resource: JsonApiResource,
  included: JsonApiResource[],
): User | undefined {
  const a = resource.attributes ?? {}
  const ownerAttr = a.owner as
    | { id?: string; name?: string; avatar_url?: string; email?: string }
    | undefined

  if (ownerAttr?.id) {
    return {
      id: String(ownerAttr.id),
      email: String(ownerAttr.email ?? ''),
      name: String(ownerAttr.name ?? ''),
      role: 'consultant',
      active: true,
      avatar_url: ownerAttr.avatar_url,
      created_at: '',
      updated_at: '',
    }
  }

  const rel = resource.relationships?.owner_user?.data as { id?: string; type?: string } | null
  const rid = rel?.id != null ? String(rel.id) : ''
  if (!rid) return undefined

  const inc = included.find(
    (r) =>
      String(r.id) === rid &&
      (r.type === 'user' || r.type === 'users' || String(r.type ?? '').toLowerCase() === 'user'),
  )
  if (inc) return mapUserResource(inc)

  return {
    id: rid,
    email: '',
    name: 'Usuario',
    role: 'consultant',
    active: true,
    created_at: '',
    updated_at: '',
  }
}

export function mapOpportunityResource(resource: JsonApiResource, included: JsonApiResource[] = []): Opportunity {
  const a = resource.attributes ?? {}
  const relStage   = resource.relationships?.pipeline_stage?.data as { id?: string } | null
  const relPipe    = resource.relationships?.pipeline?.data    as { id?: string } | null
  const relContact = resource.relationships?.contact?.data     as { id?: string } | null

  const stageId = String(a.pipeline_stage_id ?? relStage?.id ?? '')
  const pipelineId = String(a.pipeline_id ?? relPipe?.id ?? '')

  const owner = resolveOpportunityOwner(resource, included)

  const est = a.estimated_value
  let estimatedValue =
    typeof est === 'number' ? est : est != null ? Number(est) : 0
  if (!Number.isFinite(estimatedValue)) estimatedValue = 0

  const bs = a.bant_score
  let bantScore = typeof bs === 'number' ? bs : bs != null ? Number(bs) : 0
  if (!Number.isFinite(bantScore)) bantScore = 0

  const pos = a.stage_position
  const prob = a.probability
  const stagePosition = typeof pos === 'number' ? pos : pos != null ? Number(pos) : 0
  const probability = typeof prob === 'number' ? prob : prob != null ? Number(prob) : 0

  const stageName =
    typeof a.stage_name === 'string' && a.stage_name.trim() ? String(a.stage_name) : undefined

  const stage: PipelineStage | undefined =
    stageId && stageName
      ? {
          id: stageId,
          pipeline_id: pipelineId,
          name: stageName,
          position: Number.isFinite(stagePosition) ? Math.floor(stagePosition) : 0,
          probability: Number.isFinite(probability)
            ? Math.min(100, Math.max(0, Math.floor(probability)))
            : 0,
          is_closed_won: false,
          is_closed_lost: false,
        }
      : undefined

  const bantBars = mapBantSlidersFromApi(a)

  const relSource = resource.relationships?.lead_source?.data as { id?: string } | null
  const sourceId = relSource?.id != null ? String(relSource.id) : undefined
  const sourceInc = sourceId
    ? included.find((r) => String(r.id) === sourceId && String(r.type ?? '').toLowerCase() === 'lead_source')
    : undefined
  const source: LeadSource | undefined = sourceInc
    ? {
        id: String(sourceInc.id),
        name: String(sourceInc.attributes?.name ?? ''),
        kind: String(sourceInc.attributes?.kind ?? 'manual') as LeadSourceKind,
        active: Boolean(sourceInc.attributes?.active ?? true),
        opportunities_count: Number(sourceInc.attributes?.opportunities_count ?? 0),
        created_at: String(sourceInc.attributes?.created_at ?? ''),
      }
    : undefined

  return {
    id: String(resource.id ?? ''),
    contact_id: relContact?.id ? String(relContact.id) : undefined,
    contact_name: String(a.contact_name ?? a.title ?? 'Sin nombre'),
    contact_email: a.contact_email != null ? String(a.contact_email) : undefined,
    contact_phone: a.contact_phone != null ? String(a.contact_phone) : undefined,
    company_name: a.company_name != null ? String(a.company_name) : undefined,
    estimated_value: estimatedValue,
    currency: String(a.currency ?? 'COP'),
    stage_id: stageId,
    stage,
    pipeline_id: pipelineId,
    owner_id: owner?.id ?? '',
    owner,
    bant_budget: bantBars.bant_budget,
    bant_authority: bantBars.bant_authority,
    bant_need: bantBars.bant_need,
    bant_timeline: bantBars.bant_timeline,
    bant_score: bantScore,
    source_id: sourceId,
    source,
    status: (a.status as OpportunityStatus) ?? 'new_lead',
    temperature: (a.temperature as import('@/types').OpportunityTemperature) || 'cold',
    qualified: a.qualified != null ? Boolean(a.qualified) : undefined,
    notes: a.notes != null ? String(a.notes) : undefined,
    last_activity_at: a.last_activity_at != null ? String(a.last_activity_at) : undefined,
    expected_close_on: a.expected_close_on != null ? String(a.expected_close_on) : undefined,
    reminder_due_at: a.reminder_due_at != null ? String(a.reminder_due_at) : undefined,
    custom_fields: a.custom_fields != null && typeof a.custom_fields === 'object'
      ? (a.custom_fields as Record<string, unknown>)
      : undefined,
    created_at: String(a.created_at ?? ''),
    updated_at: String(a.updated_at ?? ''),
  }
}

/** Recordatorio anidado en oportunidad (JSON:API `reminder`). */
export type OpportunityReminderRow = {
  id: string
  subject: string
  message: string
  remind_at: string
  channel: string
  status: string
}

export function mapOpportunityReminderResource(resource: JsonApiResource): OpportunityReminderRow {
  const a = resource.attributes ?? {}
  const title =
    (typeof a.title === 'string' && a.title) ||
    (typeof a.subject === 'string' && a.subject) ||
    'Recordatorio'
  const body =
    (typeof a.body === 'string' && a.body) ||
    (typeof a.message === 'string' && a.message) ||
    ''
  return {
    id: String(resource.id ?? ''),
    subject: title,
    message: body,
    remind_at: String(a.remind_at ?? ''),
    channel: String(a.channel ?? 'in_app'),
    status: String(a.status ?? 'pending'),
  }
}

/** Mapea un recurso JSON:API `opportunity_log` a nuestro tipo de dominio. */
export function mapOpportunityLogResource(
  resource: JsonApiResource,
  included: JsonApiResource[] = [],
): import('@/types').OpportunityLog {
  const a = resource.attributes ?? {}
  const rel = resource.relationships?.user?.data as { id?: string; type?: string } | null
  const userId = rel?.id ? String(rel.id) : ''
  const userInc = userId
    ? included.find(
        (r) =>
          String(r.id) === userId &&
          (r.type === 'user' || r.type === 'users'),
      )
    : undefined

  const rawChanges = a.changes_data
  const changes_data =
    rawChanges != null && typeof rawChanges === 'object' && !Array.isArray(rawChanges)
      ? (rawChanges as Record<string, { from: unknown; to: unknown }>)
      : undefined

  return {
    id: String(resource.id ?? ''),
    action: String(a.action ?? ''),
    changes_data,
    note: a.note != null && a.note !== '' ? String(a.note) : undefined,
    author_name: a.author_name != null ? String(a.author_name) : undefined,
    user: userInc ? mapUserResource(userInc) : undefined,
    created_at: String(a.created_at ?? ''),
  }
}

/** PATCH /opportunities/:id — solo claves que el API permite */
export function toOpportunityUpdatePayload(
  patch: Partial<Opportunity> & {
    bant_data?: Record<string, { score?: number; answer?: string } | unknown>
  },
): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  if (patch.notes !== undefined) out.notes = patch.notes
  if (patch.estimated_value !== undefined) out.estimated_value = patch.estimated_value
  if (patch.status !== undefined) out.status = patch.status
  if (patch.temperature !== undefined) out.temperature = patch.temperature
  if (patch.qualified !== undefined) out.qualified = patch.qualified
  if (patch.stage_id !== undefined) out.pipeline_stage_id = patch.stage_id
  if (patch.source_id !== undefined) out.lead_source_id = patch.source_id || null
  if (patch.expected_close_on !== undefined) out.expected_close_on = patch.expected_close_on || null
  if (patch.bant_score !== undefined) out.bant_score = patch.bant_score
  if (patch.bant_data !== undefined) out.bant_data = patch.bant_data
  if (patch.custom_fields !== undefined) out.custom_fields = patch.custom_fields
  return out
}
