import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
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
  ChevronRight
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
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
import { ContactSlideOver } from '@/components/contacts/ContactSlideOver'
import { ContactDialog } from '@/components/contacts/ContactDialog'
import type { Contact, Company } from '@/types'

export const Route = createFileRoute('/_app/contacts')({
  component: ContactsPage,
})

function ContactsPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [activeTab, setActiveTab] = useState<'contacts' | 'companies'>('contacts')
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
  const [isSlideOverOpen, setIsSlideOverOpen] = useState(false)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 10

  const { data: contactsData, isLoading: isLoadingContacts } = useQuery({
    queryKey: ['contacts', searchTerm, currentPage, pageSize],
    queryFn: async () => {
      // Simulated API call
      await new Promise(resolve => setTimeout(resolve, 500))
      const mockContacts: Contact[] = Array.from({ length: 50 }, (_, i) => ({
        id: `contact-${i + 1}`,
        firstName: ['Carlos', 'Maria', 'Juan', 'Ana', 'Pedro', 'Sofia', 'Luis', 'Laura'][i % 8],
        lastName: ['Garcia', 'Rodriguez', 'Martinez', 'Lopez', 'Gonzalez', 'Hernandez'][i % 6],
        email: `contact${i + 1}@empresa.com`,
        phone: `+34 ${600 + i} ${100 + i * 10} ${200 + i}`,
        company: {
          id: `company-${(i % 5) + 1}`,
          name: ['TechCorp', 'InnoSoft', 'DataSystems', 'CloudNet', 'DevPro'][i % 5],
          domain: `company${(i % 5) + 1}.com`,
          industry: ['Technology', 'Finance', 'Healthcare', 'Retail'][i % 4],
          size: ['1-10', '11-50', '51-200', '201-500', '500+'][i % 5],
          contactsCount: 5 + (i % 10),
          createdAt: new Date(Date.now() - i * 86400000).toISOString(),
          updatedAt: new Date().toISOString(),
        },
        position: ['CEO', 'CTO', 'CFO', 'COO', 'Director', 'Manager', 'Developer'][i % 7],
        linkedOpportunities: i % 3,
        lastInteraction: new Date(Date.now() - i * 86400000 * 2).toISOString(),
        tags: i % 2 === 0 ? ['VIP', 'Decision Maker'] : ['Technical'],
        createdAt: new Date(Date.now() - i * 86400000 * 3).toISOString(),
        updatedAt: new Date().toISOString(),
      }))

      const filtered = mockContacts.filter(
        c => 
          c.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          c.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          c.email.toLowerCase().includes(searchTerm.toLowerCase())
      )

      const start = (currentPage - 1) * pageSize
      const end = start + pageSize

      return {
        contacts: filtered.slice(start, end),
        total: filtered.length,
        page: currentPage,
        pageSize,
        totalPages: Math.ceil(filtered.length / pageSize)
      }
    }
  })

  const { data: companiesData, isLoading: isLoadingCompanies } = useQuery({
    queryKey: ['companies', searchTerm],
    queryFn: async () => {
      await new Promise(resolve => setTimeout(resolve, 500))
      const mockCompanies: Company[] = Array.from({ length: 20 }, (_, i) => ({
        id: `company-${i + 1}`,
        name: ['TechCorp', 'InnoSoft', 'DataSystems', 'CloudNet', 'DevPro', 'SoftWare Inc', 'Digital Solutions', 'IT Masters'][i % 8],
        domain: `company${i + 1}.com`,
        industry: ['Technology', 'Finance', 'Healthcare', 'Retail', 'Manufacturing'][i % 5],
        size: ['1-10', '11-50', '51-200', '201-500', '500+'][i % 5],
        contactsCount: 3 + (i % 10),
        createdAt: new Date(Date.now() - i * 86400000 * 5).toISOString(),
        updatedAt: new Date().toISOString(),
      }))

      return mockCompanies.filter(
        c => c.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    },
    enabled: activeTab === 'companies'
  })

  const handleContactClick = (contact: Contact) => {
    setSelectedContact(contact)
    setIsSlideOverOpen(true)
  }

  const totalPages = contactsData?.totalPages ?? 1

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Contactos</h1>
          <p className="text-sm text-muted-foreground">
            Gestiona tu base de contactos y empresas
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Upload className="mr-2 h-4 w-4" />
            Importar
          </Button>
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Exportar
          </Button>
          <Button size="sm" onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Contacto
          </Button>
        </div>
      </div>

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
              {isLoadingContacts ? (
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
                                <AvatarImage src={`https://avatar.vercel.sh/${contact.email}`} />
                                <AvatarFallback>
                                  {contact.firstName[0]}{contact.lastName[0]}
                                </AvatarFallback>
                              </Avatar>
                              <span className="font-medium">
                                {contact.firstName} {contact.lastName}
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
                              {contact.company?.name ?? '-'}
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
                              {contact.linkedOpportunities}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              {contact.tags?.slice(0, 2).map(tag => (
                                <Badge key={tag} variant="outline" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem>Editar</DropdownMenuItem>
                                <DropdownMenuItem>Ver Oportunidades</DropdownMenuItem>
                                <DropdownMenuItem className="text-destructive">
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {isLoadingCompanies ? (
              Array.from({ length: 6 }).map((_, i) => (
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
              ))
            ) : (
              companiesData?.map((company) => (
                <Card key={company.id} className="hover:border-primary/50 cursor-pointer transition-colors">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                          <Building2 className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-base">{company.name}</CardTitle>
                          <p className="text-sm text-muted-foreground">{company.domain}</p>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>Editar</DropdownMenuItem>
                          <DropdownMenuItem>Ver Contactos</DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive">
                            Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary">{company.industry}</Badge>
                      <Badge variant="outline">{company.size} empleados</Badge>
                    </div>
                    <div className="mt-3 flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {company.contactsCount} contactos
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Contact Slide Over */}
      <ContactSlideOver
        contact={selectedContact}
        open={isSlideOverOpen}
        onOpenChange={setIsSlideOverOpen}
      />

      {/* Create Contact Dialog */}
      <ContactDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
      />
    </div>
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
