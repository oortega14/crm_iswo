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
} from 'lucide-react'
import { useNavigate } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'

interface ContactDetails {
  id: string
  fullName: string
  email: string
  phone: string
  company: unknown
  position: string
  opportunitiesCount: number
  kind: 'person' | 'company'
  city?: string
  country?: string
  notes?: string
  documentId?: string
  ownerName?: string
  sourceLabel?: string
}

const getInitialsSafe = (value: string | undefined): string => {
  if (!value) return '--'
  return value
    .trim()
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

const getCompanyLabel = (company: unknown): string => {
  if (!company) return '-'
  if (typeof company === 'string') return company
  if (typeof company === 'object' && company !== null && 'name' in company) {
    const name = (company as { name?: unknown }).name
    return typeof name === 'string' && name.trim() ? name : '-'
  }
  return '-'
}

interface ContactSlideOverProps {
  contact: ContactDetails | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onEdit?: (contact: ContactDetails) => void
  onDelete?: (contact: ContactDetails) => void
  onAddOpportunity?: (contact: ContactDetails) => void
  canDelete?: boolean
}

export function ContactSlideOver({
  contact,
  open,
  onOpenChange,
  onEdit,
  onDelete,
  onAddOpportunity,
  canDelete = false,
}: ContactSlideOverProps) {
  const navigate = useNavigate()

  if (!contact) return null

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
                <AvatarFallback className="text-lg">
                  {getInitialsSafe(contact.fullName)}
                </AvatarFallback>
              </Avatar>
              <div>
                <SheetTitle className="text-xl">
                  {contact.fullName}
                </SheetTitle>
                <p className="text-sm text-muted-foreground">{contact.position}</p>
                <div className="flex gap-1 mt-2">
                  <Badge variant="secondary" className="text-xs">
                    {contact.kind === 'company' ? 'Empresa' : 'Persona'}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex gap-2 mt-4">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => onEdit?.(contact)}
            >
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
          <div className="px-6">
            {/* Contact Info */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-foreground">Informacion de Contacto</h3>
              
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Email</p>
                    <a href={`mailto:${contact.email}`} className="text-sm hover:underline">
                      {contact.email}
                    </a>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Telefono</p>
                    <a href={`tel:${contact.phone}`} className="text-sm hover:underline">
                      {contact.phone}
                    </a>
                  </div>
                </div>

                {contact.company != null && (
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

                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted">
                    <Briefcase className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Cargo</p>
                    <p className="text-sm">{contact.position}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Ubicacion</p>
                    <p className="text-sm">{[contact.city, contact.country].filter(Boolean).join(', ') || 'Sin datos'}</p>
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

                {contact.ownerName && (
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

            <Separator className="my-6" />
            <div className="space-y-3 pb-6">
              <h3 className="text-sm font-medium text-foreground">Resumen</h3>
              <div className="rounded-lg border p-3">
                <p className="text-sm text-muted-foreground">Oportunidades vinculadas</p>
                <p className="text-lg font-semibold">{contact.opportunitiesCount}</p>
              </div>
              <Button className="w-full" onClick={() => onAddOpportunity?.(contact)}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Nueva Oportunidad
              </Button>
              <Button variant="outline" className="w-full" onClick={handleViewOpportunities}>
                <LinkIcon className="mr-2 h-4 w-4" />
                Ver oportunidades
              </Button>
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}
