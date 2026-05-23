import { useEffect, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import api, { formatRailsError } from '@/lib/api'
import { queryKeys } from '@/lib/queryClient'

export interface ContactEditInitialData {
  firstName?: string
  lastName?: string
  email?: string
  phone?: string
  company?: string
  position?: string
  documentId?: string
}

interface ContactEditDialogProps {
  contactId: string | null
  initialData?: ContactEditInitialData
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Llamado tras guardar exitosamente */
  onSaved?: () => void
}

export function ContactEditDialog({
  contactId,
  initialData,
  open,
  onOpenChange,
  onSaved,
}: ContactEditDialogProps) {
  const queryClient = useQueryClient()

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    company: '',
    position: '',
    documentId: '',
  })

  useEffect(() => {
    if (open && initialData) {
      setForm({
        firstName:  initialData.firstName  ?? '',
        lastName:   initialData.lastName   ?? '',
        email:      initialData.email      ?? '',
        phone:      initialData.phone      ?? '',
        company:    initialData.company    ?? '',
        position:   initialData.position   ?? '',
        documentId: initialData.documentId ?? '',
      })
    }
  }, [open, initialData])

  const set = (field: keyof typeof form, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }))

  const mutation = useMutation({
    mutationFn: async () => {
      if (!contactId) throw new Error('Sin contacto seleccionado')
      return api.patch(`/contacts/${contactId}`, {
        contact: {
          first_name:  form.firstName  || undefined,
          last_name:   form.lastName   || undefined,
          email:       form.email      || undefined,
          phone_e164:  form.phone      || undefined,
          company:     form.company    || undefined,
          position:    form.position   || undefined,
          document_id: form.documentId || undefined,
        },
      })
    },
    onSuccess: async () => {
      // Invalida contactos Y oportunidades para que los cambios se reflejen en ambos lados
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.contacts.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.opportunities.all }),
      ])
      toast.success('Contacto actualizado')
      onOpenChange(false)
      onSaved?.()
    },
    onError: (err: unknown) => {
      toast.error(formatRailsError(err, 'No se pudo actualizar el contacto'))
    },
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar contacto</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            mutation.mutate()
          }}
        >
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ce-first-name">Nombre</Label>
              <Input
                id="ce-first-name"
                value={form.firstName}
                onChange={(e) => set('firstName', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ce-last-name">Apellido</Label>
              <Input
                id="ce-last-name"
                value={form.lastName}
                onChange={(e) => set('lastName', e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="ce-email">Email</Label>
            <Input
              id="ce-email"
              type="email"
              value={form.email}
              onChange={(e) => set('email', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ce-phone">Teléfono</Label>
            <Input
              id="ce-phone"
              value={form.phone}
              onChange={(e) => set('phone', e.target.value)}
              placeholder="+57..."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ce-company">Empresa</Label>
            <Input
              id="ce-company"
              value={form.company}
              onChange={(e) => set('company', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ce-position">Cargo</Label>
            <Input
              id="ce-position"
              value={form.position}
              onChange={(e) => set('position', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ce-document-id">Cédula / NIT</Label>
            <Input
              id="ce-document-id"
              value={form.documentId}
              onChange={(e) => set('documentId', e.target.value)}
              placeholder="Número de documento"
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={mutation.isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && <Spinner className="mr-2 size-4" />}
              Guardar cambios
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
