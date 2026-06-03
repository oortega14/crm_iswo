import { useEffect, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { formatRailsError } from '@/lib/api'
import { createOpportunityReminder, type ReminderChannel } from '@/lib/reminderApi'
import { OpportunityLeadPicker } from '@/components/reminders/OpportunityLeadPicker'
import { invalidateReminderDashboardQueries, queryKeys } from '@/lib/queryClient'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Spinner } from '@/components/ui/spinner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'

interface ReminderDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated?: () => void
  /** Pre-seleccionar oportunidad (p. ej. desde slide-over). */
  defaultOpportunityId?: string
}

export function ReminderDialog({
  open,
  onOpenChange,
  onCreated,
  defaultOpportunityId,
}: ReminderDialogProps) {
  const queryClient = useQueryClient()
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const defaultDate = tomorrow.toISOString().split('T')[0]

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    dueDate: defaultDate,
    dueTime: '',
    channel: 'in_app' as ReminderChannel,
    linkedOpportunity: defaultOpportunityId || '',
  })

  useEffect(() => {
    if (open && defaultOpportunityId) {
      setFormData((prev) => ({ ...prev, linkedOpportunity: defaultOpportunityId }))
    }
  }, [open, defaultOpportunityId])

  const createReminderMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (!data.linkedOpportunity) {
        throw new Error('Debes seleccionar una oportunidad')
      }
      const remindAt = data.dueTime
        ? `${data.dueDate}T${data.dueTime}:00`
        : `${data.dueDate}T09:00:00`

      return createOpportunityReminder({
        opportunityId: data.linkedOpportunity,
        remindAt,
        channel: data.channel,
        subject: data.title,
        message: data.description,
      })
    },
    onSuccess: async (_data, variables) => {
      await invalidateReminderDashboardQueries(queryClient)
      if (variables.linkedOpportunity) {
        void queryClient.invalidateQueries({
          queryKey: queryKeys.reminders.byOpportunity(variables.linkedOpportunity),
        })
      }
      onCreated?.()
      toast.success('Recordatorio creado exitosamente')
      onOpenChange(false)
      setFormData({
        title: '',
        description: '',
        dueDate: defaultDate,
        dueTime: '',
        channel: 'in_app',
        linkedOpportunity: defaultOpportunityId || '',
      })
    },
    onError: (error: unknown) => {
      toast.error(formatRailsError(error, 'Error al crear el recordatorio'))
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    createReminderMutation.mutate(formData)
  }

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md overflow-visible">
        <DialogHeader>
          <DialogTitle>Nuevo Recordatorio</DialogTitle>
          <DialogDescription>
            Crea un recordatorio vinculado a una oportunidad (canal in-app, email o WhatsApp).
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Titulo</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => handleChange('title', e.target.value)}
              placeholder="Llamar a cliente..."
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descripcion (opcional)</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Detalles adicionales..."
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dueDate">Fecha</Label>
              <Input
                id="dueDate"
                type="date"
                value={formData.dueDate}
                onChange={(e) => handleChange('dueDate', e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dueTime">Hora (opcional)</Label>
              <Input
                id="dueTime"
                type="time"
                value={formData.dueTime}
                onChange={(e) => handleChange('dueTime', e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="channel">Canal</Label>
            <Select
              value={formData.channel}
              onValueChange={(value) => handleChange('channel', value)}
            >
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

          <div className="space-y-2">
            <Label htmlFor="linkedOpportunity">Lead / oportunidad</Label>
            <OpportunityLeadPicker
              value={formData.linkedOpportunity}
              onValueChange={(id) => handleChange('linkedOpportunity', id)}
              disabled={Boolean(defaultOpportunityId)}
              placeholder="Iniciales del lead (ej. CR)…"
            />
            <p className="text-xs text-muted-foreground">
              Escribe dos letras (iniciales de nombre y apellido) para ver coincidencias.
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={createReminderMutation.isPending}>
              {createReminderMutation.isPending && <Spinner className="mr-2" />}
              Crear Recordatorio
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
