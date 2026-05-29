import { createFileRoute, useSearch, useRouter } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { z } from 'zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Plus,
  Search,
  Upload,
  Building2,
  User,
  Mail,
  Phone,
  Briefcase,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  Target,
  RefreshCw,
  Filter,
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { ContactSlideOver } from '@/components/contacts/ContactSlideOver'
import { ContactDialog } from '@/components/contacts/ContactDialog'
import { ContactImportDialog } from '@/components/contacts/ContactImportDialog'
import { ContactEditDialog } from '@/components/contacts/ContactEditDialog'
import { ContactsExportMenu } from '@/components/contacts/ContactsExportMenu'
import { QuickAddOpportunity } from '@/components/opportunities/QuickAddOpportunity'
import { AppPageShell } from '@/components/layout/AppPageShell'
import { PageHeader } from '@/components/layout/PageHeader'
import { useUserRole } from '@/stores/auth'
import api, { formatRailsError } from '@/lib/api'
import {
  contactListErrorMessage,
  deleteContact,
  fetchContactsList,
  getCompanyLabel,
  getContactInitials,
  type ContactSummary,
} from '@/lib/contactApi'
import { jsonApiPrimaryList, mapUserResource } from '@/lib/opportunityApi'
import { queryKeys } from '@/lib/queryClient'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const contactsSearchSchema = z.object({
  selected: z.string().optional(),
  owner: z.string().optional(),
})

export const Route = createFileRoute('/_app/contacts')({
  validateSearch: contactsSearchSchema,
  component: ContactsPage,
})

type ContactRow = ContactSummary

