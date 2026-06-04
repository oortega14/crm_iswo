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
import { invalidateContactsQueries } from '@/lib/queryClient'

interface ContactDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated?: () => void
}

export function ContactDialog({ open, onOpenChange, onCreated }: ContactDialogProps) {
  const queryClient = useQueryClient()
  const [kind, setKind] = useState<'person' | 'company'>('person')
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    company: '',
    position: '',
    documentId: '',
  })

  const createContactMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return api.post('/contacts', {
        contact: {
          kind,
          first_name:   kind === 'person' ? (data.firstName || undefined) : undefined,
          last_name:    kind === 'person' ? (data.lastName  || undefined) : undefined,
          email:        data.email      || undefined,
          phone_e164:   data.phone      || undefined,
          company:      data.company    || undefined,
          position:     kind === 'person' ? (data.position  || undefined) : undefined,
          document_id:  data.documentId || undefined,
        },
      })
    },
    onSuccess: async () => {
      await invalidateContactsQueries(queryClient)
      onCreated?.()
      toast.success(
        kind === 'company'
          ? 'Empresa y prospecto creados en el pipeline'
          : 'Contacto y prospecto creados en el pipeline'
      )
      onOpenChange(false)
      setFormData({ firstName: '', lastName: '', email: '', phone: '', company: '', position: '', documentId: '' })
      setKind('person')
    },
    onError: (err: unknown) => {
      if (isAxiosError(err) && err.response?.status === 403) {
        toast.error('No tienes permiso para crear contactos.')
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

  const handleKindChange = (newKind: 'person' | 'company') => {
    setKind(newKind)
    setFormData({ firstName: '', lastName: '', email: '', phone: '', company: '', position: '', documentId: '' })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{kind === 'company' ? 'Nueva Empresa' : 'Nuevo Contacto'}</DialogTitle>
          <DialogDescription>
            {kind === 'company'
              ? 'Registra la empresa y se abrirá automáticamente como prospecto en Oportunidades.'
              : 'Completa los datos de la persona. Se creará también en el pipeline (teléfono +57...).'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Selector de tipo */}
          <div className="flex rounded-md border overflow-hidden">
            <button
              type="button"
              onClick={() => handleKindChange('person')}
              className={`flex-1 py-1.5 text-sm font-medium transition-colors ${
                kind === 'person'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-background text-muted-foreground hover:bg-muted'
              }`}
            >
              Persona
            </button>
            <button
              type="button"
              onClick={() => handleKindChange('company')}
              className={`flex-1 py-1.5 text-sm font-medium transition-colors ${
                kind === 'company'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-background text-muted-foreground hover:bg-muted'
              }`}
            >
              Empresa
            </button>
          </div>

          {/* Campos según tipo */}
          {kind === 'person' ? (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">Nombre *</Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => handleChange('firstName', e.target.value)}
                    placeholder="Juan"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Apellido *</Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => handleChange('lastName', e.target.value)}
                    placeholder="García"
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
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Teléfono</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  placeholder="+57 300 123 4567"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="company">Empresa donde trabaja</Label>
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

              <div className="space-y-2">
                <Label htmlFor="documentId">Cédula</Label>
                <Input
                  id="documentId"
                  value={formData.documentId}
                  onChange={(e) => handleChange('documentId', e.target.value)}
                  placeholder="1234567890"
                />
              </div>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="company">Razón social *</Label>
                <Input
                  id="company"
                  value={formData.company}
                  onChange={(e) => handleChange('company', e.target.value)}
                  placeholder="Empresa S.A.S."
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email corporativo</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  placeholder="contacto@empresa.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Teléfono</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  placeholder="+57 300 123 4567"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="documentIdCompany">NIT</Label>
                <Input
                  id="documentIdCompany"
                  value={formData.documentId}
                  onChange={(e) => handleChange('documentId', e.target.value)}
                  placeholder="900123456-7"
                />
              </div>
            </>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={createContactMutation.isPending}>
              {createContactMutation.isPending && <Spinner className="mr-2" />}
              {kind === 'company' ? 'Crear Empresa' : 'Crear Contacto'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
