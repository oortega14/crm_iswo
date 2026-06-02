import type { Opportunity, UserRole } from '@/types'

/** RFC §6.3: propia vs red de referidos (solo consultor). */
export type OpportunityOwnership = 'own' | 'network'

export type OpportunityOwnershipFilter = 'all' | OpportunityOwnership

export function getOpportunityOwnership(
  opportunity: Pick<Opportunity, 'owner_id' | 'owner'>,
  currentUserId: string | undefined,
  networkUserIds: Set<string>,
  role: UserRole | undefined,
): OpportunityOwnership | null {
  if (role !== 'consultant' || !currentUserId) return null

  const ownerId = String(opportunity.owner_id ?? opportunity.owner?.id ?? '')
  if (!ownerId) return null
  if (ownerId === String(currentUserId)) return 'own'
  if (networkUserIds.has(ownerId)) return 'network'
  return null
}

export function matchesOwnershipFilter(
  opportunity: Pick<Opportunity, 'owner_id' | 'owner'>,
  filter: OpportunityOwnershipFilter | undefined,
  currentUserId: string | undefined,
  networkUserIds: Set<string>,
  role: UserRole | undefined,
): boolean {
  if (role !== 'consultant' || !filter || filter === 'all') return true

  const ownership = getOpportunityOwnership(
    opportunity,
    currentUserId,
    networkUserIds,
    role,
  )
  return ownership === filter
}

export function countOpportunitiesByOwnership(
  opportunities: Opportunity[],
  currentUserId: string | undefined,
  networkUserIds: Set<string>,
  role: UserRole | undefined,
): { all: number; own: number; network: number } {
  let own = 0
  let network = 0
  for (const opp of opportunities) {
    const o = getOpportunityOwnership(opp, currentUserId, networkUserIds, role)
    if (o === 'own') own += 1
    if (o === 'network') network += 1
  }
  return { all: opportunities.length, own, network }
}

export const ownershipRowClassName = (ownership: OpportunityOwnership | null): string => {
  if (ownership === 'network') {
    return 'border-l-2 border-l-indigo-500 bg-indigo-50/30 dark:bg-indigo-950/20'
  }
  if (ownership === 'own') {
    return 'border-l-2 border-l-border'
  }
  return ''
}

export const ownershipCardClassName = (ownership: OpportunityOwnership | null): string => {
  if (ownership === 'network') {
    return 'border-indigo-400/55 bg-indigo-50/35 dark:bg-indigo-950/25 ring-1 ring-indigo-500/15'
  }
  if (ownership === 'own') {
    return 'border-border/80'
  }
  return ''
}
