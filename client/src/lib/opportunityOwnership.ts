import type { Opportunity } from '@/types'

export type OpportunityOwnershipFilter = 'all' | 'own' | 'network'

export function isOwnOpportunity(
  opp: Opportunity,
  userId?: string | null,
): boolean {
  if (!userId) return false
  const ownerId = opp.owner_id ?? opp.owner?.id
  return String(ownerId ?? '') === String(userId)
}

export function isNetworkOpportunity(opp: Opportunity): boolean {
  return opp.from_network === true
}

export function matchesOwnershipFilter(
  opp: Opportunity,
  filter: OpportunityOwnershipFilter,
  userId?: string | null,
): boolean {
  if (filter === 'all') return true
  if (filter === 'own') return isOwnOpportunity(opp, userId)
  if (filter === 'network') return isNetworkOpportunity(opp)
  return true
}

export function countOpportunitiesByOwnership(
  opportunities: Opportunity[],
  userId?: string | null,
): { all: number; own: number; network: number } {
  let own = 0
  let network = 0
  for (const o of opportunities) {
    if (isOwnOpportunity(o, userId)) own++
    if (isNetworkOpportunity(o)) network++
  }
  return { all: opportunities.length, own, network }
}
