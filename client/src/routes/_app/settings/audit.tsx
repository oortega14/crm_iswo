import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { 
  Search,
  Filter,
  Download,
  User,
  Settings,
  FileText,
  Users,
  Calendar,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatDate, cn } from '@/lib/utils'

export const Route = createFileRoute('/_app/settings/audit')({
  component: AuditSettingsPage,
})

interface AuditLog {
  id: string
  action: string
  entity: string
  entityId: string
  entityName: string
  user: {
    id: string
    name: string
    email: string
    avatar: string
  }
  details?: string
  ip?: string
  createdAt: string
}

function AuditSettingsPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [actionFilter, setActionFilter] = useState<string>('all')
  const [entityFilter, setEntityFilter] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 15

  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs', searchTerm, actionFilter, entityFilter, currentPage],
    queryFn: async () => {
      await new Promise(resolve => setTimeout(resolve, 500))
      
      const actions = ['create', 'update', 'delete', 'login', 'export', 'import', 'settings']
      const entities = ['opportunity', 'contact', 'company', 'user', 'pipeline', 'reminder']
      
      const mockLogs: AuditLog[] = Array.from({ length: 100 }, (_, i) => {
        const action = actions[i % actions.length]
        const entity = entities[i % entities.length]
        const users = [
          { id: 'user-1', name: 'Carlos Admin', email: 'admin@iswo.com' },
          { id: 'user-2', name: 'Maria Ventas', email: 'maria@iswo.com' },
          { id: 'user-3', name: 'Juan Consultor', email: 'juan@iswo.com' },
        ]
        const user = users[i % users.length]
        
        return {
          id: `log-${i + 1}`,
          action,
          entity,
          entityId: `${entity}-${(i % 10) + 1}`,
          entityName: `${entity.charAt(0).toUpperCase() + entity.slice(1)} ${(i % 10) + 1}`,
          user: {
            ...user,
            avatar: `https://avatar.vercel.sh/${user.email}`
          },
          details: action === 'update' 
            ? 'Campo "estado" cambiado de "Propuesta" a "Negociacion"'
            : action === 'login'
            ? 'Inicio de sesion exitoso'
            : action === 'export'
            ? 'Exportacion de 150 registros'
            : undefined,
          ip: `192.168.1.${(i % 255) + 1}`,
          createdAt: new Date(Date.now() - i * 3600000).toISOString(),
        }
      })

      let filtered = mockLogs

      if (searchTerm) {
        filtered = filtered.filter(
          log => 
            log.entityName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            log.user.name.toLowerCase().includes(searchTerm.toLowerCase())
        )
      }

      if (actionFilter !== 'all') {
        filtered = filtered.filter(log => log.action === actionFilter)
      }

      if (entityFilter !== 'all') {
        filtered = filtered.filter(log => log.entity === entityFilter)
      }

      const start = (currentPage - 1) * pageSize
      const end = start + pageSize

      return {
        logs: filtered.slice(start, end),
        total: filtered.length,
        page: currentPage,
        pageSize,
        totalPages: Math.ceil(filtered.length / pageSize)
      }
    }
  })

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'create':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Crear</Badge>
      case 'update':
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Actualizar</Badge>
      case 'delete':
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Eliminar</Badge>
      case 'login':
        return <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100">Login</Badge>
      case 'export':
        return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">Exportar</Badge>
      case 'import':
        return <Badge className="bg-cyan-100 text-cyan-800 hover:bg-cyan-100">Importar</Badge>
      case 'settings':
        return <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">Config</Badge>
      default:
        return <Badge variant="secondary">{action}</Badge>
    }
  }

  const getEntityIcon = (entity: string) => {
    switch (entity) {
      case 'opportunity': return FileText
      case 'contact': return User
      case 'company': return Users
      case 'user': return User
      case 'pipeline': return Settings
      case 'reminder': return Calendar
      default: return FileText
    }
  }

  const totalPages = data?.totalPages ?? 1

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-medium">Auditoria</h2>
          <p className="text-sm text-muted-foreground">
            Historial de todas las acciones realizadas en el sistema
          </p>
        </div>
        <Button variant="outline" size="sm">
          <Download className="mr-2 h-4 w-4" />
          Exportar Logs
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Accion" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las acciones</SelectItem>
            <SelectItem value="create">Crear</SelectItem>
            <SelectItem value="update">Actualizar</SelectItem>
            <SelectItem value="delete">Eliminar</SelectItem>
            <SelectItem value="login">Login</SelectItem>
            <SelectItem value="export">Exportar</SelectItem>
            <SelectItem value="import">Importar</SelectItem>
            <SelectItem value="settings">Configuracion</SelectItem>
          </SelectContent>
        </Select>
        <Select value={entityFilter} onValueChange={setEntityFilter}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Entidad" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las entidades</SelectItem>
            <SelectItem value="opportunity">Oportunidad</SelectItem>
            <SelectItem value="contact">Contacto</SelectItem>
            <SelectItem value="company">Empresa</SelectItem>
            <SelectItem value="user">Usuario</SelectItem>
            <SelectItem value="pipeline">Pipeline</SelectItem>
            <SelectItem value="reminder">Recordatorio</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Logs List */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <>
              <div className="divide-y">
                {data?.logs.map((log) => {
                  const Icon = getEntityIcon(log.entity)
                  return (
                    <div key={log.id} className="flex items-start gap-4 p-4 hover:bg-muted/50">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={log.user.avatar} />
                        <AvatarFallback>
                          {log.user.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium">{log.user.name}</span>
                          {getActionBadge(log.action)}
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Icon className="h-3 w-3" />
                            <span className="text-sm">{log.entityName}</span>
                          </div>
                        </div>
                        {log.details && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {log.details}
                          </p>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span>{formatDate(log.createdAt)}</span>
                          {log.ip && <span>IP: {log.ip}</span>}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between border-t px-4 py-3">
                <p className="text-sm text-muted-foreground">
                  Mostrando {((currentPage - 1) * pageSize) + 1} - {Math.min(currentPage * pageSize, data?.total ?? 0)} de {data?.total ?? 0} registros
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
    </div>
  )
}
