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
  User,
  Building2,
  MoreHorizontal,
  Filter
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Checkbox } from '@/components/ui/checkbox'
import { Skeleton } from '@/components/ui/skeleton'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ReminderDialog } from '@/components/reminders/ReminderDialog'
import type { Reminder } from '@/types'
import { formatDate, cn } from '@/lib/utils'
import { toast } from 'sonner'

export const Route = createFileRoute('/_app/reminders')({
  component: RemindersPage,
})

function RemindersPage() {
  const queryClient = useQueryClient()
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('pending')

  const { data: reminders, isLoading } = useQuery({
    queryKey: ['reminders', filter],
    queryFn: async () => {
      await new Promise(resolve => setTimeout(resolve, 500))
      
      const mockReminders: Reminder[] = [
        {
          id: 'rem-1',
          title: 'Llamar a Juan Garcia',
          description: 'Seguimiento de propuesta enviada',
          dueDate: new Date(Date.now() + 86400000).toISOString(),
          priority: 'high',
          completed: false,
          linkedOpportunity: {
            id: 'opp-1',
            name: 'Proyecto CRM TechCorp',
            stage: 'Propuesta',
            value: 50000,
            company: 'TechCorp',
            contact: 'Juan Garcia',
            probability: 60,
            expectedCloseDate: new Date(Date.now() + 30 * 86400000).toISOString(),
            bant: { budget: 80, authority: 70, need: 90, timeline: 60 },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          linkedContact: {
            id: 'contact-1',
            firstName: 'Juan',
            lastName: 'Garcia',
            email: 'juan@techcorp.com',
            phone: '+34 600 123 456',
            position: 'CEO',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'rem-2',
          title: 'Enviar propuesta a InnoSoft',
          description: 'Preparar y enviar propuesta comercial',
          dueDate: new Date(Date.now() + 2 * 86400000).toISOString(),
          priority: 'medium',
          completed: false,
          linkedOpportunity: {
            id: 'opp-2',
            name: 'Consultoria InnoSoft',
            stage: 'Calificacion',
            value: 30000,
            company: 'InnoSoft',
            contact: 'Maria Lopez',
            probability: 40,
            expectedCloseDate: new Date(Date.now() + 45 * 86400000).toISOString(),
            bant: { budget: 60, authority: 80, need: 70, timeline: 50 },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'rem-3',
          title: 'Reunion con equipo de desarrollo',
          description: 'Revisar avances del proyecto',
          dueDate: new Date(Date.now() - 86400000).toISOString(),
          priority: 'low',
          completed: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'rem-4',
          title: 'Actualizar pipeline Q2',
          description: 'Revisar y actualizar forecast',
          dueDate: new Date(Date.now() - 2 * 86400000).toISOString(),
          priority: 'high',
          completed: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'rem-5',
          title: 'Demo producto CloudNet',
          description: 'Preparar demo personalizada',
          dueDate: new Date(Date.now() + 3 * 86400000).toISOString(),
          priority: 'medium',
          completed: false,
          linkedContact: {
            id: 'contact-3',
            firstName: 'Pedro',
            lastName: 'Martinez',
            email: 'pedro@cloudnet.com',
            phone: '+34 600 789 012',
            position: 'CTO',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ]

      if (filter === 'pending') {
        return mockReminders.filter(r => !r.completed)
      } else if (filter === 'completed') {
        return mockReminders.filter(r => r.completed)
      }
      return mockReminders
    }
  })

  const toggleCompleteMutation = useMutation({
    mutationFn: async ({ id, completed }: { id: string; completed: boolean }) => {
      await new Promise(resolve => setTimeout(resolve, 300))
      return { id, completed }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] })
      toast.success(data.completed ? 'Recordatorio completado' : 'Recordatorio reabierto')
    }
  })

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-500'
      case 'medium': return 'text-amber-500'
      case 'low': return 'text-green-500'
      default: return 'text-muted-foreground'
    }
  }

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high': return <Badge variant="destructive">Alta</Badge>
      case 'medium': return <Badge variant="secondary" className="bg-amber-100 text-amber-800">Media</Badge>
      case 'low': return <Badge variant="secondary" className="bg-green-100 text-green-800">Baja</Badge>
      default: return null
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
  }, {} as Record<string, Reminder[]>)

  const groupOrder = ['Atrasados', 'Hoy', 'Manana', 'Proximos']

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Recordatorios</h1>
          <p className="text-sm text-muted-foreground">
            Gestiona tus tareas y recordatorios
          </p>
        </div>
        <Button size="sm" onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Recordatorio
        </Button>
      </div>

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
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
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
                                {getPriorityBadge(reminder.priority)}
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

                              {reminder.linkedContact && (
                                <div className="flex items-center gap-2">
                                  <Avatar className="h-5 w-5">
                                    <AvatarImage src={`https://avatar.vercel.sh/${reminder.linkedContact.email}`} />
                                    <AvatarFallback className="text-xs">
                                      {reminder.linkedContact.firstName[0]}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="text-muted-foreground">
                                    {reminder.linkedContact.firstName} {reminder.linkedContact.lastName}
                                  </span>
                                </div>
                              )}

                              {reminder.linkedOpportunity && (
                                <div className="flex items-center gap-1 text-muted-foreground">
                                  <Building2 className="h-3 w-3" />
                                  {reminder.linkedOpportunity.name}
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
    </div>
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
