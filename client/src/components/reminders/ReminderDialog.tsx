import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
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
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    dueDate: '',
    dueTime: '',
    priority: 'medium',
    linkedOpportunity: '',
    linkedContact: '',
  })

  const createReminderMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      await new Promise(resolve => setTimeout(resolve, 1000))
      return { id: `rem-${Date.now()}`, ...data }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] })
      toast.success('Recordatorio creado exitosamente')
      onOpenChange(false)
      setFormData({
        title: '',
        description: '',
        dueDate: '',
        dueTime: '',
        priority: 'medium',
        linkedOpportunity: '',
        linkedContact: '',
      })
    },
    onError: () => {
      toast.error('Error al crear el recordatorio')
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    createReminderMutation.mutate(formData)
  }

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  // Get tomorrow's date as default
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const defaultDate = tomorrow.toISOString().split('T')[0]

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
                value={formData.dueDate || defaultDate}
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
            <Label htmlFor="priority">Prioridad</Label>
            <Select 
              value={formData.priority} 
              onValueChange={(value) => handleChange('priority', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="high">Alta</SelectItem>
                <SelectItem value="medium">Media</SelectItem>
                <SelectItem value="low">Baja</SelectItem>
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
                <SelectItem value="opp-1">Proyecto CRM TechCorp</SelectItem>
                <SelectItem value="opp-2">Consultoria InnoSoft</SelectItem>
                <SelectItem value="opp-3">Implementacion CloudNet</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="linkedContact">Vincular a Contacto (opcional)</Label>
            <Select 
              value={formData.linkedContact} 
              onValueChange={(value) => handleChange('linkedContact', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar contacto" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="contact-1">Juan Garcia</SelectItem>
                <SelectItem value="contact-2">Maria Lopez</SelectItem>
                <SelectItem value="contact-3">Pedro Martinez</SelectItem>
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
