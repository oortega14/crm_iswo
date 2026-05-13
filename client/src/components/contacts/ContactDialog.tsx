import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import api, { formatRailsError } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { queryKeys } from '@/lib/queryClient'

interface ContactDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Llamado tras crear: p. ej. volver a página 1 y limpiar búsqueda para que el contacto se vea al instante. */
  onCreated?: () => void
}

export function ContactDialog({ open, onOpenChange, onCreated }: ContactDialogProps) {
  const queryClient = useQueryClient()
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    company: '',
    position: '',
  })

  const createContactMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return api.post('/contacts', {
        contact: {
          kind: 'person',
          first_name: data.firstName || undefined,
          last_name: data.lastName || undefined,
          email: data.email || undefined,
          phone_e164: data.phone || undefined,
          company: data.company || undefined,
          position: data.position || undefined,
        },
      })
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.contacts.all })
      await queryClient.invalidateQueries({ queryKey: ['companies'] })
      onCreated?.()
      toast.success('Contacto creado exitosamente')
      onOpenChange(false)
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        company: '',
        position: '',
      })
    },
    onError: (err: unknown) => {
      if (isAxiosError(err) && err.response?.status === 403) {
        toast.error(
          'No tienes permiso para crear contactos. Solo consultores, managers y administradores pueden hacerlo.'
        )
        return
      }
      toast.error(formatRailsError(err, 'Error al crear el contacto'))
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    createContactMutation.mutate(formData)
  }

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nuevo Contacto</DialogTitle>
          <DialogDescription className="space-y-1">
            <span className="block">
              Completa nombre, apellido y correo. Si añades teléfono, usa formato internacional (por ejemplo{' '}
              <span className="font-medium text-foreground">+57 300 123 4567</span>) para que el servidor lo valide.
            </span>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">Nombre</Label>
              <Input
                id="firstName"
                value={formData.firstName}
                onChange={(e) => handleChange('firstName', e.target.value)}
                placeholder="Juan"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Apellido</Label>
              <Input
                id="lastName"
                value={formData.lastName}
                onChange={(e) => handleChange('lastName', e.target.value)}
                placeholder="Garcia"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              placeholder="juan@empresa.com"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Teléfono (opcional)</Label>
            <Input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
              placeholder="+57 300 123 4567"
            />
            <p className="text-xs text-muted-foreground">
              Déjalo vacío si no lo tienes. Si lo rellenas, debe ser un número reconocible (E.164); si no, verás un error
              de validación.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="company">Empresa</Label>
            <Input
              id="company"
              value={formData.company}
              onChange={(e) => handleChange('company', e.target.value)}
              placeholder="Nombre de la empresa"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="position">Cargo</Label>
            <Input
              id="position"
              value={formData.position}
              onChange={(e) => handleChange('position', e.target.value)}
              placeholder="Director de Ventas"
            />
          </div>

          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={createContactMutation.isPending}>
              {createContactMutation.isPending && <Spinner className="mr-2" />}
              Crear Contacto
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
