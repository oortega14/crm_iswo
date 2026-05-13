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
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Skeleton } from '@/components/ui/skeleton'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ReminderDialog } from '@/components/reminders/ReminderDialog'
import { AppPageShell } from '@/components/layout/AppPageShell'
import { PageHeader } from '@/components/layout/PageHeader'
import api from '@/lib/api'
import { formatDate, cn } from '@/lib/utils'
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
}

const mapReminder = (resource: JsonApiReminder): ReminderItem => {
  const attrs = resource.attributes
  return {
    id: resource.id,
    title: attrs.title || attrs.subject || 'Recordatorio',
    description: attrs.body || attrs.message || '',
    dueDate: attrs.remind_at,
    channel: attrs.channel,
    status: attrs.status,
    completed: attrs.status === 'done',
  }
}

function RemindersPage() {
  const queryClient = useQueryClient()
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('pending')

  const { data: reminders, isLoading } = useQuery({
    queryKey: ['reminders', filter],
    queryFn: async () => {
      const params =
        filter === 'pending' ? { status: 'pending' } :
        filter === 'completed' ? { status: 'done' } :
        undefined
      const response = await api.get('/reminders', { params })
      const resources = (response.data?.data || []) as JsonApiReminder[]
      return resources.map(mapReminder)
    }
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
      queryClient.invalidateQueries({ queryKey: ['reminders'] })
      toast.success(data.completed ? 'Recordatorio completado' : 'Recordatorio reabierto')
    }
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

  const isOverdue = (dueDate: string) => {
    return new Date(dueDate) < new Date()
  }

  const groupedReminders = reminders?.reduce((acc, reminder) => {
    const date = new Date(reminder.dueDate)
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    
    let group: string
    if (date.toDateString() === today.toDateString()) {
      group = 'Hoy'
    } else if (date.toDateString() === tomorrow.toDateString()) {
      group = 'Manana'
    } else if (date < today) {
      group = 'Atrasados'
    } else {
      group = 'Proximos'
    }

    if (!acc[group]) acc[group] = []
    acc[group].push(reminder)
    return acc
  }, {} as Record<string, ReminderItem[]>)

  const groupOrder = ['Atrasados', 'Hoy', 'Manana', 'Proximos']

  return (
    <AppPageShell contentClassName="gap-8">
      <PageHeader
        title="Recordatorios"
        description="Gestiona tus tareas y recordatorios"
      >
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
                <p className="text-2xl font-semibold">{reminders?.filter(r => !r.completed).length ?? 0}</p>
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
                <p className="text-2xl font-semibold">
                  {reminders?.filter(r => !r.completed && isOverdue(r.dueDate)).length ?? 0}
                </p>
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
                <p className="text-2xl font-semibold">
                  {reminders?.filter(r => !r.completed && new Date(r.dueDate).toDateString() === new Date().toDateString()).length ?? 0}
                </p>
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
                <p className="text-2xl font-semibold">
                  {reminders?.filter(r => r.completed).length ?? 0}
                </p>
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
          {groupOrder.map(group => {
            const items = groupedReminders?.[group]
            if (!items?.length) return null

            return (
              <div key={group}>
                <h2 className={cn(
                  "text-sm font-medium mb-3",
                  group === 'Atrasados' ? 'text-red-500' : 'text-muted-foreground'
                )}>
                  {group} ({items.length})
                </h2>
                <div className="space-y-2">
                  {items.map(reminder => (
                    <Card key={reminder.id} className={cn(
                      "transition-colors",
                      reminder.completed && "opacity-60"
                    )}>
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <Checkbox
                            checked={reminder.completed}
                            onCheckedChange={(checked) => {
                              toggleCompleteMutation.mutate({
                                id: reminder.id,
                                completed: checked as boolean
                              })
                            }}
                            className="mt-1"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <h3 className={cn(
                                  "font-medium",
                                  reminder.completed && "line-through"
                                )}>
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
                                    <DropdownMenuItem>Editar</DropdownMenuItem>
                                    <DropdownMenuItem>Posponer</DropdownMenuItem>
                                    <DropdownMenuItem className="text-destructive">
                                      Eliminar
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-4 mt-3 text-sm">
                              <div className={cn(
                                "flex items-center gap-1",
                                isOverdue(reminder.dueDate) && !reminder.completed ? 'text-red-500' : 'text-muted-foreground'
                              )}>
                                <Calendar className="h-3 w-3" />
                                {formatDate(reminder.dueDate)}
                              </div>

                              <div className="flex items-center gap-1 text-muted-foreground">
                                <Filter className="h-3 w-3" />
                                {reminder.channel}
                              </div>
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

          {!reminders?.length && (
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
