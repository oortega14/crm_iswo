import { Users } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import type { Opportunity } from '@/types'

interface OpportunityOwnershipBadgeProps {
  opportunity: Opportunity
  showLabel?: boolean
  className?: string
}

export function OpportunityOwnershipBadge({
  opportunity,
  showLabel = true,
  className,
}: OpportunityOwnershipBadgeProps) {
  if (!opportunity.from_network) return null

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge
          variant="outline"
          className={cn(
            'h-4 gap-0.5 border-indigo-500/40 bg-indigo-500/10 px-1 py-0 text-[10px] text-indigo-700 dark:text-indigo-300',
            className,
          )}
        >
          <Users className="size-2.5 shrink-0" />
          {showLabel ? 'Red' : null}
        </Badge>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs max-w-[220px]">
        {opportunity.network_read_only
          ? 'Oportunidad de tu red de referidos (solo lectura)'
          : 'Oportunidad de tu red de referidos'}
      </TooltipContent>
    </Tooltip>
  )
}
