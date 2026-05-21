import { createFileRoute, useSearch } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { z } from 'zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { 
  Plus, 
  Search, 
  Upload, 
  Download, 
  Filter, 
  Building2, 
  User,
  Mail,
  Phone,
  Briefcase,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  Target,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { ContactSlideOver } from '@/components/contacts/ContactSlideOver'
import { ContactDialog } from '@/components/contacts/ContactDialog'
import { ContactImportDialog } from '@/components/contacts/ContactImportDialog'
import { QuickAddOpportunity } from '@/components/opportunities/QuickAddOpportunity'
import { AppPageShell } from '@/components/layout/AppPageShell'
import { PageHeader } from '@/components/layout/PageHeader'
import { useUserRole } from '@/stores/auth'
import api, { formatRailsError } from '@/lib/api'
import { jsonApiPrimaryList, jsonApiPrimaryOne } from '@/lib/opportunityApi'
import { queryKeys } from '@/lib/queryClient'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'

const contactsSearchSchema = z.object({
  selected: z.string().optional(),
})

export const Route = createFileRoute('/_app/contacts')({
  validateSearch: contactsSearchSchema,
  component: ContactsPage,
})

interface ContactRow {
  id: string
  fullName: string
  firstName: string
  lastName: string
  email: string
  phone: string
  company: unknown
  position: string
  opportunitiesCount: number
  kind: 'person' | 'company'
  city?: string
  country?: string
  notes?: string
  /** Etiqueta de origen / fuente (API: source_label) */
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

type ContactAttributes = {
  kind: 'person' | 'company'
  first_name?: string
  last_name?: string
  full_name?: string
  email?: string
  phone_e164?: string
  phone_display?: string
  company?: string
  position?: string
  city?: string
  country?: string
  notes?: string
  opportunities_count?: number
  source_label?: string
}

type JsonApiContact = {
  id: string
  attributes: ContactAttributes
}

const mapContact = (resource: JsonApiContact): ContactRow => {
  const attrs = resource.attributes
  const fallbackName = [attrs.first_name, attrs.last_name].filter(Boolean).join(' ').trim()
  return {
    id: resource.id,
    fullName: attrs.full_name || fallbackName || attrs.email || 'Sin nombre',
    firstName: attrs.first_name || '',
    lastName: attrs.last_name || '',
    email: attrs.email || '-',
    phone: attrs.phone_display || attrs.phone_e164 || '-',
    company: attrs.company || '-',
    position: attrs.position || '-',
    opportunitiesCount: attrs.opportunities_count || 0,
    kind: attrs.kind || 'person',
    city: attrs.city,
    country: attrs.country,
    notes: attrs.notes,
    sourceLabel: attrs.source_label?.trim() || undefined,
  }
}

function ContactsPage() {
  const queryClient = useQueryClient()
  const userRole = useUserRole()
  const searchFromUrl = useSearch({ from: '/_app/contacts' })
  const navigate = Route.useNavigate()
  const [searchTerm, setSearchTerm] = useState('')
  const [activeTab, setActiveTab] = useState<'contacts' | 'companies'>('contacts')
  const [selectedContact, setSelectedContact] = useState<ContactRow | null>(null)
  const [isSlideOverOpen, setIsSlideOverOpen] = useState(false)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [quickAddContact, setQuickAddContact] = useState<{ id: string; name: string } | null>(null)
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false)
  const [editingContact, setEditingContact] = useState<ContactRow | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editFormData, setEditFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    company: '',
    position: '',
  })
  const [currentPage, setCurrentPage] = useState(1)
  const [companyPage, setCompanyPage] = useState(1)
  const pageSize = 10
  const [importDialogOpen, setImportDialogOpen] = useState(false)

  const canExportContacts = userRole === 'admin' || userRole === 'manager'
  const canImportContacts =
    userRole === 'admin' || userRole === 'manager' || userRole === 'consultant'

  const {
    data: contactsData,
    isLoading: isLoadingContacts,
    isError: contactsError,
    error: contactsQueryError,
    refetch: refetchContacts,
  } = useQuery({
    queryKey: queryKeys.contacts.list({ q: searchTerm, page: currentPage, pageSize, kind: 'person' }),
    queryFn: async () => {
      const response = await api.get('/contacts', {
        params: {
          q: searchTerm || undefined,
          kind: 'person',
          page: currentPage,
          items: pageSize,
        },
      })
      const rows = jsonApiPrimaryList(response.data)
      const pagination = (response.data as { meta?: { pagination?: { count?: number; page?: number; pages?: number } } })
        ?.meta?.pagination
      const resources = rows.filter((r) => r.id).map((r) => ({
        id: String(r.id),
        attributes: (r.attributes ?? {}) as ContactAttributes,
      }))
      return {
        contacts: resources.map(mapContact),
        total: pagination?.count ?? resources.length,
        page: pagination?.page ?? currentPage,
        pageSize,
        totalPages: pagination?.pages ?? 1,
      }
    },
  })

  const {
    data: companiesData,
    isLoading: isLoadingCompanies,
    isError: companiesError,
    error: companiesQueryError,
    refetch: refetchCompanies,
  } = useQuery({
    queryKey: queryKeys.contacts.list({
      q: searchTerm,
      page: companyPage,
      pageSize,
      kind: 'company',
    }),
    queryFn: async () => {
      const response = await api.get('/contacts', {
        params: {
          q: searchTerm || undefined,
          kind: 'company',
          page: companyPage,
          items: pageSize,
        },
      })
      const rows = jsonApiPrimaryList(response.data)
      const pagination = (
        response.data as {
          meta?: { pagination?: { count?: number; page?: number; pages?: number } }
        }
      )?.meta?.pagination
      const resources = rows.filter((r) => r.id).map((r) => ({
        id: String(r.id),
        attributes: (r.attributes ?? {}) as ContactAttributes,
      }))
      return {
        companies: resources.map(mapContact),
        total: pagination?.count ?? resources.length,
        page: pagination?.page ?? companyPage,
        pageSize,
        totalPages: pagination?.pages ?? 1,
      }
    },
    enabled: activeTab === 'companies',
  })

  const selectedIdFromUrl = searchFromUrl.selected

  useEffect(() => {
    if (!selectedIdFromUrl) {
      return
    }

    const inList = contactsData?.contacts.find((c) => c.id === selectedIdFromUrl)
    if (inList) {
      setSelectedContact(inList)
      setIsSlideOverOpen(true)
      return
    }

    if (contactsData === undefined) return

    let cancelled = false
    void (async () => {
      try {
        const response = await api.get(`/contacts/${selectedIdFromUrl}`)
        const one = jsonApiPrimaryOne(response.data)
        if (cancelled || !one) return
        setSelectedContact(
          mapContact({ id: one.id, attributes: (one.attributes ?? {}) as ContactAttributes })
        )
        setIsSlideOverOpen(true)
      } catch {
        toast.error('No se encontró el contacto')
        void navigate({ search: (prev) => ({ ...prev, selected: undefined }) })
      }
    })()
    return () => {
      cancelled = true
    }
  }, [selectedIdFromUrl, contactsData, navigate])

  const handleContactClick = (contact: ContactRow) => {
    setSelectedContact(contact)
    setIsSlideOverOpen(true)
    void navigate({ search: (prev) => ({ ...prev, selected: contact.id }) })
  }

  const totalPages = contactsData?.totalPages ?? 1
  const companyTotalPages = companiesData?.totalPages ?? 1
  const canDeleteContacts = userRole === 'admin'

  useEffect(() => {
    setCompanyPage(1)
  }, [searchTerm])

  const openEditDialog = (contact: ContactRow) => {
    setEditingContact(contact)
    setEditFormData({
      firstName: contact.firstName,
      lastName: contact.lastName,
      email: contact.email === '-' ? '' : contact.email,
      phone: contact.phone === '-' ? '' : contact.phone,
      company: getCompanyLabel(contact.company) === '-' ? '' : getCompanyLabel(contact.company),
      position: contact.position === '-' ? '' : contact.position,
    })
    setIsEditDialogOpen(true)
  }

  const updateContactMutation = useMutation({
    mutationFn: async () => {
      if (!editingContact) throw new Error('No hay contacto seleccionado')
      return api.patch(`/contacts/${editingContact.id}`, {
        contact: {
          first_name: editFormData.firstName || undefined,
          last_name: editFormData.lastName || undefined,
          email: editFormData.email || undefined,
          phone_e164: editFormData.phone || undefined,
          company: editFormData.company || undefined,
          position: editFormData.position || undefined,
        },
      })
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.contacts.all })
      toast.success('Contacto actualizado')
      setIsEditDialogOpen(false)
      setEditingContact(null)
    },
    onError: (err: unknown) => {
      toast.error(formatRailsError(err, 'No se pudo actualizar el contacto'))
    },
  })

  const deleteContactMutation = useMutation({
    mutationFn: async (contact: ContactRow) => api.delete(`/contacts/${contact.id}`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.contacts.all })
      toast.success('Contacto eliminado')
      setIsSlideOverOpen(false)
      setSelectedContact(null)
      void navigate({ search: (prev) => ({ ...prev, selected: undefined }) })
    },
    onError: (err: unknown) => {
      toast.error(formatRailsError(err, 'No se pudo eliminar el contacto'))
    },
  })

  const handleDeleteContact = (contact: ContactRow) => {
    if (!canDeleteContacts) {
      toast.error('Solo un administrador puede eliminar contactos')
      return
    }
    if (!window.confirm(`Eliminar contacto "${contact.fullName}"?`)) return
    deleteContactMutation.mutate(contact)
  }

  const handleEditInputChange = (field: keyof typeof editFormData, value: string) => {
    setEditFormData((prev) => ({ ...prev, [field]: value }))
  }

  const exportContactsMutation = useMutation({
    mutationFn: async () => {
      const filters =
        activeTab === 'companies' ? { kind_eq: 'company' } : { kind_eq: 'person' }
      return api.post('/contacts/export', {
        export_format: 'xlsx',
        filters,
      })
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.exports.all })
      toast.success(
        'Exportación iniciada. Cuando esté lista podrás descargar el archivo en Exportaciones.'
      )
    },
    onError: (err: unknown) => {
      toast.error(formatRailsError(err, 'No se pudo iniciar la exportación'))
    },
  })

  return (
    <AppPageShell contentClassName="gap-8">
      <PageHeader
        title="Contactos"
        description="Gestiona tu base de contactos y empresas"
      >
        <Button
          variant="outline"
          size="sm"
          disabled={!canImportContacts}
          title={
            canImportContacts
              ? 'Importar desde archivo Excel (.xlsx)'
              : 'Solo consultores, managers y administradores pueden importar'
          }
          onClick={() => setImportDialogOpen(true)}
        >
          <Upload className="mr-2 h-4 w-4" />
          Importar
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={!canExportContacts || exportContactsMutation.isPending}
          title={
            canExportContacts
              ? `Exportar ${activeTab === 'companies' ? 'empresas' : 'contactos'} a Excel (asíncrono)`
              : 'Solo managers y administradores pueden exportar'
          }
          onClick={() => exportContactsMutation.mutate()}
        >
          <Download className="mr-2 h-4 w-4" />
          {exportContactsMutation.isPending ? 'Exportando…' : 'Exportar'}
        </Button>
        <Button size="sm" className="shadow-sm" onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo contacto
        </Button>
      </PageHeader>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'contacts' | 'companies')}>
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="contacts" className="gap-2">
              <User className="h-4 w-4" />
              Contactos
            </TabsTrigger>
            <TabsTrigger value="companies" className="gap-2">
              <Building2 className="h-4 w-4" />
              Empresas
            </TabsTrigger>
          </TabsList>
          
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 w-64"
              />
            </div>
            <Button variant="outline" size="icon">
              <Filter className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <TabsContent value="contacts" className="mt-4">
          <Card>
            <CardContent className="p-0">
              {contactsError ? (
                <div className="p-6 space-y-3">
                  <p className="text-sm text-destructive">
                    {formatRailsError(contactsQueryError, 'No se pudieron cargar los contactos')}
                  </p>
                  <Button type="button" variant="outline" size="sm" onClick={() => void refetchContacts()}>
                    Reintentar
                  </Button>
                </div>
              ) : isLoadingContacts ? (
                <ContactsTableSkeleton />
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nombre</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Telefono</TableHead>
                        <TableHead>Empresa</TableHead>
                        <TableHead>Cargo</TableHead>
                        <TableHead>Oportunidades</TableHead>
                        <TableHead>Tags</TableHead>
                        <TableHead className="w-10"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {contactsData?.contacts.map((contact) => (
                        <TableRow 
                          key={contact.id} 
                          className="cursor-pointer"
                          onClick={() => handleContactClick(contact)}
                        >
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarFallback>
                                  {getInitialsSafe(contact.fullName)}
                                </AvatarFallback>
                              </Avatar>
                              <span className="font-medium">
                                {contact.fullName}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Mail className="h-3 w-3" />
                              {contact.email}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Phone className="h-3 w-3" />
                              {contact.phone}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Building2 className="h-3 w-3 text-muted-foreground" />
                              {getCompanyLabel(contact.company)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Briefcase className="h-3 w-3 text-muted-foreground" />
                              {contact.position ?? '-'}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">
                              {contact.opportunitiesCount}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {contact.kind}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    openEditDialog(contact)
                                  }}
                                >
                                  Editar
                                </DropdownMenuItem>
                                <DropdownMenuItem>Ver Oportunidades</DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleDeleteContact(contact)
                                  }}
                                >
                                  Eliminar
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  {/* Pagination */}
                  <div className="flex items-center justify-between border-t px-4 py-3">
                    <p className="text-sm text-muted-foreground">
                      Mostrando {((currentPage - 1) * pageSize) + 1} - {Math.min(currentPage * pageSize, contactsData?.total ?? 0)} de {contactsData?.total ?? 0} contactos
                    </p>
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage(p => p - 1)}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="text-sm">
                        Pagina {currentPage} de {totalPages}
                      </span>
                      <Button 
                        variant="outline" 
                        size="sm"
                        disabled={currentPage === totalPages}
                        onClick={() => setCurrentPage(p => p + 1)}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="companies" className="mt-4">
          <Card>
            <CardContent className="p-0">
              {companiesError ? (
                <div className="p-6 space-y-3">
                  <p className="text-sm text-destructive">
                    {formatRailsError(companiesQueryError, 'No se pudieron cargar las empresas')}
                  </p>
                  <Button type="button" variant="outline" size="sm" onClick={() => void refetchCompanies()}>
                    Reintentar
                  </Button>
                </div>
              ) : isLoadingCompanies ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Card key={i}>
                      <CardHeader>
                        <Skeleton className="h-6 w-32" />
                        <Skeleton className="h-4 w-24" />
                      </CardHeader>
                      <CardContent>
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-3/4 mt-2" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
                    {(companiesData?.companies.length ?? 0) === 0 ? (
                      <div className="col-span-full flex flex-col items-center justify-center py-12 text-center text-sm text-muted-foreground">
                        <Building2 className="size-10 mb-3 opacity-50" />
                        <p>No hay empresas registradas con los filtros actuales.</p>
                      </div>
                    ) : (
                      companiesData?.companies.map((company) => {
                        const secondaryLine = company.sourceLabel?.trim()
                          ? `Origen: ${company.sourceLabel.trim()}`
                          : [company.city, company.country].filter(Boolean).join(', ') ||
                            (company.email && company.email !== '-' ? company.email : '')
                        return (
                          <Card
                            key={company.id}
                            role="button"
                            tabIndex={0}
                            className="hover:border-primary/50 cursor-pointer transition-colors"
                            onClick={() => handleContactClick(company)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault()
                                handleContactClick(company)
                              }
                            }}
                          >
                            <CardHeader className="pb-2">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-3 min-w-0">
                                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                                    <Building2 className="h-5 w-5 text-primary" />
                                  </div>
                                  <div className="min-w-0">
                                    <CardTitle className="text-base truncate">{company.fullName}</CardTitle>
                                    {secondaryLine ? (
                                      <p className="text-sm text-muted-foreground truncate" title={secondaryLine}>
                                        {secondaryLine}
                                      </p>
                                    ) : null}
                                  </div>
                                </div>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        openEditDialog(company)
                                      }}
                                    >
                                      Editar
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      className="text-destructive"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        handleDeleteContact(company)
                                      }}
                                    >
                                      Eliminar
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </CardHeader>
                            <CardContent>
                              <div className="flex flex-wrap gap-2">
                                <Badge variant="secondary">Empresa</Badge>
                              </div>
                              <div className="mt-3 flex items-center gap-4 text-sm text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Target className="h-3 w-3" aria-hidden />
                                  {company.opportunitiesCount} oportunidades
                                </span>
                              </div>
                            </CardContent>
                          </Card>
                        )
                      })
                    )}
                  </div>

                  {(companiesData?.companies.length ?? 0) > 0 && (
                    <div className="flex items-center justify-between border-t px-4 py-3">
                      <p className="text-sm text-muted-foreground">
                        Mostrando {(companyPage - 1) * pageSize + 1} -{' '}
                        {Math.min(companyPage * pageSize, companiesData?.total ?? 0)} de{' '}
                        {companiesData?.total ?? 0} empresas
                      </p>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={companyPage === 1}
                          onClick={() => setCompanyPage((p) => p - 1)}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="text-sm">
                          Página {companyPage} de {companyTotalPages}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={companyPage >= companyTotalPages}
                          onClick={() => setCompanyPage((p) => p + 1)}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Contact Slide Over */}
      <ContactSlideOver
        contact={selectedContact}
        open={isSlideOverOpen}
        onOpenChange={(open) => {
          setIsSlideOverOpen(open)
          if (!open) {
            setSelectedContact(null)
            void navigate({ search: (prev) => ({ ...prev, selected: undefined }) })
          }
        }}
        onEdit={openEditDialog}
        onDelete={handleDeleteContact}
        onAddOpportunity={(contact) => {
          setIsSlideOverOpen(false)
          setQuickAddContact({ id: contact.id, name: contact.fullName })
          setIsQuickAddOpen(true)
        }}
        canDelete={canDeleteContacts}
      />

      {/* Quick Add Opportunity para contacto existente */}
      <QuickAddOpportunity
        open={isQuickAddOpen}
        onOpenChange={(open) => {
          setIsQuickAddOpen(open)
          if (!open) setQuickAddContact(null)
        }}
        prefilledContact={quickAddContact ?? undefined}
      />

      {/* Create Contact Dialog */}
      <ContactDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onCreated={() => {
          setCurrentPage(1)
          setSearchTerm('')
        }}
      />

      <ContactImportDialog open={importDialogOpen} onOpenChange={setImportDialogOpen} />

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar contacto</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault()
              updateContactMutation.mutate()
            }}
          >
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-first-name">Nombre</Label>
                <Input
                  id="edit-first-name"
                  value={editFormData.firstName}
                  onChange={(e) => handleEditInputChange('firstName', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-last-name">Apellido</Label>
                <Input
                  id="edit-last-name"
                  value={editFormData.lastName}
                  onChange={(e) => handleEditInputChange('lastName', e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={editFormData.email}
                onChange={(e) => handleEditInputChange('email', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-phone">Telefono</Label>
              <Input
                id="edit-phone"
                value={editFormData.phone}
                onChange={(e) => handleEditInputChange('phone', e.target.value)}
                placeholder="+57..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-company">Empresa</Label>
              <Input
                id="edit-company"
                value={editFormData.company}
                onChange={(e) => handleEditInputChange('company', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-position">Cargo</Label>
              <Input
                id="edit-position"
                value={editFormData.position}
                onChange={(e) => handleEditInputChange('position', e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={updateContactMutation.isPending}>
                Guardar cambios
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppPageShell>
  )
}

function ContactsTableSkeleton() {
  return (
    <div className="p-4 space-y-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-16" />
        </div>
      ))}
    </div>
  )
}
