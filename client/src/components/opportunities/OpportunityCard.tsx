import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Bell, Clock, GripVertical, Network } from 'lucide-react'
import { ContactActionButtons } from '@/components/opportunities/ContactActionButtons'
import { cn, formatCurrency, formatRelativeTime, getBantScoreColor, getInitials } from '@/lib/utils'
import { TemperatureBadge } from './TemperatureBadge'
import { Card } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useNetworkUserIds } from '@/hooks/useNetworkUserIds'
import { useTenant, useUser } from '@/stores/auth'
import type { Opportunity } from '@/types'

interface OpportunityCardProps {
  opportunity: Opportunity
  onClick: () => void
  isDragging?: boolean
}

export function OpportunityCard({
  opportunity,
  onClick,
  isDragging = false,
}: OpportunityCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: opportunity.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const currentUser = useUser()
  const tenant = useTenant()
  const networkUserIds = useNetworkUserIds()
  const ownerId = opportunity.owner?.id
  const isFromNetwork =
    ownerId !== undefined &&
    ownerId !== String(currentUser?.id) &&
    networkUserIds.has(ownerId)

  const hasReminder =
    opportunity.reminder_due_at &&
    new Date(opportunity.reminder_due_at) <= new Date(Date.now() + 24 * 60 * 60 * 1000)

  const staleDays = tenant?.settings?.stale_days ?? 7
  const isStale =
    opportunity.last_activity_at != null &&
    new Date(opportunity.last_activity_at) <
      new Date(Date.now() - staleDays * 24 * 60 * 60 * 1000)

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={cn(
        'p-2 cursor-pointer hover:shadow-md transition-shadow',
        (isDragging || isSortableDragging) && 'opacity-50 shadow-lg rotate-2',
        opportunity.status === 'lost' && 'opacity-50 grayscale-[40%] border-destructive/30',
        opportunity.status === 'won'  && 'border-green-500/40 bg-green-50/30 dark:bg-green-950/20'
      )}
      onClick={onClick}
    >
      <div className="flex items-start gap-1.5">
        {/* Drag handle */}
        <button
          className="mt-0.5 p-0.5 rounded hover:bg-muted cursor-grab active:cursor-grabbing text-muted-foreground shrink-0"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-3" />
        </button>

        <div className="flex-1 min-w-0">
          {/* Contact name */}
          <div className="flex items-start justify-between gap-1 mb-0.5">
            <h3 className="font-medium text-xs truncate leading-tight">{opportunity.contact_name}</h3>
            {hasReminder && (
              <Bell className="size-3 text-amber-500 shrink-0 animate-pulse" />
            )}
          </div>

          {/* Company */}
          {opportunity.company_name && (
            <p className="text-[10px] text-muted-foreground truncate mb-1">
              {opportunity.company_name}
            </p>
          )}

          {/* Value, BANT y Temperatura */}
          <div className="flex items-center justify-between gap-1 mb-1">
            <span className="text-xs font-mono font-medium">
              {formatCurrency(
                Number.isFinite(Number(opportunity.estimated_value))
                  ? Number(opportunity.estimated_value)
                  : 0,
                opportunity.currency
              )}
            </span>
            <div className="flex items-center gap-1">
              <TemperatureBadge temperature={opportunity.temperature ?? 'cold'} showLabel={false} />
              <Badge
                className={cn(
                  'text-[10px] font-mono px-1 py-0 h-4',
                  getBantScoreColor(
                    Number.isFinite(Number(opportunity.bant_score))
                      ? Number(opportunity.bant_score)
                      : 0
                  )
                )}
              >
                {Number.isFinite(Number(opportunity.bant_score))
                  ? Number(opportunity.bant_score)
                  : 0}
              </Badge>
            </div>
          </div>

          {(opportunity.contact_phone || opportunity.contact_email) && (
            <div className="mb-1 pt-1 border-t border-border/60">
              <ContactActionButtons
                compact
                phone={opportunity.contact_phone}
                email={opportunity.contact_email}
                stopClickPropagation
                className="justify-start"
              />
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between gap-1">
            <div className="flex items-center gap-1">
              <Avatar className="size-4">
                <AvatarImage src={opportunity.owner?.avatar_url} />
                <AvatarFallback className="text-[8px]">
                  {opportunity.owner?.name ? getInitials(opportunity.owner.name) : 'U'}
                </AvatarFallback>
              </Avatar>
              <span className="text-[10px] text-muted-foreground truncate max-w-[50px]">
                {opportunity.owner?.name?.split(' ')[0]}
              </span>
              {isFromNetwork && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-flex items-center">
                      <Network className="size-2.5 text-indigo-500" />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">
                    De tu red de referidos
                  </TooltipContent>
                </Tooltip>
              )}
            </div>

            {opportunity.last_activity_at && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span
                    className={cn(
                      'flex items-center gap-0.5 text-[10px]',
                      isStale ? 'text-amber-500' : 'text-muted-foreground'
                    )}
                  >
                    {isStale && <Clock className="size-2.5 shrink-0" />}
                    {formatRelativeTime(opportunity.last_activity_at)}
                  </span>
                </TooltipTrigger>
                {isStale && (
                  <TooltipContent side="top" className="text-xs">
                    Sin actividad hace más de {staleDays} días
                  </TooltipContent>
                )}
              </Tooltip>
            )}
          </div>
        </div>
      </div>
    </Card>
  )
}
