import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { ArrowRight, Bell, Clock } from 'lucide-react'
import { ContactActionButtons } from '@/components/opportunities/ContactActionButtons'
import { cn, formatCurrency, formatRelativeTime, getBantScoreColor, getInitials } from '@/lib/utils'
import { TemperatureBadge } from './TemperatureBadge'
import { Card } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useNetworkUserIds } from '@/hooks/useNetworkUserIds'
import {
  getOpportunityOwnership,
  ownershipCardClassName,
} from '@/lib/opportunityOwnership'
import { OpportunityOwnershipBadge } from '@/components/opportunities/OpportunityOwnershipBadge'
import { useTenant, useUser, useUserRole } from '@/stores/auth'
import type { Opportunity, PipelineStage } from '@/types'

interface OpportunityCardProps {
  opportunity: Opportunity
  onClick: () => void
  isDragging?: boolean
  /** Sin permiso de edición (p. ej. oportunidad de la red para un consultor). */
  dragDisabled?: boolean
  stages?: PipelineStage[]
  onMoveStage?: (stageId: string) => void
  moveStagePending?: boolean
}

export function OpportunityCard({
  opportunity,
  onClick,
  isDragging = false,
  dragDisabled = false,
  stages,
  onMoveStage,
  moveStagePending = false,
}: OpportunityCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging: isDraggableActive,
  } = useDraggable({
    id: opportunity.id,
    disabled: dragDisabled || isDragging,
  })

  const style = transform
    ? { transform: CSS.Translate.toString(transform) }
    : undefined

  const currentUser = useUser()
  const role = useUserRole()
  const tenant = useTenant()
  const networkUserIds = useNetworkUserIds()
  const ownership = getOpportunityOwnership(
    opportunity,
    currentUser?.id,
    networkUserIds,
    role,
  )

  const hasReminder =
    opportunity.reminder_due_at &&
    new Date(opportunity.reminder_due_at) <= new Date(Date.now() + 24 * 60 * 60 * 1000)

  const staleDays = tenant?.settings?.stale_days ?? 7
  const isStale =
    opportunity.last_activity_at != null &&
    new Date(opportunity.last_activity_at) <
      new Date(Date.now() - staleDays * 24 * 60 * 60 * 1000)

  const canMoveStage =
    !dragDisabled && stages && stages.length > 0 && onMoveStage != null

  const handleCardClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('[data-no-drag]')) return
    onClick()
  }

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={cn(
        'p-2 hover:shadow-md transition-shadow select-none',
        !dragDisabled && 'cursor-grab active:cursor-grabbing',
        dragDisabled && 'cursor-pointer',
        (isDragging || isDraggableActive) && 'opacity-40 shadow-lg',
        opportunity.status === 'lost' && 'opacity-50 grayscale-[40%] border-destructive/30',
        opportunity.status === 'won' && 'border-green-500/40 bg-green-50/30 dark:bg-green-950/20',
        ownershipCardClassName(ownership),
      )}
      onClick={handleCardClick}
      {...(!dragDisabled ? { ...attributes, ...listeners } : {})}
    >
      <div className="flex flex-col gap-1 min-w-0">
        {/* Contact name */}
        <div className="flex items-start justify-between gap-1">
          <h3 className="font-medium text-xs truncate leading-tight flex-1 min-w-0">
            {opportunity.contact_name}
          </h3>
          <div className="flex items-center gap-0.5 shrink-0">
            <OpportunityOwnershipBadge ownership={ownership} />
            {hasReminder && (
              <Bell className="size-3 text-amber-500 shrink-0 animate-pulse" />
            )}
          </div>
        </div>

        {/* Company */}
        {opportunity.company_name && (
          <p className="text-[10px] text-muted-foreground truncate">
            {opportunity.company_name}
          </p>
        )}

        {/* Value, BANT y Temperatura */}
        <div className="flex items-center justify-between gap-1">
          <span className="text-xs font-mono font-medium">
            {formatCurrency(
              Number.isFinite(Number(opportunity.estimated_value))
                ? Number(opportunity.estimated_value)
                : 0,
              opportunity.currency,
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
                    : 0,
                ),
              )}
            >
              {Number.isFinite(Number(opportunity.bant_score))
                ? Number(opportunity.bant_score)
                : 0}
            </Badge>
          </div>
        </div>

        {(opportunity.contact_phone || opportunity.contact_email) && (
          <div className="pt-1 border-t border-border/60" data-no-drag>
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
          <div className="flex items-center gap-1 min-w-0">
            <Avatar className="size-4 shrink-0">
              <AvatarImage src={opportunity.owner?.avatar_url} />
              <AvatarFallback className="text-[8px]">
                {opportunity.owner?.name ? getInitials(opportunity.owner.name) : 'U'}
              </AvatarFallback>
            </Avatar>
            <span className="text-[10px] text-muted-foreground truncate max-w-[50px]">
              {opportunity.owner?.name?.split(' ')[0]}
            </span>
          </div>

          {opportunity.last_activity_at && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span
                  className={cn(
                    'flex items-center gap-0.5 text-[10px] shrink-0',
                    isStale ? 'text-amber-500' : 'text-muted-foreground',
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

        {canMoveStage && (
          <div
            className="pt-1 border-t border-border/60"
            data-no-drag
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            <Select
              value={opportunity.stage_id || undefined}
              onValueChange={(stageId) => {
                if (stageId !== opportunity.stage_id) onMoveStage(stageId)
              }}
              disabled={moveStagePending}
            >
              <SelectTrigger
                className="h-7 w-full text-[10px] gap-1 px-2 border-dashed bg-muted/30 hover:bg-muted/60"
                aria-label="Mover a otra etapa"
              >
                <ArrowRight className="size-3 shrink-0 text-muted-foreground" />
                <SelectValue placeholder="Mover etapa…" />
              </SelectTrigger>
              <SelectContent>
                {stages.map((s) => (
                  <SelectItem key={s.id} value={s.id} className="text-xs">
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
    </Card>
  )
}