function ContactsPage() {
  const queryClient = useQueryClient()
  const userRole = useUserRole()
  const searchFromUrl = useSearch({ from: '/_app/contacts' })
  const navigate = Route.useNavigate()
  const router = useRouter()
  const [searchInput, setSearchInput] = useState('')
  const [debouncedQ, setDebouncedQ] = useState('')
  const [activeTab, setActiveTab] = useState<'contacts' | 'companies'>('contacts')
  const selectedId = searchFromUrl.selected
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [quickAddContact, setQuickAddContact] = useState<{ id: string; name: string } | null>(null)
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false)
  const [editingContact, setEditingContact] = useState<ContactRow | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [companyPage, setCompanyPage] = useState(1)
  const pageSize = 10
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [confirmDeleteContact, setConfirmDeleteContact] = useState<ContactRow | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const handleRefresh = async () => {
    setRefreshing(true)
    await queryClient.invalidateQueries({ queryKey: queryKeys.contacts.all })
    setRefreshing(false)
  }

  const showOwnerFilter = userRole === 'admin' || userRole === 'manager'
  const canImportContacts =
    userRole === 'admin' || userRole === 'manager' || userRole === 'consultant'

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedQ(searchInput.trim()), 350)
    return () => window.clearTimeout(t)
  }, [searchInput])

  useEffect(() => {
    setCurrentPage(1)
    setCompanyPage(1)
  }, [debouncedQ, searchFromUrl.owner])

  const { data: users = [] } = useQuery({
    queryKey: queryKeys.users.all,
    queryFn: async () => {
      const response = await api.get('/users')
      return jsonApiPrimaryList(response.data)
        .filter((r) => r.id)
        .map(mapUserResource)
    },
    enabled: showOwnerFilter,
    staleTime: 60_000,
  })

  const listFiltersPerson = useMemo(
    () => ({
      q: debouncedQ.length >= 2 ? debouncedQ : undefined,
      kind: 'person' as const,
      owner_id: searchFromUrl.owner,
      page: currentPage,
      items: pageSize,
    }),
    [debouncedQ, searchFromUrl.owner, currentPage],
  )

  const listFiltersCompany = useMemo(
    () => ({
      q: debouncedQ.length >= 2 ? debouncedQ : undefined,
      kind: 'company' as const,
      owner_id: searchFromUrl.owner,
      page: companyPage,
      items: pageSize,
    }),
    [debouncedQ, searchFromUrl.owner, companyPage],
  )

  const {
    data: contactsData,
    isLoading: isLoadingContacts,
    isError: contactsError,
    error: contactsQueryError,
    refetch: refetchContacts,
  } = useQuery({
    queryKey: queryKeys.contacts.list(listFiltersPerson),
    queryFn: () => fetchContactsList(listFiltersPerson),
  })

  const {
    data: companiesData,
    isLoading: isLoadingCompanies,
    isError: companiesError,
    error: companiesQueryError,
    refetch: refetchCompanies,
  } = useQuery({
    queryKey: queryKeys.contacts.list(listFiltersCompany),
    queryFn: () => fetchContactsList(listFiltersCompany),
    enabled: activeTab === 'companies',
  })

  const selectedPreview = useMemo(() => {
    if (!selectedId) return null
    return (
      contactsData?.contacts.find((c) => c.id === selectedId) ??
      companiesData?.contacts.find((c) => c.id === selectedId) ??
      null
    )
  }, [selectedId, contactsData, companiesData])

  const handleContactClick = (contact: ContactRow) => {
    void navigate({ search: (prev) => ({ ...prev, selected: contact.id }) })
  }

  const totalPages = contactsData?.totalPages ?? 1
  const companyTotalPages = companiesData?.totalPages ?? 1
  const canDeleteContacts = userRole === 'admin'


  const openEditDialog = (contact: ContactRow) => {
    setEditingContact(contact)
    setIsEditDialogOpen(true)
  }

  const deleteContactMutation = useMutation({
    mutationFn: async (contact: ContactRow) => deleteContact(contact.id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.contacts.all })
      toast.success('Contacto eliminado')
      setConfirmDeleteContact(null)
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
    setConfirmDeleteContact(contact)
  }


  const activeKind = activeTab === 'companies' ? 'company' : 'person'

  return (
    <AppPageShell contentClassName="gap-8">
      <PageHeader
        title="Contactos"
        description="Gestiona tu base de contactos y empresas"
      >
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5"
          onClick={handleRefresh}
          disabled={refreshing}
          title="Actualizar contactos"
        >
          <RefreshCw className={`size-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Actualizar</span>
        </Button>
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
        <ContactsExportMenu kind={activeKind} ownerId={searchFromUrl.owner} />
        <Button size="sm" className="shadow-sm" onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo contacto
        </Button>
      </PageHeader>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'contacts' | 'companies')}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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

          <div className="flex flex-wrap items-center gap-2">
            {showOwnerFilter && (
              <Select
                value={searchFromUrl.owner ?? '__all__'}
                onValueChange={(v) =>
                  navigate({ search: (prev) => ({ ...prev, owner: v === '__all__' ? undefined : v }) })
                }
              >
                <SelectTrigger className="h-9 w-[150px] text-sm">
                  <SelectValue placeholder="Consultor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Todos</SelectItem>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {searchFromUrl.owner && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-9 text-xs gap-1"
                onClick={() => navigate({ search: (prev) => ({ ...prev, owner: undefined }) })}
              >
                <Filter className="size-3" />
                Limpiar filtro
              </Button>
            )}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar (mín. 2 letras)..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-9 w-56 sm:w-64"
              />
            </div>
          </div>
        </div>

        <TabsContent value="contacts" className="mt-4">
          <Card>
            <CardContent className="p-0">
              {contactsError ? (
                <div className="p-6 space-y-3">
                  <p className="text-sm text-destructive">
                    {contactListErrorMessage(contactsQueryError)}
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
                        <TableHead>Origen</TableHead>
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
                                  {getContactInitials(contact.fullName)}
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
                            {contact.sourceLabel ? (
                              <Badge variant="outline" className="text-xs">
                                {contact.sourceLabel}
                              </Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
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
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    void router.navigate({ to: '/opportunities', search: { contact: contact.id } })
                                  }}
                                >
                                  Ver Oportunidades
                                </DropdownMenuItem>
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
                    {contactListErrorMessage(companiesQueryError)}
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
                    {(companiesData?.contacts.length ?? 0) === 0 ? (
                      <div className="col-span-full flex flex-col items-center justify-center py-12 text-center text-sm text-muted-foreground">
                        <Building2 className="size-10 mb-3 opacity-50" />
                        <p>No hay empresas registradas con los filtros actuales.</p>
                      </div>
                    ) : (
                      companiesData?.contacts.map((company) => {
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

                  {(companiesData?.contacts.length ?? 0) > 0 && (
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
        contactId={selectedId}
        contactPreview={selectedPreview}
        open={!!selectedId}
        onOpenChange={(open) => {
          if (!open) void navigate({ search: (prev) => ({ ...prev, selected: undefined }) })
        }}
        onEdit={(c) => openEditDialog(c)}
        onDelete={(c) => handleDeleteContact(c)}
        onAddOpportunity={(contact) => {
          void navigate({ search: (prev) => ({ ...prev, selected: undefined }) })
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
          setSearchInput('')
          setDebouncedQ('')
        }}
      />

      <ContactImportDialog open={importDialogOpen} onOpenChange={setImportDialogOpen} />

      <AlertDialog
        open={!!confirmDeleteContact}
        onOpenChange={(o) => { if (!o) setConfirmDeleteContact(null) }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar contacto</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Eliminar a <strong>{confirmDeleteContact?.fullName}</strong>? Esta acción no se puede deshacer y eliminará también sus oportunidades vinculadas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => { if (confirmDeleteContact) deleteContactMutation.mutate(confirmDeleteContact) }}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ContactEditDialog
        contactId={editingContact?.id ?? null}
        initialData={editingContact ? {
          firstName:  editingContact.firstName,
          lastName:   editingContact.lastName,
          email:      editingContact.email === '-' ? '' : editingContact.email,
          phone:      editingContact.phone === '-' ? '' : editingContact.phone,
          company:    getCompanyLabel(editingContact.company) === '-' ? '' : getCompanyLabel(editingContact.company),
          position:   editingContact.position === '-' ? '' : editingContact.position,
          documentId: editingContact.documentId ?? '',
        } : undefined}
        open={isEditDialogOpen}
        onOpenChange={(open) => {
          setIsEditDialogOpen(open)
          if (!open) setEditingContact(null)
        }}
      />
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
