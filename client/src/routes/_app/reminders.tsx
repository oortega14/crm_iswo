import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus,
  Calendar,
  Clock,
  Bell,
  CheckCircle2,
  Circle,
  AlertCircle,
  MoreHorizontal,
  Filter,
  Briefcase,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Skeleton } from '@/components/ui/skeleton'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ReminderDialog } from '@/components/reminders/ReminderDialog'
import { AppPageShell } from '@/components/layout/AppPageShell'
import { PageHeader } from '@/components/layout/PageHeader'
import api from '@/lib/api'
import { formatDate, cn } from '@/lib/utils'
import { queryKeys } from '@/lib/queryClient'
import { toast } from 'sonner'

export const Route = createFileRoute('/_app/reminders')({
  component: RemindersPage,
})

type ReminderItem = {
  id: string
  title: string
  description: string
  dueDate: string
  channel: string
  status: string
  completed: boolean
  opportunityName?: string
  opportunityId?: string
}

type JsonApiReminder = {
  id: string
  attributes: {
    title?: string
    body?: string
    subject?: string
    message?: string
    remind_at: string
    channel: string
    status: string
  }
  relationships?: {
    opportunity?: { data?: { id?: string; type?: string } | null }
  }
}

type JsonApiIncluded = {
  id: string
  type: string
  attributes: {
    contact_name?: string
    title?: string
  }
}

const CHANNEL_LABEL: Record<string, string> = {
  in_app: 'En app',
  email: 'Email',
  whatsapp: 'WhatsApp',
}

const mapReminder = (resource: JsonApiReminder, included: JsonApiIncluded[]): ReminderItem => {
  const attrs = resource.attributes
  const oppRel = resource.relationships?.opportunity?.data
  const oppId = oppRel?.id != null ? String(oppRel.id) : undefined
  const oppInc = oppId
    ? included.find((r) => String(r.id) === oppId && r.type === 'opportunity')
    : undefined
  const opportunityName = oppInc
    ? (oppInc.attributes.contact_name || oppInc.attributes.title || undefined)
    : undefined
  return {
    id: resource.id,
    title: attrs.subject || attrs.title || 'Recordatorio',
    description: attrs.message || attrs.body || '',
    dueDate: attrs.remind_at,
    channel: attrs.channel,
    status: attrs.status,
    completed: attrs.status === 'done',
    opportunityName,
    opportunityId: oppId,
  }
}

const groupOrder = ['Atrasados', 'Hoy', 'Manana', 'Proximos']

function groupReminder(reminder: ReminderItem): string {
  const date = new Date(reminder.dueDate)
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  if (date.toDateString() === today.toDateString()) return 'Hoy'
  if (date.toDateString() === tomorrow.toDateString()) return 'Manana'
  if (date < today) return 'Atrasados'
  return 'Proximos'
}

function isOverdue(dueDate: string) {
  return new Date(dueDate) < new Date()
}

