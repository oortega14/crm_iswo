import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Bell, Plus, Calendar, Clock, Trash2, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { toast } from 'sonner'
import { formatRailsError } from '@/lib/api'
import {
  completeReminder,
  createOpportunityReminder,
  deleteReminder,
  snoozeReminder,
  type OpportunityReminderRow,
  type ReminderChannel,
} from '@/lib/reminderApi'
import {
  invalidateNotificationsQueries,
  invalidateReminderDashboardQueries,
  queryKeys,
} from '@/lib/queryClient'

interface RemindersTabProps {
  opportunityId: string
  reminders: OpportunityReminderRow[]
}

const channelLabel: Record<string, string> = {
  email: 'Email',
  whatsapp: 'WhatsApp',
  in_app: 'En app',
}

export function RemindersTab({ opportunityId, reminders }: RemindersTabProps) {
  const queryClient = useQueryClient()
  const [isAdding, setIsAdding] = useState(false)
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [remindAt, setRemindAt] = useState('')
  const [channel, setChannel] = useState<ReminderChannel>('in_app')

  const invalidate = async () => {
    await invalidateReminderDashboardQueries(queryClient)
    void invalidateNotificationsQueries(queryClient)
    void queryClient.invalidateQueries({
      queryKey: queryKeys.reminders.byOpportunity(opportunityId),
    })
  }

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!subject.trim() || !remindAt) {
        throw new Error('Completa asunto y fecha')
      }
      await createOpportunityReminder({
        opportunityId,
        remindAt,
        channel,
        subject: subject.trim(),
        message: message.trim() || undefined,
      })
    },
    onSuccess: () => {
      toast.success('Recordatorio creado')
      invalidate()
      setSubject('')
      setMessage('')
      setRemindAt('')
      setChannel('in_app')
      setIsAdding(false)
    },
    onError: (e: unknown) => {
      toast.error(formatRailsError(e, 'No se pudo crear el recordatorio'))
    },
  })

  const completeMutation = useMutation({
    mutationFn: completeReminder,
    onSuccess: () => {
      toast.success('Recordatorio completado')
      invalidate()
    },
    onError: (e: unknown) => toast.error(formatRailsError(e, 'No se pudo completar')),
  })

  const snoozeMutation = useMutation({
    mutationFn: ({ id, minutes }: { id: string; minutes: number }) => snoozeReminder(id, minutes),
    onSuccess: () => {
      toast.success('Recordatorio pospuesto')
      invalidate()
    },
    onError: (e: unknown) => toast.error(formatRailsError(e)),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteReminder,
    onSuccess: () => {
      toast.success('Recordatorio eliminado')
      invalidate()
    },
    onError: (e: unknown) => {
      toast.error(formatRailsError(e, 'No se pudo eliminar'))
    },
  })

  const statusBadge = (status: string) => {
    switch (status) {
      case 'done':
        return (
          <Badge variant="secondary" className="bg-green-100 text-green-800">
            Hecho
          </Badge>
        )
      case 'failed':
        return <Badge variant="destructive">Fallido</Badge>
      case 'sent':
        return (
          <Badge variant="secondary" className="bg-blue-100 text-blue-800">
            Enviado
          </Badge>
        )
      default:
        return <Badge variant="secondary">Pendiente</Badge>
    }
  }

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium">Recordatorios</h4>
        <Button variant="outline" size="sm" onClick={() => setIsAdding(!isAdding)}>
          <Plus className="mr-1 h-3 w-3" />
          Agregar
        </Button>
      </div>

      {isAdding && (
        <div className="border rounded-lg p-4 space-y-4 bg-muted/30">
          <div className="space-y-2">
            <Label htmlFor="rem-subject">Asunto</Label>
            <Input
              id="rem-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Ej: Llamar para seguimiento"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rem-message">Mensaje (opcional)</Label>
            <Input
              id="rem-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Detalle breve"
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="rem-at">Fecha y hora</Label>
              <Input
                id="rem-at"
                type="datetime-local"
                value={remindAt}
                onChange={(e) => setRemindAt(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Canal</Label>
              <Select value={channel} onValueChange={(v) => setChannel(v as ReminderChannel)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="in_app">En app</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsAdding(false)}>
              Cancelar
            </Button>
            <Button size="sm" disabled={createMutation.isPending} onClick={() => createMutation.mutate()}>
              Crear recordatorio
            </Button>
          </div>
        </div>
      )}

      {reminders.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No hay recordatorios</p>
        </div>
      ) : (
        <div className="space-y-2">
          {reminders.map((reminder) => (
            <div
              key={reminder.id}
              className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-start gap-3 min-w-0">
                <div className="mt-0.5 shrink-0">
                  <Bell className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{reminder.subject}</p>
                  {reminder.message ? (
                    <p className="text-xs text-muted-foreground truncate">{reminder.message}</p>
                  ) : null}
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {reminder.remind_at
                        ? format(new Date(reminder.remind_at), 'dd MMM yyyy', { locale: es })
                        : '—'}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {reminder.remind_at ? format(new Date(reminder.remind_at), 'HH:mm') : '—'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge variant="outline" className="text-[10px]">
                  {channelLabel[reminder.channel] ?? reminder.channel}
                </Badge>
                {statusBadge(reminder.status)}
                {reminder.status === 'pending' && (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      title="Completar"
                      disabled={completeMutation.isPending}
                      onClick={() => completeMutation.mutate(reminder.id)}
                    >
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8" title="Posponer">
                          <Clock className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
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
                            onClick={() => snoozeMutation.mutate({ id: reminder.id, minutes: opt.minutes })}
                          >
                            {opt.label}
                          </DropdownMenuItem>
                        ))}
                        <DropdownMenuItem
                          onClick={() => {
                            const t = new Date()
                            t.setDate(t.getDate() + 1)
                            t.setHours(9, 0, 0, 0)
                            const minutes = Math.round((t.getTime() - Date.now()) / 60000)
                            snoozeMutation.mutate({ id: reminder.id, minutes })
                          }}
                        >
                          Mañana (9:00)
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  disabled={deleteMutation.isPending}
                  onClick={() => deleteMutation.mutate(reminder.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
