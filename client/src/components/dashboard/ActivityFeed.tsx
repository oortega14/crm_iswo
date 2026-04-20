import { useNavigate } from '@tanstack/react-router'
import { Bell, ArrowRight, UserPlus, Target } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { formatRelativeTime, getInitials, formatStatusLabel } from '@/lib/utils'

type ActivityType = 'reminder_due' | 'stage_change' | 'new_lead'

interface ActivityItem {
  id: string
  type: ActivityType
  user_name: string
  user_avatar?: string
  opportunity_id: string
  opportunity_name: string
  old_value?: string
  new_value?: string
  source?: string
  created_at: string
}

interface ActivityFeedProps {
  data?: ActivityItem[]
}

// Mock data for demo
const mockData: ActivityItem[] = [
  {
    id: '1',
    type: 'reminder_due',
    user_name: 'Juliana Rodríguez',
    opportunity_id: '1',
    opportunity_name: 'Proyecto Casa Verde',
    created_at: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
  },
  {
    id: '2',
    type: 'stage_change',
    user_name: 'Carlos Méndez',
    opportunity_id: '2',
    opportunity_name: 'Apartamento Centro',
    old_value: 'contacted',
    new_value: 'qualified',
    created_at: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
  },
  {
    id: '3',
    type: 'new_lead',
    user_name: 'Sistema',
    opportunity_id: '3',
    opportunity_name: 'María García',
    source: 'Meta Ads',
    created_at: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
  },
  {
    id: '4',
    type: 'stage_change',
    user_name: 'Ana Martínez',
    opportunity_id: '4',
    opportunity_name: 'Oficina Empresarial',
    old_value: 'new_lead',
    new_value: 'contacted',
    created_at: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
  },
]

const getActivityIcon = (type: ActivityType) => {
  switch (type) {
    case 'reminder_due':
      return Bell
    case 'stage_change':
      return ArrowRight
    case 'new_lead':
      return UserPlus
    default:
      return Target
  }
}

const getActivityMessage = (item: ActivityItem) => {
  switch (item.type) {
    case 'reminder_due':
      return (
        <>
          Recordatorio pendiente para{' '}
          <span className="font-medium">{item.opportunity_name}</span>
        </>
      )
    case 'stage_change':
      return (
        <>
          <span className="font-medium">{item.opportunity_name}</span>
          {' cambió de '}
          <Badge variant="outline" className="mx-1 text-xs">
            {formatStatusLabel(item.old_value || '')}
          </Badge>
          {' a '}
          <Badge variant="secondary" className="mx-1 text-xs">
            {formatStatusLabel(item.new_value || '')}
          </Badge>
        </>
      )
    case 'new_lead':
      return (
        <>
          Nuevo lead{' '}
          <span className="font-medium">{item.opportunity_name}</span>
          {item.source && (
            <span className="text-muted-foreground"> desde {item.source}</span>
          )}
        </>
      )
    default:
      return item.opportunity_name
  }
}

export function ActivityFeed({ data = mockData }: ActivityFeedProps) {
  const navigate = useNavigate()

  const handleActivityClick = (opportunityId: string) => {
    navigate({ to: '/opportunities', search: { selected: opportunityId } })
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium">Mi actividad de hoy</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[280px]">
          <div className="flex flex-col">
            {data.map((item) => {
              const Icon = getActivityIcon(item.type)
              return (
                <button
                  key={item.id}
                  onClick={() => handleActivityClick(item.opportunity_id)}
                  className="flex items-start gap-3 px-6 py-3 text-left hover:bg-muted/50 transition-colors border-b last:border-b-0"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Icon className="size-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <Avatar className="size-5">
                        <AvatarImage src={item.user_avatar} alt={item.user_name} />
                        <AvatarFallback className="text-[10px]">
                          {getInitials(item.user_name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs text-muted-foreground truncate">
                        {item.user_name}
                      </span>
                    </div>
                    <p className="text-sm text-foreground line-clamp-2">
                      {getActivityMessage(item)}
                    </p>
                    <span className="text-xs text-muted-foreground">
                      {formatRelativeTime(item.created_at)}
                    </span>
                  </div>
                </button>
              )
            })}

            {data.length === 0 && (
              <div className="flex flex-col items-center justify-center py-8 text-center px-6">
                <Target className="size-8 text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground">
                  No hay actividad reciente
                </p>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