function RemindersPage() {
  const queryClient = useQueryClient()
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('pending')

  // Fetch all reminders (no server-side status filter); filter client-side so stats are always accurate
  const { data: allReminders = [], isLoading } = useQuery({
    queryKey: queryKeys.reminders.all,
    queryFn: async () => {
      const response = await api.get('/reminders', { params: { items: 200 } })
      const resources = (response.data?.data || []) as JsonApiReminder[]
      const included = (response.data?.included || []) as JsonApiIncluded[]
      return resources.map((r) => mapReminder(r, included))
    },
  })

  // Apply filter client-side for the list
  const reminders =
    filter === 'pending'
      ? allReminders.filter((r) => !r.completed)
      : filter === 'completed'
        ? allReminders.filter((r) => r.completed)
        : allReminders

  const groupedReminders = reminders.reduce(
    (acc, r) => {
      const group = groupReminder(r)
      if (!acc[group]) acc[group] = []
      acc[group].push(r)
      return acc
    },
    {} as Record<string, ReminderItem[]>,
  )

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.reminders.all })

  const snoozeMutation = useMutation({
    mutationFn: async ({ id, minutes }: { id: string; minutes: number }) => {
      await api.post(`/reminders/${id}/snooze`, { minutes })
    },
    onSuccess: () => {
      invalidate()
      toast.success('Recordatorio pospuesto')
    },
    onError: () => toast.error('No se pudo posponer el recordatorio'),
  })

  const toggleCompleteMutation = useMutation({
    mutationFn: async ({ id, completed }: { id: string; completed: boolean }) => {
      if (completed) {
        await api.post(`/reminders/${id}/complete`)
      } else {
        await api.patch(`/reminders/${id}`, { reminder: { status: 'pending' } })
      }
      return { id, completed }
    },
    onSuccess: (data) => {
      invalidate()
      toast.success(data.completed ? 'Recordatorio completado' : 'Recordatorio reabierto')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => api.delete(`/reminders/${id}`),
    onSuccess: () => {
      invalidate()
      toast.success('Recordatorio eliminado')
    },
    onError: () => toast.error('No se pudo eliminar el recordatorio'),
  })

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'done':
        return <Badge variant="success">Completado</Badge>
      case 'failed':
        return <Badge variant="destructive">Fallido</Badge>
      case 'sent':
        return (
          <Badge className="border border-primary/25 bg-primary/12 text-primary dark:border-primary/35 dark:bg-primary/18">
            Enviado
          </Badge>
        )
      default:
        return <Badge variant="secondary">Pendiente</Badge>
    }
  }

  // Stats from the full (unfiltered) list
  const pendingCount   = allReminders.filter((r) => !r.completed).length
  const overdueCount   = allReminders.filter((r) => !r.completed && isOverdue(r.dueDate)).length
  const todayCount     = allReminders.filter(
    (r) => !r.completed && new Date(r.dueDate).toDateString() === new Date().toDateString()
  ).length
  const completedCount = allReminders.filter((r) => r.completed).length

  return (
    <AppPageShell contentClassName="gap-8">
      <PageHeader title="Recordatorios" description="Gestiona tus tareas y recordatorios">
        <Button size="sm" className="shadow-sm" onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo recordatorio
        </Button>
      </PageHeader>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Bell className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-semibold">{pendingCount}</p>
                <p className="text-xs text-muted-foreground">Pendientes</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100">
                <AlertCircle className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <p className="text-2xl font-semibold">{overdueCount}</p>
                <p className="text-xs text-muted-foreground">Atrasados</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100">
                <Clock className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-semibold">{todayCount}</p>
                <p className="text-xs text-muted-foreground">Para hoy</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15">
                <CheckCircle2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-semibold">{completedCount}</p>
                <p className="text-xs text-muted-foreground">Completados</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2">
        <Button
          variant={filter === 'pending' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('pending')}
        >
          <Circle className="mr-2 h-4 w-4" />
          Pendientes
        </Button>
        <Button
          variant={filter === 'completed' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('completed')}
        >
          <CheckCircle2 className="mr-2 h-4 w-4" />
          Completados
        </Button>
        <Button
          variant={filter === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('all')}
        >
          Todos
        </Button>
      </div>

      {/* Reminders List */}
      {isLoading ? (
        <RemindersSkeleton />
      ) : (
        <div className="space-y-6">
          {groupOrder.map((group) => {
            const items = groupedReminders[group]
            if (!items?.length) return null

            return (
              <div key={group}>
                <h2
                  className={cn(
                    'text-sm font-medium mb-3',
                    group === 'Atrasados' ? 'text-red-500' : 'text-muted-foreground',
                  )}
                >
                  {group} ({items.length})
                </h2>
                <div className="space-y-2">
                  {items.map((reminder) => (
                    <Card
                      key={reminder.id}
                      className={cn('transition-colors', reminder.completed && 'opacity-60')}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <Checkbox
                            checked={reminder.completed}
                            onCheckedChange={(checked) => {
                              toggleCompleteMutation.mutate({
                                id: reminder.id,
                                completed: checked as boolean,
                              })
                            }}
                            className="mt-1"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <h3
                                  className={cn(
                                    'font-medium',
                                    reminder.completed && 'line-through',
                                  )}
                                >
                                  {reminder.title}
                                </h3>
                                {reminder.description && (
                                  <p className="text-sm text-muted-foreground mt-1">
                                    {reminder.description}
                                  </p>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                {getStatusBadge(reminder.status)}
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    {!reminder.completed && (
                                      <DropdownMenuSub>
                                        <DropdownMenuSubTrigger>Posponer</DropdownMenuSubTrigger>
                                        <DropdownMenuSubContent>
                                          {(
                                            [
                                              { label: '15 minutos', minutes: 15 },
                                              { label: '30 minutos', minutes: 30 },
                                              { label: '1 hora', minutes: 60 },
                                              { label: '2 horas', minutes: 120 },
                                            ] as const
                                          ).map((opt) => (
                                            <DropdownMenuItem
                                              key={opt.minutes}
                                              onClick={() =>
                                                snoozeMutation.mutate({
                                                  id: reminder.id,
                                                  minutes: opt.minutes,
                                                })
                                              }
                                            >
                                              {opt.label}
                                            </DropdownMenuItem>
                                          ))}
                                          <DropdownMenuItem
                                            onClick={() => {
                                              const t = new Date()
                                              t.setDate(t.getDate() + 1)
                                              t.setHours(9, 0, 0, 0)
                                              const minutes = Math.round(
                                                (t.getTime() - Date.now()) / 60000,
                                              )
                                              snoozeMutation.mutate({ id: reminder.id, minutes })
                                            }}
                                          >
                                            Mañana (9:00)
                                          </DropdownMenuItem>
                                        </DropdownMenuSubContent>
                                      </DropdownMenuSub>
                                    )}
                                    <DropdownMenuItem
                                      className="text-destructive"
                                      onClick={() => deleteMutation.mutate(reminder.id)}
                                    >
                                      Eliminar
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-4 mt-3 text-sm">
                              <div
                                className={cn(
                                  'flex items-center gap-1',
                                  isOverdue(reminder.dueDate) && !reminder.completed
                                    ? 'text-red-500'
                                    : 'text-muted-foreground',
                                )}
                              >
                                <Calendar className="h-3 w-3" />
                                {formatDate(reminder.dueDate)}
                              </div>

                              <div className="flex items-center gap-1 text-muted-foreground">
                                <Filter className="h-3 w-3" />
                                {CHANNEL_LABEL[reminder.channel] ?? reminder.channel}
                              </div>

                              {reminder.opportunityName && (
                                <div className="flex items-center gap-1 text-muted-foreground">
                                  <Briefcase className="h-3 w-3" />
                                  <span className="truncate max-w-[200px]">{reminder.opportunityName}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )
          })}

          {reminders.length === 0 && (
            <Card>
              <CardContent className="py-12">
                <div className="text-center">
                  <Bell className="h-12 w-12 mx-auto text-muted-foreground/50" />
                  <h3 className="mt-4 text-lg font-medium">No hay recordatorios</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Crea un nuevo recordatorio para empezar
                  </p>
                  <Button className="mt-4" onClick={() => setIsCreateDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Nuevo Recordatorio
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <ReminderDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onCreated={invalidate}
      />
    </AppPageShell>
  )
}

function RemindersSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Skeleton className="h-4 w-4 rounded" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-4 w-full" />
                <div className="flex gap-4">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-32" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
