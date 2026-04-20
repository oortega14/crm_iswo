import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Bell, GripVertical } from 'lucide-react'
import { cn, formatCurrency, formatRelativeTime, getBantScoreColor, getInitials } from '@/lib/utils'
import { Card } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
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

  const hasReminder =
    opportunity.reminder_due_at &&
    new Date(opportunity.reminder_due_at) <= new Date(Date.now() + 24 * 60 * 60 * 1000)

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={cn(
        'p-3 cursor-pointer hover:shadow-md transition-shadow',
        (isDragging || isSortableDragging) && 'opacity-50 shadow-lg rotate-2'
      )}
      onClick={onClick}
    >
      <div className="flex items-start gap-2">
        {/* Drag handle */}
        <button
          className="mt-0.5 p-0.5 rounded hover:bg-muted cursor-grab active:cursor-grabbing text-muted-foreground"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-4" />
        </button>

        <div className="flex-1 min-w-0">
          {/* Contact name */}
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="font-medium text-sm truncate">{opportunity.contact_name}</h3>
            {hasReminder && (
              <Bell className="size-3.5 text-amber-500 shrink-0 animate-pulse" />
            )}
          </div>

          {/* Company */}
          {opportunity.company_name && (
            <p className="text-xs text-muted-foreground truncate mb-2">
              {opportunity.company_name}
            </p>
          )}

          {/* Value and BANT */}
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-sm font-mono font-medium">
              {formatCurrency(opportunity.estimated_value, opportunity.currency)}
            </span>
            <Badge
              className={cn(
                'text-xs font-mono px-1.5 py-0',
                getBantScoreColor(opportunity.bant_score)
              )}
            >
              {opportunity.bant_score}
            </Badge>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between gap-2">
            {/* Owner */}
            <div className="flex items-center gap-1.5">
              <Avatar className="size-5">
                <AvatarImage src={opportunity.owner?.avatar_url} />
                <AvatarFallback className="text-[9px]">
                  {opportunity.owner?.name ? getInitials(opportunity.owner.name) : 'U'}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs text-muted-foreground truncate max-w-[80px]">
                {opportunity.owner?.name?.split(' ')[0]}
              </span>
            </div>

            {/* Last activity */}
            {opportunity.last_activity_at && (
              <span className="text-[10px] text-muted-foreground">
                {formatRelativeTime(opportunity.last_activity_at)}
              </span>
            )}
          </div>
        </div>
      </div>
    </Card>
  )
}
