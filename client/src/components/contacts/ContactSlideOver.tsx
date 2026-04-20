import { 
  Mail, 
  Phone, 
  Building2, 
  Briefcase, 
  Calendar,
  ExternalLink,
  Edit,
  Trash2,
  Link as LinkIcon
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import type { Contact } from '@/types'
import { formatDate } from '@/lib/utils'

interface ContactSlideOverProps {
  contact: Contact | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ContactSlideOver({ contact, open, onOpenChange }: ContactSlideOverProps) {
  if (!contact) return null

  const mockActivities = [
    { id: 1, type: 'email', description: 'Email enviado', date: new Date(Date.now() - 86400000).toISOString() },
    { id: 2, type: 'call', description: 'Llamada realizada', date: new Date(Date.now() - 86400000 * 2).toISOString() },
    { id: 3, type: 'meeting', description: 'Reunion programada', date: new Date(Date.now() - 86400000 * 3).toISOString() },
    { id: 4, type: 'note', description: 'Nota agregada', date: new Date(Date.now() - 86400000 * 5).toISOString() },
  ]

  const mockOpportunities = [
    { id: 1, name: 'Proyecto CRM', stage: 'Propuesta', value: 25000 },
    { id: 2, name: 'Consultoria IT', stage: 'Negociacion', value: 15000 },
  ]

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg p-0">
        <SheetHeader className="p-6 pb-0">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={`https://avatar.vercel.sh/${contact.email}`} />
                <AvatarFallback className="text-lg">
                  {contact.firstName[0]}{contact.lastName[0]}
                </AvatarFallback>
              </Avatar>
              <div>
                <SheetTitle className="text-xl">
                  {contact.firstName} {contact.lastName}
                </SheetTitle>
                <p className="text-sm text-muted-foreground">{contact.position}</p>
                <div className="flex gap-1 mt-2">
                  {contact.tags?.map(tag => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex gap-2 mt-4">
            <Button variant="outline" size="sm" className="flex-1">
              <Edit className="mr-2 h-4 w-4" />
              Editar
            </Button>
            <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
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

                {contact.company && (
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Empresa</p>
                      <p className="text-sm">{contact.company.name}</p>
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
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Ultima Interaccion</p>
                    <p className="text-sm">{formatDate(contact.lastInteraction)}</p>
                  </div>
                </div>
              </div>
            </div>

            <Separator className="my-6" />

            {/* Tabs for Activities and Opportunities */}
            <Tabs defaultValue="activities" className="w-full">
              <TabsList className="w-full">
                <TabsTrigger value="activities" className="flex-1">Actividad</TabsTrigger>
                <TabsTrigger value="opportunities" className="flex-1">Oportunidades</TabsTrigger>
              </TabsList>

              <TabsContent value="activities" className="mt-4">
                <div className="space-y-4">
                  {mockActivities.map((activity) => (
                    <div key={activity.id} className="flex items-start gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                        <div className="h-2 w-2 rounded-full bg-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm">{activity.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(activity.date)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="opportunities" className="mt-4">
                <div className="space-y-3">
                  {mockOpportunities.map((opp) => (
                    <div 
                      key={opp.id} 
                      className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
                          <LinkIcon className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{opp.name}</p>
                          <Badge variant="secondary" className="text-xs">
                            {opp.stage}
                          </Badge>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">
                          {new Intl.NumberFormat('es-ES', { 
                            style: 'currency', 
                            currency: 'EUR' 
                          }).format(opp.value)}
                        </p>
                        <ExternalLink className="h-3 w-3 text-muted-foreground" />
                      </div>
                    </div>
                  ))}

                  <Button variant="outline" className="w-full mt-2">
                    <LinkIcon className="mr-2 h-4 w-4" />
                    Vincular Oportunidad
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}
