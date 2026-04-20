import { formatRelativeTime, getInitials, formatStatusLabel } from '@/lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import type { OpportunityLog } from '@/types'

interface ActivityLogProps {
  logs: OpportunityLog[]
}

export function ActivityLog({ logs }: ActivityLogProps) {
  if (logs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <p className="text-sm text-muted-foreground">
          No hay actividad registrada
        </p>
      </div>
    )
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-4">
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />

          {/* Log entries */}
          <div className="flex flex-col gap-6">
            {logs.map((log) => (
              <div key={log.id} className="relative flex gap-4 pl-10">
                {/* Avatar on timeline */}
                <div className="absolute left-0 flex items-center justify-center">
                  <Avatar className="size-8 border-2 border-background">
                    <AvatarImage src={log.user?.avatar_url} />
                    <AvatarFallback className="text-xs">
                      {log.user?.name ? getInitials(log.user.name) : 'S'}
                    </AvatarFallback>
                  </Avatar>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">
                      {log.user?.name || 'Sistema'}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatRelativeTime(log.created_at)}
                    </span>
                  </div>

                  <p className="text-sm text-muted-foreground mb-2">{log.action}</p>

                  {/* Changes */}
                  {log.changes && Object.keys(log.changes).length > 0 && (
                    <div className="rounded-md bg-muted/50 p-2 text-xs">
                      {Object.entries(log.changes).map(([key, change]) => (
                        <div key={key} className="flex items-center gap-2">
                          <span className="text-muted-foreground capitalize">
                            {key.replace(/_/g, ' ')}:
                          </span>
                          <Badge variant="outline" className="text-[10px] px-1.5">
                            {formatValue(change.old)}
                          </Badge>
                          <span className="text-muted-foreground">→</span>
                          <Badge variant="secondary" className="text-[10px] px-1.5">
                            {formatValue(change.new)}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </ScrollArea>
  )
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '-'
  if (typeof value === 'boolean') return value ? 'Sí' : 'No'
  if (typeof value === 'string') {
    // Check if it's a status
    const formatted = formatStatusLabel(value)
    if (formatted !== value) return formatted
    return value
  }
  if (typeof value === 'number') return value.toString()
  return String(value)
}
