import {
  Mail,
  Phone,
  Building2,
  Briefcase,
  MapPin,
  Edit,
  Trash2,
  Link as LinkIcon,
  PlusCircle,
  CreditCard,
  User,
  StickyNote,
  Radio,
  UserRound,
} from 'lucide-react'
import { useNavigate } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { ContactActionButtons } from '@/components/opportunities/ContactActionButtons'
import {
  assignContactOwner,
  fetchContactDetail,
  getCompanyLabel,
  getContactInitials,
  type ContactSummary,
} from '@/lib/contactApi'
import { fetchOpportunities, mapUserResource, jsonApiPrimaryList } from '@/lib/opportunityApi'
import { queryKeys } from '@/lib/queryClient'
import { useUserRole } from '@/stores/auth'
import { formatCurrency, formatRelativeTime } from '@/lib/utils'
import api from '@/lib/api'

interface ContactSlideOverProps {
  contactId?: string
  contactPreview?: ContactSummary | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onEdit?: (contact: ContactSummary) => void
  onDelete?: (contact: ContactSummary) => void
  onAddOpportunity?: (contact: ContactSummary) => void
  canDelete?: boolean
}

export function ContactSlideOver({
  contactId,
  contactPreview,
  open,
  onOpenChange,
  onEdit,
  onDelete,
  onAddOpportunity,
  canDelete = false,
}: ContactSlideOverProps) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const role = useUserRole()

  const { data: contactDetail, isLoading: detailLoading } = useQuery({
    queryKey: queryKeys.contacts.detail(contactId || ''),
    queryFn: () => fetchContactDetail(contactId!),
    enabled: open && !!contactId,
    staleTime: 0,
  })

  const contact = contactDetail ?? contactPreview ?? null

  const { data: linkedOpportunities = [], isLoading: oppsLoading } = useQuery({
    queryKey: ['contacts', contactId, 'opportunities'],
    queryFn: () => fetchOpportunities({ contact_id: contactId! }),
    enabled: open && !!contactId,
    staleTime: 30_000,
  })

  const { data: assignableUsers = [] } = useQuery({
    queryKey: queryKeys.users.all,
    queryFn: async () => {
      const response = await api.get('/users')
      return jsonApiPrimaryList(response.data)
        .filter((r) => r.id)
        .map(mapUserResource)
    },
    enabled: open && (role === 'admin' || role === 'manager'),
    staleTime: 60_000,
  })

  const assignMutation = useMutation({
    mutationFn: async (ownerUserId: string) => {
      if (!contact?.id) throw new Error('Sin contacto')
      await assignContactOwner(contact.id, ownerUserId)
    },
    onSuccess: () => {
      toast.success('Responsable actualizado')
      queryClient.invalidateQueries({ queryKey: queryKeys.contacts.all })
      if (contact?.id) {
        queryClient.invalidateQueries({ queryKey: queryKeys.contacts.detail(contact.id) })
      }
    },
    onError: () => toast.error('No se pudo reasignar el contacto'),
  })

  if (!open || !contactId) return null

  if (!contact && detailLoading) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-lg p-6">
          <Skeleton className="h-16 w-16 rounded-full mb-4" />
          <Skeleton className="h-6 w-48 mb-2" />
          <Skeleton className="h-32 w-full" />
        </SheetContent>
      </Sheet>
    )
  }

  if (!contact) return null

  const email = contact.email !== '-' ? contact.email : undefined
  const phone = contact.phone !== '-' ? contact.phone : undefined

  const handleViewOpportunities = () => {
    onOpenChange(false)
    void navigate({ to: '/opportunities', search: { view: 'table', contact: contact.id } })
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg p-0">
        <SheetHeader className="p-6 pb-0">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarFallback className="text-lg">{getContactInitials(contact.fullName)}</AvatarFallback>
              </Avatar>
              <div>
                <SheetTitle className="text-xl">{contact.fullName}</SheetTitle>
                <p className="text-sm text-muted-foreground">{contact.position !== '-' ? contact.position : ''}</p>
                <div className="flex gap-1 mt-2 flex-wrap">
                  <Badge variant="secondary" className="text-xs">
                    {contact.kind === 'company' ? 'Empresa' : 'Persona'}
                  </Badge>
                  {contact.sourceLabel ? (
                    <Badge variant="outline" className="text-xs">
                      {contact.sourceLabel}
                    </Badge>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <Button variant="outline" size="sm" className="flex-1" onClick={() => onEdit?.(contact)}>
              <Edit className="mr-2 h-4 w-4" />
              Editar
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-destructive hover:text-destructive"
              disabled={!canDelete}
              onClick={() => onDelete?.(contact)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </SheetHeader>

        <Separator className="my-4" />

        <ScrollArea className="h-[calc(100vh-220px)]">
          <div className="px-6 space-y-6">
            {(phone || email) && (
              <div>
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                  Contactar
                </h3>
                <ContactActionButtons phone={phone} email={email} />
              </div>
            )}

            {(role === 'admin' || role === 'manager') && assignableUsers.length > 0 && (
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <UserRound className="size-3" />
                  Consultor responsable
                </label>
                <Select
                  value={contact.ownerId || undefined}
                  onValueChange={(uid) => assignMutation.mutate(uid)}
                  disabled={assignMutation.isPending}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder={contact.ownerName || 'Asignar'} />
                  </SelectTrigger>
                  <SelectContent>
                    {assignableUsers.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-4">
              <h3 className="text-sm font-medium text-foreground">Información</h3>
              <div className="space-y-3">
                {email && (
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Email</p>
                      <a href={`mailto:${email}`} className="text-sm hover:underline">
                        {email}
                      </a>
                    </div>
                  </div>
                )}

                {phone && (
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Teléfono</p>
                      <a href={`tel:${phone}`} className="text-sm hover:underline font-mono">
                        {phone}
                      </a>
                    </div>
                  </div>
                )}

                {getCompanyLabel(contact.company) !== '-' && (
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Empresa</p>
                      <p className="text-sm">{getCompanyLabel(contact.company)}</p>
                    </div>
                  </div>
                )}

                {contact.position !== '-' && (
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted">
                      <Briefcase className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Cargo</p>
                      <p className="text-sm">{contact.position}</p>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Ubicación</p>
                    <p className="text-sm">
                      {[contact.city, contact.country].filter(Boolean).join(', ') || 'Sin datos'}
                    </p>
                  </div>
                </div>

                {contact.documentId && (
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted">
                      <CreditCard className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">
                        {contact.kind === 'company' ? 'NIT' : 'Cédula'}
                      </p>
                      <p className="text-sm font-mono">{contact.documentId}</p>
                    </div>
                  </div>
                )}

                {contact.ownerName && role !== 'admin' && role !== 'manager' && (
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted">
                      <User className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Responsable</p>
                      <p className="text-sm">{contact.ownerName}</p>
                    </div>
                  </div>
                )}

                {contact.sourceLabel && (
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted">
                      <Radio className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Origen</p>
                      <p className="text-sm">{contact.sourceLabel}</p>
                    </div>
                  </div>
                )}

                {contact.lastContactedAt && (
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Último contacto</p>
                      <p className="text-sm">{formatRelativeTime(contact.lastContactedAt)}</p>
                    </div>
                  </div>
                )}

                {contact.notes && (
                  <div className="flex items-start gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted mt-0.5">
                      <StickyNote className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Notas</p>
                      <p className="text-sm whitespace-pre-wrap">{contact.notes}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <Separator />

            <div className="space-y-3 pb-6">
              <h3 className="text-sm font-medium text-foreground">Oportunidades</h3>
              <div className="rounded-lg border p-3">
                <p className="text-sm text-muted-foreground">Vinculadas</p>
                <p className="text-lg font-semibold">{contact.opportunitiesCount}</p>
              </div>

              {oppsLoading ? (
                <Skeleton className="h-20 w-full" />
              ) : linkedOpportunities.length > 0 ? (
                <ul className="space-y-2">
                  {linkedOpportunities.slice(0, 5).map((opp) => (
                    <li key={opp.id}>
                      <button
                        type="button"
                        className="w-full rounded-lg border px-3 py-2 text-left text-sm hover:bg-muted/60 transition-colors"
                        onClick={() => {
                          onOpenChange(false)
                          void navigate({ to: '/opportunities', search: { selected: opp.id } })
                        }}
                      >
                        <p className="font-medium truncate">{opp.contact_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {opp.stage?.name ?? '—'} · {formatCurrency(opp.estimated_value, opp.currency)}
                        </p>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-muted-foreground">Sin oportunidades aún.</p>
              )}

              <Button className="w-full" onClick={() => onAddOpportunity?.(contact)}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Nueva oportunidad
              </Button>
              <Button variant="outline" className="w-full" onClick={handleViewOpportunities}>
                <LinkIcon className="mr-2 h-4 w-4" />
                Ver todas las oportunidades
              </Button>
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}
