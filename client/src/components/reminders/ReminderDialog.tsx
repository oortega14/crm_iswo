import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { queryKeys } from '@/lib/queryClient'
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
}

export function ReminderDialog({ open, onOpenChange }: ReminderDialogProps) {
  const queryClient = useQueryClient()
  // Get tomorrow's date as default
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const defaultDate = tomorrow.toISOString().split('T')[0]

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    dueDate: defaultDate,
    dueTime: '',
    channel: 'in_app',
    linkedOpportunity: '',
  })

  const { data: opportunities = [] } = useQuery({
    queryKey: ['opportunities', 'reminder-dialog'],
    queryFn: async () => {
      const response = await api.get('/opportunities', { params: { items: 100 } })
      const data = response.data?.data || []
      return data.map((item: { id: string; attributes?: { title?: string } }) => ({
        id: item.id,
        label: item.attributes?.title || `Oportunidad ${item.id}`,
      }))
    },
    enabled: open,
  })

  const createReminderMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (!data.linkedOpportunity) {
        throw new Error('Debes seleccionar una oportunidad')
      }
      const remindAt = data.dueTime
        ? `${data.dueDate}T${data.dueTime}:00`
        : `${data.dueDate}T09:00:00`

      return api.post(`/opportunities/${data.linkedOpportunity}/reminders`, {
        reminder: {
          remind_at: remindAt,
          channel: data.channel,
          subject: data.title,
          message: data.description || undefined,
        },
      })
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] })
      if (variables.linkedOpportunity) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.reminders.byOpportunity(variables.linkedOpportunity),
        })
      }
      toast.success('Recordatorio creado exitosamente')
      onOpenChange(false)
      setFormData({
        title: '',
        description: '',
        dueDate: defaultDate,
        dueTime: '',
        channel: 'in_app',
        linkedOpportunity: '',
      })
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Error al crear el recordatorio')
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    createReminderMutation.mutate(formData)
  }

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nuevo Recordatorio</DialogTitle>
          <DialogDescription>
            Crea un recordatorio para no olvidar tareas importantes
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
                <SelectItem value="in_app">In App</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="whatsapp">WhatsApp</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="linkedOpportunity">Vincular a Oportunidad (opcional)</Label>
            <Select 
              value={formData.linkedOpportunity} 
              onValueChange={(value) => handleChange('linkedOpportunity', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar oportunidad" />
              </SelectTrigger>
              <SelectContent>
                {opportunities.map((opportunity: { id: string; label: string }) => (
                  <SelectItem key={opportunity.id} value={opportunity.id}>
                    {opportunity.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
            >
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
