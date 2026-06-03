import api, { formatRailsError } from '@/lib/api'
import { jsonApiPrimaryList, type JsonApiResource } from '@/lib/opportunityApi'

export type ReferralTreeUser = {
  id: number
  name: string
  role: string
  active: boolean
}

export type ReferralTreeEdge = {
  referrer_id: number
  referred_id: number
  depth: number
  referred: ReferralTreeUser | null
}

export type ReferralTreePayload = {
  root: ReferralTreeUser | null
  edges: ReferralTreeEdge[]
}

export type ReferralEdgeRecord = {
  id: string
  depth: number
  active: boolean
  referrer: { id: number; name: string; email: string } | null
  referred: { id: number; name: string; email: string } | null
}

type EdgeAttributes = {
  depth?: number
  active?: boolean
  referrer?: ReferralEdgeRecord['referrer']
  referred?: ReferralEdgeRecord['referred']
}

function mapEdgeResource(resource: JsonApiResource): ReferralEdgeRecord {
  const attrs = (resource.attributes ?? {}) as EdgeAttributes
  return {
    id: String(resource.id ?? ''),
    depth: attrs.depth ?? 1,
    active: attrs.active ?? true,
    referrer: attrs.referrer ?? null,
    referred: attrs.referred ?? null,
  }
}

export async function fetchReferralTree(options: {
  rootUserId: string | null
  depth: number
}): Promise<ReferralTreePayload> {
  const response = options.rootUserId
    ? await api.get('/referral_networks/tree', {
        params: { root_user_id: options.rootUserId, depth: options.depth },
      })
    : await api.get('/referral_networks/my_network')

  const data = response.data?.data as ReferralTreePayload | undefined
  if (!data) throw new Error('Respuesta sin datos de red')
  return data
}

export async function fetchReferralNetworkList(): Promise<ReferralEdgeRecord[]> {
  const response = await api.get('/referral_networks')
  return jsonApiPrimaryList(response.data).map(mapEdgeResource)
}

export async function createReferralEdge(referrerId: string, referredId: string): Promise<void> {
  await api.post('/referral_networks', {
    referral_network: { referrer_user_id: referrerId, referred_user_id: referredId, depth: 1 },
  })
}

export async function deleteReferralEdge(edgeId: string): Promise<void> {
  await api.delete(`/referral_networks/${edgeId}`)
}

export async function setReferralEdgeActive(edgeId: string, active: boolean): Promise<void> {
  await api.patch(`/referral_networks/${edgeId}`, { referral_network: { active } })
}

export function referralNetworkErrorMessage(err: unknown): string {
  return formatRailsError(err, 'Error al cargar la red de referidos')
}
