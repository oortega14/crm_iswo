import { Network, User } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { OpportunityOwnership } from '@/lib/opportunityOwnership'

interface OpportunityOwnershipBadgeProps {
  ownership: OpportunityOwnership | null
  className?: string
}

/** RFC §6.3 — indicador propia vs red en pipeline. */
export function OpportunityOwnershipBadge({ ownership, className }: OpportunityOwnershipBadgeProps) {
  if (!ownership) return null

  if (ownership === 'own') {
    return (
      <Badge
        variant="outline"
        className={cn(
          'h-4 gap-0.5 px-1.5 text-[9px] font-medium shrink-0 border-muted-foreground/30 text-muted-foreground',
          className,
        )}
      >
        <User className="size-2.5" />
        Propia
      </Badge>
    )
  }

  return (
    <Badge
      className={cn(
        'h-4 gap-0.5 px-1.5 text-[9px] font-medium shrink-0 border-indigo-500/30 bg-indigo-500/15 text-indigo-700 dark:text-indigo-300',
        className,
      )}
    >
      <Network className="size-2.5" />
      Red
    </Badge>
  )
}
