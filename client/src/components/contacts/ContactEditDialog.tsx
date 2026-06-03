import { useEffect, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Spinner } from '@/components/ui/spinner'
import { formatRailsError } from '@/lib/api'
import {
  type ContactKind,
  type ContactSummary,
  getCompanyLabel,
  updateContact,
  upsertContactInQueryCache,
} from '@/lib/contactApi'
import { invalidateContactSegmentMetrics, queryKeys } from '@/lib/queryClient'

export interface ContactEditInitialData {
  kind?: ContactKind
  firstName?: string
  lastName?: string
  email?: string
  phone?: string
  company?: string
  position?: string
  documentId?: string
  city?: string
  country?: string
  notes?: string
}

interface ContactEditDialogProps {
  contactId: string | null
  initialData?: ContactEditInitialData
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved?: (contact: ContactSummary) => void
}

export function ContactEditDialog({
  contactId,
  initialData,
  open,
  onOpenChange,
  onSaved,
}: ContactEditDialogProps) {
  const queryClient = useQueryClient()
  const kind = initialData?.kind ?? 'person'
  const isCompany = kind === 'company'

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    company: '',
    position: '',
    documentId: '',
    city: '',
    country: '',
    notes: '',
  })

  useEffect(() => {
    if (open && initialData) {
      setForm({
        firstName: initialData.firstName ?? '',
        lastName: initialData.lastName ?? '',
        email: initialData.email ?? '',
        phone: initialData.phone ?? '',
        company: initialData.company ?? '',
        position: initialData.position ?? '',
        documentId: initialData.documentId ?? '',
        city: initialData.city ?? '',
        country: initialData.country ?? '',
        notes: initialData.notes ?? '',
      })
    }
  }, [open, initialData])

  const set = (field: keyof typeof form, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }))

  const mutation = useMutation({
    mutationFn: async () => {
      if (!contactId) throw new Error('Sin contacto seleccionado')
      if (isCompany) {
        return updateContact(contactId, {
          company: form.company || undefined,
          email: form.email || undefined,
          phone_e164: form.phone || undefined,
          document_id: form.documentId || undefined,
          city: form.city || undefined,
          country: form.country || undefined,
          notes: form.notes || undefined,
        })
      }
      return updateContact(contactId, {
        first_name: form.firstName || undefined,
        last_name: form.lastName || undefined,
        email: form.email || undefined,
        phone_e164: form.phone || undefined,
        company: form.company || undefined,
        position: form.position || undefined,
        document_id: form.documentId || undefined,
        city: form.city || undefined,
        country: form.country || undefined,
        notes: form.notes || undefined,
      })
    },
    onSuccess: async (updated) => {
      upsertContactInQueryCache(queryClient, updated)
      await invalidateContactSegmentMetrics(queryClient)
      await queryClient.invalidateQueries({ queryKey: queryKeys.opportunities.all })
      toast.success('Contacto actualizado')
      onOpenChange(false)
      onSaved?.(updated)
    },
    onError: (err: unknown) => {
      toast.error(formatRailsError(err, 'No se pudo actualizar el contacto'))
    },
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isCompany ? 'Editar empresa' : 'Editar contacto'}
          </DialogTitle>
          <DialogDescription>
            Solo datos de la persona o empresa. El negocio (temperatura, etapa, valor, BANT) se
            gestiona únicamente en Oportunidades.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            mutation.mutate()
          }}
        >
          {isCompany ? (
            <div className="space-y-2">
              <Label htmlFor="ce-company">Razón social</Label>
              <Input
                id="ce-company"
                value={form.company}
                onChange={(e) => set('company', e.target.value)}
                placeholder="Empresa S.A.S."
                required
              />
            </div>
          ) : (
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
          )}

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

          {!isCompany && (
            <>
              <div className="space-y-2">
                <Label htmlFor="ce-company-work">Empresa donde trabaja</Label>
                <Input
                  id="ce-company-work"
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
            </>
          )}

          <div className="space-y-2">
            <Label htmlFor="ce-document-id">{isCompany ? 'NIT' : 'Cédula / documento'}</Label>
            <Input
              id="ce-document-id"
              value={form.documentId}
              onChange={(e) => set('documentId', e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ce-city">Ciudad</Label>
              <Input
                id="ce-city"
                value={form.city}
                onChange={(e) => set('city', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ce-country">País</Label>
              <Input
                id="ce-country"
                value={form.country}
                onChange={(e) => set('country', e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ce-notes">Notas del lead</Label>
            <Textarea
              id="ce-notes"
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
              rows={3}
              placeholder="Contexto personal, preferencias de contacto…"
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
              Guardar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/** Construye initialData para el diálogo desde un ContactSummary. */
export function contactEditInitialFromSummary(contact: ContactSummary): ContactEditInitialData {
  return {
    kind: contact.kind,
    firstName: contact.firstName,
    lastName: contact.lastName,
    email: contact.email === '-' ? '' : contact.email,
    phone: contact.phone === '-' ? '' : contact.phone,
    company:
      getCompanyLabel(contact.company) === '-' ? '' : getCompanyLabel(contact.company),
    position: contact.position === '-' ? '' : contact.position,
    documentId: contact.documentId ?? '',
    city: contact.city ?? '',
    country: contact.country ?? '',
    notes: contact.notes ?? '',
  }
}
